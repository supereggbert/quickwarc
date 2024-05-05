import { encodeHTTPResponseBase64, encodeHTTPRequestBase64 } from "./http_encode.js";
import { app, dialog } from 'electron';
import { getWindow, send, watch } from "./window.js";
import { DB } from "../common/db.js";
import path from 'node:path';
import fs from 'node:fs';
import { DateYmdhis } from "../common/formating.js";
import { log } from "./log.js";


function exportWarcHeader( file, id, date, partof, meta ){

    const payload = Buffer.from( [
        'software: QuickWARC v1.0',
        'format: WARC File Format 1.0',
        'creator: quickwarc',
        `isPartOf: ${ partof }`,
        `json-metadata: ${ JSON.stringify( meta ) }`,
        '',
    ].join( "\r\n" ) );

    const header = Buffer.from( [
        'WARC/1.0',
        'WARC-Type: warcinfo',
        `WARC-Record-ID: <urn:uuid:${ id }>`,
        `WARC-Filename: ${ file }`,
        `WARC-Date: ${ new Date( date ).toISOString() }`,
        'Content-Type: application/warc-fields',
        `Content-Length: ${ payload.length }`,
        '',
        ''
    ].join( "\r\n" ) );

    return Buffer.concat( [ header, payload ] );
}

function getWARCResponse( response, infoid ){

    let payload = encodeHTTPResponseBase64( JSON.parse( response.headers ), response.status, response.statusmessage, response.body );

    const header = Buffer.from( [
    'WARC/1.0',
    'WARC-Type: response',
    `WARC-Record-ID: <urn:uuid:${ response.uid }>`,
    `WARC-Target-URI: ${ response.url }`,
    `WARC-Date: ${ new Date( response.date ).toISOString() }`,
    `WARC-Warcinfo-ID: <urn:uuid:${ infoid }>`,
    `WARC-Concurrent-To: <urn:uuid:${ response.for }>`,
    'Content-Type: application/http; msgtype=response',
    `Content-Length: ${ payload.length }`,
    '',
    ''
    ].join( "\r\n" ) );

    return Buffer.concat( [ header, payload ] );
}

function getWARCRequest( request, infoid ){

    let payload = encodeHTTPRequestBase64( request.url, request.method, JSON.parse( request.headers ), request.body );

    const header = Buffer.from( [
    'WARC/1.0',
    'WARC-Type: request',
    `WARC-Record-ID: <urn:uuid:${ request.uid }>`,
    `WARC-Target-URI: ${ request.url }`,
    `WARC-Date: ${ new Date( request.date ).toISOString() }`,
    `WARC-Warcinfo-ID: <urn:uuid:${ infoid }>`,
    `WARC-Concurrent-To: <urn:uuid:${ request.for }>`,
    'Content-Type: application/http; msgtype=request',
    `Content-Length: ${ payload.length }`,
    '',
    ''
    ].join( "\r\n" ) );

    return Buffer.concat( [ header, payload ] );
}

const divider = Buffer.from("\r\n\r\n");

async function exportWarc( collection, file ){

    let rCount = 1;
    const rTotal = Object.values( collection.recordings ).length;

    const progress = {
        on: rCount,
        of: rTotal,
        done: 0
    }
    send( "exportingWarc",  progress );

    const stream = fs.createWriteStream( file );

    let filename = path.basename(file);

    const collectionMeta = {
        "type": "collection",
        "title": collection.name,
        "desc": collection.description,
        "public": false,
        "public_index": true,
        "created_at": collection.created,
        "updated_at": collection.created,
        "list":[]
    };

    const mainInfo = exportWarcHeader( filename, collection.id, collection.created, "collection", collectionMeta );
    stream.write( mainInfo );
    stream.write( divider );

    for(let id in collection.recordings){
        const recording = collection.recordings[ id ];
        const date = new Date( collection.created ).toISOString();

        const db = new DB( recording.id );
        let docs = await db.find( {}, { body: 0 }, { date: 1 } );

        const pages = docs.map( doc =>{
            if( doc.contentType === "text/html" && doc.title !== "No title" ){
                return { url: doc.url, timestamp: DateYmdhis(new Date(doc.date)), id: doc.uid, title: doc.title };
            }   
        } ).filter( page => page);

        let title = "Session from " + date;
        if( recording.title ) title = recording.title;
        
        const recordingMeta = {
            "type": "recording",
            "title": title,
            "desc": "",
            "created_at": date,
            "updated_at": date,
            "recorded_at": date,
            "auto_title": true,
            "pages": pages
        };

        const recordingInfo = exportWarcHeader( filename, recording.id, recording.created, "collection/"+id, recordingMeta );
        stream.write( recordingInfo );
        stream.write( divider );

        for( let i = 0; i<docs.length; i++ ){
            const doc = docs[ i ];
            switch( doc.type ){
                case "REQUEST":
                    const requestDoc = await db.findOne( { uid: doc.uid } );
                    const request = getWARCRequest( requestDoc, recording.id );
                    stream.write( request );
                    stream.write( divider );
                    break;
                case "RESPONSE":
                    const responseDoc = await db.findOne( { uid: doc.uid } );
                    const response = getWARCResponse( responseDoc, recording.id );
                    stream.write( response );
                    stream.write( divider );
                    break;
            }
            const progress = {
                on: rCount,
                of: rTotal,
                done: i / ( docs.length - 1 ) * 100
            }
            send( "exportingWarc",  progress )
        }
        rCount++;
    }

    stream.end(() => {
        log('Finished writing to file');
    });
}

function saveWarc( collection ){
    const options = {
        title: 'Save Collection as Warc', 
        defaultPath: app.getPath('downloads') + '/' + collection.name + '.warc', 
        buttonLabel: 'Save', 
        filters: [
            { name: 'Warc', extensions: ['warc'] }, 
            { name: 'All Files', extensions: ['*'] }
        ]
    };

    dialog.showSaveDialog( getWindow() , options ).then(result => {
        if (!result.canceled) {
            exportWarc( collection, result.filePath );
        }
    }).catch(err => {
        log( err );
    });
}

watch( "saveWarc", saveWarc );
