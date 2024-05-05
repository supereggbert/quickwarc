
import contextMenu from 'electron-context-menu';
import { app, dialog, ipcMain } from 'electron'
import { getResourceBuffer } from './proxy.js';
import { log } from './log.js';
import { getWindow } from './window.js';
import fs from 'node:fs';

async function SaveFile( url ){
    const buffer = await getResourceBuffer( url );
    const location = new URL( url );
    const pathparts = location.pathname.split("/");
    const filename = pathparts[ pathparts.length-1 ];
    const options = {
        title: 'Save Resource', 
        defaultPath: app.getPath('downloads') + '/' + filename, 
        buttonLabel: 'Save', 
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    };

    dialog.showSaveDialog( getWindow() , options ).then(result => {
        if (!result.canceled) {
            fs.writeFileSync( result.filePath, buffer );
        }
    }).catch(err => {
        log( err );
    });
}
let webcontent;

ipcMain.on("setupContext", (event, message) => {
    if(webcontent == event.sender) return;
    webcontent = event.sender;
    
    contextMenu({ 
        window: event.sender,
        showSaveImage: false,
        showSaveVideo: false,
        showSaveLinkAs: false,
        showInspectElement: true,
        showSelectAll: true,
        prepend: (defaultActions, parameters, browserWindow) => [
            {
                label: 'Save Image As',
                visible: parameters.mediaType == "image",
                click: () => {
                    SaveFile( parameters.srcURL );
                }
            },
            {
                label: 'Save link As',
                visible: parameters.linkURL ? true : false,
                click: () => {
                    SaveFile( parameters.linkURL );
                }
            },
            {
                label: 'Save Page As',
                click: () => {
                    SaveFile( parameters.pageURL );
                }
            }
        ]
    });
});