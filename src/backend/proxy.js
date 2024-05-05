import { session } from 'electron';
import { errorResponse } from './standard_response.js';
import { getProxyHandler } from './proxy_handler.js';
import path from 'node:path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { Request } from 'node-fetch';

let proxy = null;

export async function setProxy( cid, rid, record ){
    await clearProxyStorage();
    proxy = getProxyHandler( cid, rid, record );
}

export async function clearProxy(){
    proxy = null;
}

function handleHTTP( request ){
    if( !proxy ){
        return errorResponse();
    }
    return proxy.handleHTTP( request );
}

export async function getResourceBuffer( url ){
    if( !proxy ){
        return false;
    }
    const result = await proxy.handleHTTP( new Request( url ) );

    const chunks = [];
    for await ( const value of result.body ) {
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

export function clearProxyStorage(){
    const ses = session.fromPartition( 'persist:browse' );
    return ses.clearStorageData();
}

function handleAsset( request ){
    const __filename = fileURLToPath( import.meta.url );
    const __dirname = path.dirname( __filename );

    let loc = new URL( request.url );
    let image = path.join(__dirname, '../../assets/' + loc.hostname );

    return new Response( fs.readFileSync( image ) );
}



export function registerProxy(){
    const ses = session.fromPartition( 'persist:browse' );
    ses.protocol.handle( 'https', handleHTTP );
    ses.protocol.handle( 'http', handleHTTP );
    ses.protocol.handle( 'asset', handleAsset );
    ses.on('will-download', ( event ) => {
        event.preventDefault()
    })
}

