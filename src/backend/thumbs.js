import { session, BrowserWindow, app, dialog } from "electron";
import { errorResponse } from './standard_response.js';
import { localStorage } from './localstorage.js';
import { URL } from 'node:url';
import { getProxyHandler } from "./proxy_handler.js";
import path from "node:path";
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { getWindow, watch } from "./window.js";
import { log } from "./log.js";

const userDataPath = app.getPath('userData');

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const defaultImageFile = path.join(__dirname, '../../assets/nothumbnail.png');

var defaultImage = fs.readFileSync( defaultImageFile );

let thumbsWindow;
let captureWindow;
let proxy;
const queue = [];
let state = "idle";
let pageLoaded;
let timer;

function writeCache(id, data ){
    const file = path.join( userDataPath, `${id}.png` );
    return fs.writeFileSync( file, data );
}

function getCache(id){
    const file = path.join( userDataPath, `${id}.png` );
    if (fs.existsSync(file)) {
        return fs.readFileSync( file );
    }
    return;
}

export function closeThumbs(){
    thumbsWindow.close();
    thumbsWindow = null;
    captureWindow.close();
    captureWindow = null;
}

export function clearProxyStorage(){
    const ses = session.fromPartition( 'persist:thumbs' );
    return ses.clearStorageData();
}

function handleHTTP( request ){
    if( !proxy ){
        return errorResponse();
    }
    return proxy.handleHTTP( request );
}

function nextImage(cid, rid, callback){
    if(!thumbsWindow) return;
    const collections = localStorage.collections;
    if(collections[cid] && collections[cid].recordings[rid] && collections[cid].recordings[rid].firstPage ){
        state = "loading";
        proxy = getProxyHandler( cid, rid, false );
        clearProxyStorage();
        thumbsWindow.loadURL( collections[cid].recordings[rid].firstPage );
        pageLoaded = ( image ) =>{
            writeCache(rid, image);
            callback( image );
        }
        timer = setTimeout( captureImage, 10000 );
        return;
    }
    callback(defaultImage);
    return;
}

function generateThumbnail( cid, rid ){
    return new Promise( resolve =>{
        const cache = getCache( rid );
        if(cache){
            resolve( cache );
            return;
        }

        if( state == "idle" ){
            nextImage( cid, rid, resolve )
        }
        queue.push( {cid, rid, callback: resolve } );
    });
}

function captureImage(){
    if(!thumbsWindow) return;
    thumbsWindow.webContents.capturePage().then( image => {
        if( timer ) clearTimeout( timer );

        if( pageLoaded ) pageLoaded( image.toPNG() );
        if( thumbsWindow ) thumbsWindow.loadURL( "about:blank" );
        pageLoaded = null;
        state = "idle";
        if(queue.length>0){
            let nextPage = queue.shift();
            nextImage( nextPage.cid, nextPage.rid, nextPage.callback );
        }
    });
}

function captureFullPage( params ){
    return new Promise( resolve =>{
        proxy = getProxyHandler( params.cid, params.rid, false );
        captureWindow.loadURL( params.url );
        const capturePage = async ()=>{
            captureWindow.webContents.off( 'did-finish-load', capturePage );
            captureWindow.webContents.executeJavaScript(`
                [...document.querySelectorAll("*")].forEach( el=>{
                    const comp = getComputedStyle(el);
                    el.style.padding = comp.getPropertyValue("padding");
                    el.style.margin = comp.getPropertyValue("margin");
                    el.style.fontSize = comp.getPropertyValue("font-size");
                    el.style.maxHeight = comp.getPropertyValue("height");
                    el.style.maxWidth = comp.getPropertyValue("width");
                })
            `)
            setTimeout(()=>{
                captureWindow.capturePage().then( async ( image ) => {
                    await captureWindow.setSize( 1280, 10 );
                    captureWindow.loadURL( "about:blank" );
                    resolve( image );
                }); 
            },2000);
        }
        captureWindow.webContents.on( 'did-finish-load', capturePage );
    })
}
function saveFullPage( params ){
    const options = {
        title: 'Save Collection as Image', 
        defaultPath: app.getPath('downloads') + '/' + encodeURIComponent(params.url) + '.png', 
        buttonLabel: 'Save', 
        filters: [
            { name: 'png', extensions: ['png'] }, 
            { name: 'All Files', extensions: ['*'] }
        ]
    };

    dialog.showSaveDialog( getWindow() , options ).then(async result => {
        if (!result.canceled) {
            let image = await captureFullPage( params );
            fs.writeFileSync(result.filePath, image.toPNG() );
        }
    }).catch(err => {
        log( err );
    });
}
watch( "saveFullPage", saveFullPage );

export function setupThumbs(){
    thumbsWindow = new BrowserWindow({
        width: 1280,
        height: 768,
        show: false,
        webPreferences: {
            partition: 'persist:thumbs',
            offscreen: true
        }
    });    

    captureWindow = new BrowserWindow({
        width: 1280,
        height: 768,
        show: false,
        webPreferences: {
            partition: 'persist:thumbs',
            enablePreferredSizeMode: true,
            offscreen: true
        }
    });  

    captureWindow.webContents.on( 'preferred-size-changed', ( event , preferredSize ) => {
        captureWindow.setSize( 1280, preferredSize.height );
    });

    thumbsWindow.webContents.on( 'did-finish-load', () => {
        setTimeout(()=>{
            captureImage();
        },100)
    });

    const ses = session.fromPartition( 'persist:thumbs' );
    ses.protocol.handle( 'https', handleHTTP );
    ses.protocol.handle( 'http', handleHTTP );
    ses.on('will-download', ( event ) => {
        event.preventDefault()
    })

    session.defaultSession.protocol.handle( 'thumbs', async ( request )=>{
        let loc = new URL( request.url );
        let cid = loc.hostname;
        let rid = loc.pathname.substring(1);
        let image = await generateThumbnail(cid,rid);
        return new Response( image, {
            headers: {
                "content-type": "image/png"
            },
            status: 200
        });
    } );
}