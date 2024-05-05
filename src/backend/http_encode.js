
import { URL } from 'node:url';

export function encodeHTTPResponseBase64( headers, status, statusMessage, contentBase64 ){
    const content = Buffer.from( contentBase64, 'base64' );
    const contentLength = content.length;

    const outputHeaders = {
        ...headers
    };

    if( contentLength !== 0 ){
        outputHeaders[ 'content-length' ] = contentLength;
    }
    if( outputHeaders['content-encoding'] ){
        outputHeaders['x-orig-content-encoding'] = outputHeaders['content-encoding'];
        delete( outputHeaders['content-encoding'] );
    }    
    if( outputHeaders['transfer-encoding'] ){
        outputHeaders['x-orig-transfer-encoding'] = outputHeaders['transfer-encoding'];
        delete( outputHeaders['transfer-encoding'] );
    }    
    
    
    delete( outputHeaders['accept-ranges'] ) ;

    const out = [ [ 'HTTP/1.1', status, statusMessage ].join(" ") ];
    for(let key in outputHeaders){
        out.push([ key,outputHeaders[ key ]] .join(": "));
    }

    out.push( '' );

    if( contentLength !== 0 ){
        out.push( '' );
        return Buffer.concat( [ Buffer.from( out.join("\r\n") ), content ] );
    }
    
    return Buffer.from( out.join("\r\n") );
}

export function encodeHTTPRequestBase64( url, method, headers, contentBase64 ){
    
    const loc = new URL( url );
    
    const content = Buffer.from( contentBase64, 'base64' );
    const contentLength = content.length;

    const outputHeaders = {
        ...headers, 
        'host': loc.hostname
    };

    delete( outputHeaders['content-encoding'] );
    delete( outputHeaders['accept-ranges'] ) ;

    if( contentLength !== 0 ){
        outputHeaders[ 'content-length' ] = contentLength;
    }
    
    const out = [ [ method, loc.pathname + loc.search, 'HTTP/1.1' ].join(" ") ];
    for(let key in outputHeaders){
        out.push([ key,outputHeaders[ key ]] .join(": "));
    }

    out.push( '' );

    if( contentLength !== 0 ){
        out.push( '' );
        return Buffer.concat( [ Buffer.from( out.join("\r\n") ), content ] );
    }
    
    return Buffer.from( out.join("\r\n") );
}