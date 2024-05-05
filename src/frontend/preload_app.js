
const { contextBridge, ipcRenderer  } = require( 'electron' );

let version = "0";

contextBridge.exposeInMainWorld( 'closeWindow', 
  ()=>{
    ipcRenderer.send( "close" )
  }
);

contextBridge.exposeInMainWorld( 'watch', 
  ( channel, callback )=>{
    ipcRenderer.on( channel, ( event, arg ) => {
      callback(arg);
    });
  }
);

contextBridge.exposeInMainWorld( 'send', 
  ( channel, message )=>{
    ipcRenderer.send( channel, message )
  }
);

contextBridge.exposeInMainWorld( 'getAppVersion', 
  ()=>{
    return version;
  }
);

ipcRenderer.on( "version", ( event, arg ) => {
  version = arg;
});

contextBridge.exposeInMainWorld( 'isDebug', process.env.debug?true:false );

console.log(process.env);



