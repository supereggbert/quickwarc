import zlib from 'node:zlib';
import { log } from './log.js';

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

function unchunkHTTPBody(chunkedBuffer) {
    let result = Buffer.alloc(0);
    let offset = 0; 

    while ( offset < chunkedBuffer.length ) {
        let sizeEnd = chunkedBuffer.indexOf( '\r\n', offset, 'utf-8' );
        if (sizeEnd === -1) {
            throw new Error( 'Invalid chunked body: No size terminator found' );
        }

        let sizeLine = chunkedBuffer.toString( 'utf-8', offset, sizeEnd );
        let chunkSize = parseInt( sizeLine, 16 );
        if( isNaN( chunkSize ) ){
            throw new Error( 'Invalid chunked length: Not a number' );
        }
        if (chunkSize === 0) {
            break;
        }

        let dataStart = sizeEnd + 2; 
        let dataEnd = dataStart + chunkSize;

        if ( dataEnd > chunkedBuffer.length ) {
            throw new Error( 'Invalid chunked body: Chunk size exceeds buffer length' );
        }

        let chunkData = chunkedBuffer.slice( dataStart, dataEnd );
        result = Buffer.concat( [ result, chunkData ] );

        offset = dataEnd + 2;
    }

    return result;
}

export function parseHTTPResponse( response ){
    const result = {};
    const start = response.indexOf("\r\n");
    const end = response.indexOf("\r\n\r\n");
    const httpresponse = response.slice(0, start).toString().split(" ");
    result.status = httpresponse[1];
    result.statusText = httpresponse[2];
    result.headers = parseHeaders( response.slice(start, end).toString() );
    let length = response.length - end - 4;
    if( result.headers[ "content-length" ] ){
        length = parseInt( result.headers[ "content-length" ] );
    }
    result.body = response.slice(end+4,length+end+4);
    if( result.headers ["transfer-encoding" ] == "chunked" ){
        try{
            const resultbody = unchunkHTTPBody(result.body);
            result.body = resultbody;
        }catch(e){
            log("Error parsing chuncked encoding, assuming not chuncked")
        }
    }
    if( result.headers ["content-encoding" ] == "gzip" ){
        try{
            const resultbody = zlib.gunzipSync( result.body );
            result.body = resultbody;
        }catch(e){
            log("Error parsing gziped content, assuming not gzipped")
        }
    }
    if( result.headers ["content-encoding" ] == "deflate" ){
        try{
            const resultbody = zlib.inflateSync( result.body );
            result.body = resultbody;
        }catch(e){
            log("Error parsing deflated content, assuming not deflated")
        }
    }
    if( result.headers ["content-encoding" ] == "br" ){
        try{
            const resultbody = zlib.brotliDecompressSync( result.body );
            result.body = resultbody;
        }catch(e){
            log("Error parse br content, assuming not compressed")
        }
    }

    return result;
}

export function parseHTTPRequest( request ){
    const result = {};
    const start = request.indexOf("\r\n");
    const end = request.indexOf("\r\n\r\n");
    const httpresponse = request.slice(0, start).toString().split(" ");
    result.method = httpresponse[0];
    result.url = httpresponse[1];
    result.headers = parseHeaders( request.slice(start, end).toString() );
    result.body = Buffer.from('');
    if(result.headers["content-length"]){
        result.body = request.slice(end+4,parseInt(result.headers["content-length"])+end+4)
    }
    return result;
}




