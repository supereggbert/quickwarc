import { session } from "electron";
import { notFoundResponse } from './standard_response.js';
import { URL } from 'node:url';
import { DB } from "../common/db.js";

async function downloadResponse( rid, uid, filename ){

    let db = new DB( rid );

    let res = await db.findOne({ uid: uid, type: 'RESPONSE' });

    if(!res){
        return notFoundResponse();
    }
    let body = Buffer.from(res.body, 'base64');

    if( res.status == 204 ){
        body = null;
    }

    const header = JSON.parse(res.headers);
    header["content-description"] = "File Transfer";
    header["content-type"] = "application/octet-stream";
    header["content-disposition"] = `attachment; filename="${ filename }"`;
    header["content-transfer-encoding"] = "binary";

    return new Response( body, {
        headers: header,
        status: res.status,
        statusMessage: res.statusMessage
    });
}

export function setupDownloads(){
    session.defaultSession.protocol.handle( 'download', async ( request )=>{
        const loc = new URL( request.url );
        const rid = loc.hostname;
        const parts = loc.pathname.split("/");
        const uid = parts[1];
        const filename = parts[2] ? parts[2] : "download";
        

        return downloadResponse( rid, uid, filename );
    } );
}