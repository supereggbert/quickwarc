import { __ } from "../frontend/lang.js";


export async function notFoundResponse(){
    return new Response(Buffer.from(`<!doctype html>
    <html>
    <head>
    <title>Not Found</title>
    <style>
        body{ 
            height: 100vh; 
            display: grid; 
            align-items: center; 
            justify-content: center;
            background-color: #eee;
            margin: 0;
        }
        div{
            max-width: 500px;
            text-align: center;
            img{
                width: 60%;
            }
        }
        a{
            background-color: #000;
            color: #fff;
            display: inline-block;
            padding: 7px 20px;
            text-decoration: none;
        }
        a:hover{
            background-color: #333;
        }
    </style>
    </head>
    <body style='font-family: Arial, Helvetica, sans-serif;'>
    <div>
    <img src="asset://nothingtosee.png">
    <h1>${__('notFound')}</h1>
    <p>${__('pageNotInArchive')}</p>
    <a href="javascript:history.back()">${__('back')}</a>
    </div>
    </body></html>`), {
        status: 404,
        statusMessage: "Not Found in Archive"
    });
}
export function errorResponse(){
    return new Response(Buffer.from(`<!doctype html>
    <html>
    <head>
    <title>Server Error</title>
    <style>
        body{ 
            height: 100vh; 
            display: grid; 
            align-items: center; 
            justify-content: center;
            background-color: #eee;
            margin: 0;
        }
        div{
            max-width: 500px;
            text-align: center;
            img{
                width: 60%;
            }
        }
    </style>
    </head>
    <body style='font-family: Arial, Helvetica, sans-serif;'>
    <div>
    <img src="asset://nothingtosee.png">
    <h1>${__('proxyError')}</h1>
    <p>${__('unexpectedError')}</p>
    </div>
    </body></html>`), {
        status: 500,
        statusMessage: "Server Error"
    });
}