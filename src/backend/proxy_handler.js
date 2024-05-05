import { generateUUID } from '../common/uuid.js';
import { DB } from '../common/db.js';
import { localStorage } from './localstorage.js';
import { sendCollectionList } from './collections.js';
import { send } from './window.js';
import { errorResponse, notFoundResponse } from './standard_response.js';
import { decodeEntities, extractTitle } from '../common/formating.js';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

const Cache = {};

function casedHeader(key){
    let result = key.replace(/(^.)|(-(.))/g,(a,b)=>a.toUpperCase());
    return result;
}

function fetch( url, headers, method, body ){
    return new Promise( ( resolve, reject ) =>{
        let location = new URL(url);

        let casedHeaders = {};
    
        for( let key in headers ){
            casedHeaders[ casedHeader(key) ] = headers[ key ];
        }
        
        if( !casedHeaders[ "Accept-Encoding" ] ) casedHeaders [ "Accept-Encoding" ]='gzip, deflate, br';

        const options = {
            hostname: location.hostname,
            port: location.port,
            path: location.pathname + location.search,
            method: method,
            headers: casedHeaders
        };
        
        let proto = http;
        if( location.protocol == "https:" ) proto = https;
        
        const req = proto.request(options, async (res) => {
            res.body = res;
            res.statusText = res.statusMessage;
            res.status = res.statusCode;
            resolve(res);
        });

        req.on("error", err => reject(err) );
        
        if( body ) req.write( body );
        req.end();
    })
}

export function getProxyHandler( cid, rid, record ){
    const cacheIdx = cid + rid + record;
    if( !Cache[ cacheIdx ] ){
        Cache[ cacheIdx ] = new ProxyHandler( cid, rid, record );
    }
    return Cache[ cacheIdx ];
}

async function HTTPStreamToBase64( stream, headers = {} ) {
    if( !stream ) return [ null, "" ] ;
    const chunks = [];
    for await ( const value of stream ) {
        chunks.push(value);
    }
    let body = Buffer.concat(chunks);
    if( headers ["content-encoding" ] == "gzip" ){
        body = zlib.gunzipSync( body );
    }
    if( headers ["content-encoding" ] == "deflate" ){
        body = zlib.inflateSync( body );
    }
    if( headers ["content-encoding" ] == "br" ){
        body = zlib.brotliDecompressSync( body );
    }

    return [ body, body.toString('base64') ];
}

function ProxyHandler( cid, rid, record = false ){

    let db = new DB( rid );
    let recording = record;
    const pending = {};
    
    async function preCaptured( res ){    
        if(!res){
            return notFoundResponse();
        }
        let body = Buffer.from(res.body, 'base64');
        if( res.status == 204 || res.status == 304){
            body = null;
        }
        return new Response( body, {
            headers: JSON.parse(res.headers),
            status: res.status,
            statusMessage: res.statusMessage
        });
    }
    
    async function newCapture( requesturl, request, query, reqHeaders, reqBody){
        const request_uid = generateUUID();
        const reponse_uid = generateUUID();

        const pid = Buffer.concat([
            Buffer.from(requesturl), 
            Buffer.from(JSON.stringify(reqHeaders)), 
            reqBody || Buffer.from('')
        ]).toString();

        if(pending[ pid ]){
            return new Promise( resolve =>{
                pending[ pid ].push( resolve );
            });
        }
        pending[ pid ] = [];
    
        let res;
        let reqDate = +new Date;
        
        try{
            res = await fetch( requesturl, reqHeaders, request.method, reqBody );
        }catch( e ){
            return errorResponse();
        }
    
        let [ resBody, resBodyBase64 ]  = await HTTPStreamToBase64( res.body, res.headers );

        let resHeaders = res.headers;
    
        const contentType = resHeaders['content-type'] ? resHeaders['content-type'].split(";")[0].trim() : 'none';
    
        delete( resHeaders['etag'] );

        const responseRecord = { 
            type: 'RESPONSE', 
            contentType: contentType,
            headers: JSON.stringify(resHeaders), 
            status: res.status, 
            statusMessage: res.statusText,
            url: requesturl, 
            body: resBodyBase64, 
            size: resBody ? resBody.length : 0,
            date: +new Date,
            uid: reponse_uid, 
            for: request_uid,
        };
    
        if(contentType=="text/html"){
            responseRecord[ "title" ] = extractTitle( resBody.toString() );
        }
    
        db.insert( { ...query, uid: request_uid, for: reponse_uid, date: reqDate } );
        db.insert( responseRecord );
    
        const rec = localStorage.collections[ cid ].recordings[ rid ];
        rec.size += resBody ? resBody.length : 0;
        rec.resources += 1;
        if( !rec.firstPage && res.status == 200 ){
            rec.firstPage = requesturl;
            if( rec.title == "No title" && responseRecord[ "title" ] ){
                rec.title = responseRecord[ "title" ];
            }else{
                const pathname = requesturl.split("?")[0]
                rec.title = pathname.substring( pathname.lastIndexOf('/') + 1 );
            }
            if( rec.title == ""  && res.status == 200 ){
                rec.title = "No title";
            }
        }
        if(contentType=="text/html") rec.pages += 1;
        localStorage.save();
        sendCollectionList();
        send( "stats", { resources: rec.resources, pages: rec.pages, size: rec.size } );
        
        if( resBody == '' ){
            resBody = null;
        }
        pending[ pid ].forEach( resolve =>{
            resolve( new Response( resBody, {
                headers: resHeaders,
                status: res.status
            }) );
        });
        delete( pending[ pid ] );
    
        return new Response( resBody, {
            headers: resHeaders,
            status: res.status
        });
    }
    
    async function handleHTTP(request){   
        if(!db) return notFound();

        const requesturl = request.url.split("#")[0];

        let [ reqBody, reqBodyBase64 ]  = await HTTPStreamToBase64( request.body );
    
        let reqHeaders = {};
        request.headers.forEach( (value, key) => reqHeaders[key] = value );
    
        const method = request.method.toString();
    
        const rec = { 
            type: 'REQUEST', 
            headers: JSON.stringify(reqHeaders), 
            method: request.method.toString(), 
            url: requesturl, 
            body: reqBodyBase64 
        };
        
        const query = { ...rec };
    
        let document = await db.findOne(query);
    
        if(!db) return notFound();
        
        // Fall back ignore headers
        if(!recording){
            if( !document && method == "GET" ){
                delete( query.headers );
                document = await db.oldest(query);
            }
        }
        let fromDate;

        if(document){
            fromDate = document.date;
            document = await db.oldest( { 
                type: 'RESPONSE', 
                uid: document.for,
                url: requesturl
            })
        }
        
        // Final fallback, just find a response from the url
        if(!recording){
            if( !document ){
                document = await db.oldest( { 
                    type: 'RESPONSE', 
                    url: requesturl
                }, fromDate );
            }
        }
        
        if( document ){
            return preCaptured( document );
        }
    
        if( !recording ){
            return notFoundResponse();
        }
    
        return newCapture( requesturl, request, rec, reqHeaders, reqBody );
            
    }

    this.handleHTTP = handleHTTP;

}
