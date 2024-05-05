import fs from 'node:fs';
import { generateUUID } from '../common/uuid.js';
import { parseHTTPRequest, parseHTTPResponse } from './http_parser.js';
import { extractTitle } from '../common/formating.js';
import { DB } from '../common/db.js';
import { getWindow, send, watch } from "./window.js";
import { sendCollectionList } from './collections.js';
import { localStorage } from './localstorage.js';
import { URL } from 'node:url';
import { gunzipToFile } from './gzip.js';
import { app, dialog } from 'electron';
import { log } from './log.js';
import { __ } from '../frontend/lang.js';

async function importWarc( filePath ){

    let filepointer = 0;

    function readFile( length ){
        return new Promise( ( resolve, reject ) => {
            fs.open(filePath, 'r', ( err, fd ) => {
                if (err) {
                    reject( err );
                    log( err );
                    return;
                }
                const buffer = Buffer.alloc( length ); 

                fs.read( fd, buffer, 0, buffer.length, filepointer, ( err, num ) => {
                    if (err) {
                        reject(err);
                        log( err );
                        return;
                    }
                
                    resolve( buffer.slice(0, num) );

                    fs.close( fd, err => {
                        if ( err ){
                            reject( err );
                            log( err );
                        }
                    });
                });
            });
        })
        
    }

    function parseHeaders( headers ){
        const headerlines = headers.split(/\n(?=\S)/g);
        const outputHeaders = {};
        headerlines.forEach( headerline =>{
            const divider = headerline.indexOf(":");
            const key = headerline.substr( 0, divider ).toLowerCase().trim();
            const value = headerline.substr( divider + 1 ).trim();
            if( key ){
                outputHeaders[ key ]  = value;
            }
        })
        return outputHeaders;
    }

    function getNextHeader(){
        return new Promise( async resolve =>{
            const buffer = await readFile( 1024 * 4 );
            let end = -1;
            for(let i=4; i < buffer.length ; i++){
                if( buffer[i-3]==13 && buffer[i-2]==10 && buffer[i-1]==13 && buffer[i]==10 ){
                    filepointer += i + 1;
                    end = i - 3;
                    break;
                }
            }
            if(end>0){
                const headerString = buffer.slice(0, end).toString();
                resolve( parseHeaders( headerString ) );
            }
            resolve( false );
        })
    }

    async function readBody( size ){
        const buffer = await readFile( size );
        filepointer += size;
        return buffer;
    }

    function readWarcInfo( header, body ){
        let title = "Imported WARC";
        let description = "";
        let uuid = header['warc-record-id'].replace("urn:uuid:", "").replace(/[<>]/g, "");
        const warcinfo = parseHeaders( body.toString() );
        
        if(warcinfo[ "description" ]){
            title = warcinfo[ "description" ];
        }
        if( warcinfo[ "json-metadata" ] ){
            warcinfo[ "json-metadata" ] = JSON.parse( warcinfo["json-metadata"] );
            if(warcinfo[ "json-metadata" ].title){
                title = warcinfo[ "json-metadata" ].title;
            }
            if(warcinfo[ "json-metadata" ].desc){
                description = warcinfo[ "json-metadata" ].desc;
            }
        }
        
        if( !collection.id ){
            collection.id = generateUUID();
            collection.oid = uuid;
            collection.name = title;
            collection.description = description;
            collection.created = +new Date( header[ "warc-date" ] );
            return;
        }
        const uid = generateUUID();
        currentRecording = {
            title: title,
            id: uid,
            created: +new Date( header[ "warc-date" ] ),
            size: 0,
            pages: 0,
            resources: 0,
        }
        collection.recordings[ uid ] = currentRecording;
    }

    function readWarcRequest( header, url, body ){
        const date = +new Date( header[ "warc-date" ] );

        if(!collection.id) defaultCollection( date );
        if(!currentRecording) defaultRecording( date );

        if(header['content-type'].indexOf("application/http")==-1) return;
        const uuid = header['warc-record-id'].replace("urn:uuid:", "").replace(/[<>]/g, "");
        let forid = false;
        if(header['warc-concurrent-to']) forid = header['warc-concurrent-to'].replace("urn:uuid:", "").replace(/[<>]/g, "");
        const req = parseHTTPRequest( body );
        const insert = {
            type: 'REQUEST', 
            headers: JSON.stringify(req.headers), 
            method: req.method, 
            url: url, 
            body: req.body?req.body.toString("base64"):'',
            uid: uuid,
            date: date
        }
        if( forid && forid != uuid ){
            insert.for = forid;
        }
        
        let db = new DB( currentRecording.id );
        db.insert( insert );
    }
    
    function readWarcResponse( header, url, body ){
        const date = +new Date( header[ "warc-date" ] );

        if(!collection.id) defaultCollection( date );
        if(!currentRecording) defaultRecording( date );

        if(header['content-type'].indexOf("application/http")==-1) return;

        const uuid = header['warc-record-id'].replace("urn:uuid:", "").replace(/[<>]/g, "");
        let forid = false;
        if(header['warc-concurrent-to']) forid = header['warc-concurrent-to'].replace("urn:uuid:", "").replace(/[<>]/g, "");
        const res = parseHTTPResponse( body );

        const contentType = res.headers['content-type'] ? res.headers['content-type'].split(";")[0].trim() : 'none';

        const insert = {
            type: 'RESPONSE', 
            contentType,
            headers: JSON.stringify(res.headers), 
            status: parseInt(res.status), 
            statusmessage: res.statusText,
            url: url, 
            body: res.body?res.body.toString("base64"):'',
            uid: uuid,
            date: date,
            size: res.body.length
        }
        if( forid && forid != uuid ){
            insert.for = forid;
        }
        currentRecording.size += res.body.length;
        
        currentRecording.resources += 1;
        if(contentType=="text/html"){
            currentRecording.pages += 1;
            const title = extractTitle( res.body.toString() );

            if(!currentRecording.firstPage){
                currentRecording.firstPage = url;
            }
            if( currentRecording.title=="No title" && title ){
                currentRecording.title = title;
                currentRecording.firstPage = url;
            }

            if(title){
                insert[ "title" ] = title;
            }
            
        }
        let db = new DB( currentRecording.id );
        db.insert( insert );
    }

    function defaultCollection( date ){
        collection.id = generateUUID();
        collection.name = "Imported WARC";
        collection.description = "";
        collection.created = +new Date( header[ "warc-date" ] );
    }

    function defaultRecording( date ){
        const uid = generateUUID();
        currentRecording = {
            title: "No title",
            id: uid,
            created: date,
            size: 0,
            pages: 0,
            resources: 0,
        }
        collection.recordings[ uid ] = currentRecording;
    }

    const collection = {
        name: '', 
        description: '',
        recordings: {}
    }
    let currentRecording = null;

    let fileID = await readFile( 8 );
    if( fileID[0]==31 && fileID[1]==139 ){
        send("importingWarc",{ status: __('unzippingWarc'), done: 0 });
        filePath = await gunzipToFile( filePath );
        fileID = await readFile( 8 );
    }

    
    const stats = fs.statSync( filePath );
    const warcSize = stats.size;

    let version = fileID.toString();

    if( version != "WARC/1.0" && version != "WARC/1.1"){
        console.log("Unsupported File");
        return;
    }

    let header;
    while( header = await getNextHeader() ){
        if(!header['warc-type']) continue;
        let body = await readBody( parseInt( header['content-length'] ) );
        if( header['warc-type'] == "warcinfo" ){
            readWarcInfo( header, body );
        }

        if(!header[ "warc-target-uri" ]) continue;
        if(header[ "warc-target-uri" ][0]=="<") header[ "warc-target-uri" ]=header[ "warc-target-uri" ].substring(1,header[ "warc-target-uri" ].length-1);

        const url = new URL(header[ "warc-target-uri" ]).toString();

        if( header['warc-type'] == "request" ){
            readWarcRequest( header, url, body );
        }

        if( header['warc-type'] == "response" ){
            readWarcResponse( header, url, body  );
        }
        send("importingWarc",{ status: __('importingRecords'), done: filepointer/warcSize*100 });
    }

    send("importingWarc",{ status: __('importComplete'), done: 100 });

    if(currentRecording){
        Object.values( collection.recordings ).forEach( el=>{
            if(el.resources == 0){
                delete( collection.recordings[el.id] );
            }
        });

        localStorage.collections[ collection.id ] = collection;
        localStorage.save();
        sendCollectionList();
        return;
    }
    log("Something went wrong with the warc import");
}

watch("importWarc",()=>{

    const options = {
        title: 'Import Warc', 
        defaultPath: app.getPath('documents'), 
        buttonLabel: 'Import', 
        filters: [
            { name: 'Warc', extensions: ['warc'] }, 
            { name: 'Warc.gz', extensions: ['warc.gz'] }, 
            { name: 'All Files', extensions: ['*'] }
        ]
    };

    dialog.showOpenDialog( getWindow() , options ).then(result => {
        importWarc( result.filePaths[0] );
    }).catch(err => {
        log( err );
    });
})




