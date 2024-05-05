import { watch, send } from './window.js'
import { localStorage } from './localstorage.js';
import { generateUUID } from '../common/uuid.js';
import { setProxy } from './proxy.js';
import { DB } from '../common/db.js';

if(!localStorage.collections){
    localStorage.collections = {};
}

watch( "resourceList", list => {
    send( "resourceList", list );
} );

export function sendCollectionList(){
    const list = Object.values(localStorage.collections);
    send( "collectionList", list.sort( (a, b) => b.created - a.created ) );
}

function saveCollection( data ){
    if(!data.id) data.id = generateUUID();

    const collections = localStorage.collections;

    if(!collections[data.id]){
        collections[data.id]={ id: data.id, created: +new Date, recordings: {} }
    }

    collections[data.id] = {...collections[data.id], ...data }
    localStorage.save();
    sendCollectionList();
}

function saveRecording( data ){
    const collection = localStorage.collections[ data.cid ];
    collection.recordings[ data.rid ].title = data.title;
    localStorage.save();
    sendCollectionList();
}

function deleteRecording( param ){
    const collection = localStorage.collections[ param.cid ];
    const db = new DB( param.rid );
    db.delete();
    delete( collection.recordings[ param.rid ] );
    localStorage.save();
    sendCollectionList();
}

function deleteCollection( id ){
    const collection = localStorage.collections[id];
    const recordings = Object.values( collection.recordings );
    recordings.map( recording => {
        const db = new DB( recording.id );
        db.delete();
    } );
    if(localStorage.collections[id]){
        delete( localStorage.collections[id] );
        localStorage.save();
        sendCollectionList();
    }
}

async function startRecord(cid){
    
    const id = generateUUID();

    const recording = {
        title: "No title",
        id,
        created: +new Date,
        size: 0,
        pages: 0,
        resources: 0
    };

    localStorage.collections[cid].recordings[id] = recording;
    localStorage.save();

    await setProxy( cid, id, true );

    send( "setUrl", "asset://blank.html" );

    const collection = localStorage.collections[ cid ];

    send( "mode", { view: "record", collection, recording });

    sendCollectionList();
}

async function continueRecording( data ){

    const collection = localStorage.collections[ data.cid ];
    const recording = collection.recordings[ data.rid ];

    await setProxy( data.cid, data.rid, true );

    let firstPage = recording.firstPage;
    if( !firstPage ) firstPage = "asset://blank.html";

    send( "setUrl", firstPage );

    send( "mode", { view: "record", collection, recording });

    sendCollectionList();
}

async function startPlayback( params ){

    await setProxy( params.cid, params.rid, false );

    send( "setUrl", params.url ? params.url : "asset://blank.html" );

    const collection = localStorage.collections[ params.cid ];
    const recording = collection.recordings[ params.rid ]

    send( "mode", { view: "play", collection, recording } );
}

async function sendResourceList( Recordingid ){
    const db = new DB( Recordingid );
    const results = await db.find( { type: "RESPONSE", status: 200 },{ body: 0 }, { date: 1 } );
    send( "resourceList", results );
}

watch( "getResourceList", sendResourceList );
watch( "getCollectionList", sendCollectionList );
watch( "saveCollection", saveCollection );
watch( "deleteCollection", deleteCollection );
watch( "startRecord", startRecord );
watch( "startPlayback", startPlayback );
watch( "deleteRecording", deleteRecording );
watch( "saveRecording", saveRecording );
watch( "continueRecording", continueRecording );

