const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
      ipcRenderer.send( "setupContext", {} );
});

contextBridge.exposeInMainWorld( 'linkList', 
  linkList =>{
    ipcRenderer.send( "linkList", linkList )
  }
);