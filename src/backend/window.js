import { BrowserWindow, screen, app } from 'electron';
import path from 'node:path';
import { ipcMain } from 'electron'
import { clearProxy } from './proxy.js';
import { closeThumbs } from './thumbs.js';

let mainWindow = null;

watch( "log", ( value ) => {
    console.log( value );
} )

watch( "linkList", list => {
    send( "linkList", list );
} );

watch( "mode", mode => {
    send( "mode", mode );
    send( "stats", { resources: 0, pages: 0, size: 0 } );
    if( mode == "collections"){
        clearProxy();
    }
} );

watch( "toggleMaximize", ()=>{
    if ( mainWindow ) {
        if( mainWindow.isMaximized() ) {
            mainWindow.unmaximize();
            send( "maximized", false );
        } else {
            mainWindow.maximize();
            send( "maximized", true );
        }
    }
});

watch( "minimize", ()=>{
    if ( mainWindow ) {
        mainWindow.minimize();
    }
});

export function getWindow(){
    return mainWindow;
}

export function createWindow( __dirname ){
    let { width, height } = screen.getPrimaryDisplay().workAreaSize;

    height = Math.min(height, 1024);
    width = Math.min(width, 1920);

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        icon: path.join(__dirname, 'assets/icon.ico'),
        frame: process.env.debug?true:false,
        webPreferences: {
            preload: path.join(__dirname, 'src/frontend/preload_app.js'),
            webviewTag: true
        }
    });
    
    send("version",app.getVersion());

    mainWindow.on('close', ()=>{
        closeThumbs();
    })
    
    mainWindow.loadFile('src/index.html')
}

export function watch( channel, callback ){
    ipcMain.on(channel, (event, message) => {
        callback(message); 
    });
}

export function send( channel, message ){
    if(mainWindow){
        mainWindow.webContents.send( channel, message );
    }
}

watch("close",()=>{
    mainWindow.close();
})

