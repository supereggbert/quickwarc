import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { registerProxy } from './src/backend/proxy.js'
import { createWindow, watch, send } from './src/backend/window.js'
import './src/backend/collections.js';
import './src/backend/warc_encode.js';
import './src/backend/warc_decode.js';
import './src/backend/context_menu.js';
import { setupThumbs } from './src/backend/thumbs.js';
import { initLocalStore } from './src/backend/localstorage.js'
import { setupDownloads } from './src/backend/downloads.js';
import contextMenu from 'electron-context-menu';

app.commandLine.appendSwitch ("disable-http-cache");

contextMenu({
    showSelectAll: false,
    showCopyImage: false,
    showSelectAll: false,
    showSearchWithGoogle: false,
    showInspectElement: false
})

initLocalStore().then( () => {
    const __filename = fileURLToPath( import.meta.url );
    const __dirname = path.dirname( __filename );
    
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
    
    app.whenReady().then(() => {
        setupThumbs();
        createWindow( __dirname );
        registerProxy();
        setupDownloads();
    
        app.on( 'activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        } )
    } );
} )
