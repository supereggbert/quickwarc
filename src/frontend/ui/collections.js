import { signal } from '@preact/signals';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Popup, confirm } from './popup.js';
import { formatBytes } from '../../common/formating.js';
import { CancelIcon, CollectionIcon, CollectionsIcon, EditIcon, ExportIcon, ImportIcon, PlayIcon, PlusIcon, RecordIcon, SaveIcon, TrashIcon } from './icons.js';
import { ResourceList } from './resourcelist.js';
import { NoRecordings } from './placeholder.js';
import { __ } from '../lang.js';

export const collectionList = signal( [] );
export const selectedCollection = signal( -1 );
export const selectedRecording = signal( -1 );

export const collectionFilter = signal('');

const editingCollection = signal();
const editingRecording = signal();

watch( "collectionList", list => {
    collectionList.value = list;
    if( list.length == 0 ){
        selectedCollection.value = -1;
        return;
    }
    if( selectedCollection.value == -1 || !list[ selectedCollection.value ] ){
        selectCollection( 0 );
    }
    if( selectedRecording.value == -1 ){
        selectRecording( 0 )
    }
});

function selectRecording( idx ){
    selectedRecording.value = idx;

    let recording = getCurrentRecording();

    if(!recording){
        send( "resourceList", [] );
        return;
    }
    
    send( "resourceList", null );

    send( "getResourceList", recording.id );
}

export function refreshResources(){
    selectRecording( selectedRecording.value );
}

function selectCollection( idx ){
    selectedCollection.value = idx;
    const collection = getCurrentCollection();
    const recordings = Object.values( collection.recordings );
    if( recordings.length == 0 ){
        send( "resourceList", [] );
        return;
    }
    send( "resourceList", null );

    selectRecording( 0 );
}



send( "getCollectionList" );

function getCurrentCollection(){
    return collectionList.value[ selectedCollection.value ];
}
function getCurrentRecording(){
    const collection = getCurrentCollection();
    if(!collection) return;
    const recordings = Object.values( collection.recordings );
    return recordings[ recordings.length - 1 - selectedRecording.value ];
}

function editRecording( id ){
    const collection = getCurrentCollection();
    editingRecording.value = { title: collection.recordings[ id ].title, rid: id, cid: collection.id };
}

function continueRecording( cid, rid ){
    send( "continueRecording", { cid, rid } )
}

function RecordingList(){
    if( selectedCollection.value == -1 ) return;

    const collection = getCurrentCollection();
    const recordings = Object.values( collection.recordings );

    if(recordings.length == 0){
        return <NoRecordings collection={ collection }/>
    }

    const deleteRecording = ( rid ) => {
        confirm( __('sureDeleteRecording'), ()=>{
            send( "resourceList", [] );
            selectedRecording.value = -1;
            send( "deleteRecording", { cid: collection.id, rid } );
        });
    }

    return recordings.reverse().map( (item, i) => {
        return (
            <div class={ selectedRecording.value == i ? "item selected" : "item" } onClick={ ()=> selectRecording( i ) }>
                <div class="info">
                    <div class="summary">
                        <div class="title">{ item.title }</div>
                        <div class="date">{new Date( item.created ).toString()}</div>
                        <div class="entry">{ item.firstPage ? item.firstPage : 'None' }</div>
                        <div class="meta">
                            <div><span>{__('size')}:</span> { formatBytes( item.size ) }</div>
                            <div><span>{__('resources')}:</span> { item.resources } </div>
                            <div><span>{__('pages')}: </span>{ item.pages }</div>
                        </div>
                    </div>
                    <div class="buttons">
                        <button class="stdbutton" onClick={ () => startPlayback( collection.id, item.id ) }><PlayIcon /> {__('browse')}</button> 
                        <button class="stdbutton" onClick={ ()=> continueRecording( collection.id, item.id ) }><RecordIcon /> {__('record')}</button> 
                        <button class="stdbutton"  onClick = { () => editRecording( item.id ) } ><EditIcon/> {__('edit')}</button> 
                        <button class="stdbutton red" onClick={ () => deleteRecording( item.id ) }><TrashIcon /> {__('delete')}</button> 
                    </div>
                </div>
                <div class="image" style={ {backgroundImage:`url(thumbs://${ collection.id }/${ item.id })`} }>
                </div>
            </div>
        )
    })
}
function CollectionsList(){
    const items = collectionList.value;
    return items.filter(item => item.name.toLowerCase().indexOf(collectionFilter.value.toLowerCase())!=-1).map( ( item, idx ) => {
        
        const stats = getStats( item );
        return (
        <div class="item">
            <button onClick={ () => selectCollection( idx ) } className={ idx == selectedCollection.value ? 'selected' : null }><div class="title"><div class="icon"><CollectionIcon /></div><div>{item.name}</div><span>({ stats.recordings })</span></div><small><b>{__('size')}:</b> {formatBytes( stats.size )}</small></button>
        </div>
        ) 
    })
}

function newRecording( item ){
    send('startRecord', item.id );
    selectRecording( 0 );
}

function startPlayback( cid, rid ){
    const colection = getCurrentCollection();
    const url = colection.recordings[ rid ].firstPage;
    send('startPlayback', { cid, rid, url } );
}

function deleteCollection(){
    const collection = getCurrentCollection();
    
    confirm( __('sureCancelCollection')+collection.name+"?",()=>{
        send( "resourceList", [] );
        selectedCollection.value = -1;
        selectedRecording.value = -1;
        send( 'deleteCollection', collection.id );
    });
}

function EditCollection(){
    if( !editingCollection.value ) return;

    const [error, setError] = useState("");

    let input = useRef();
    
    useLayoutEffect(() => {
        input.current.focus();
    }, []);

    const saveCollection = ()=>{

        editingCollection.value.name = editingCollection.value.name.trim();

        if( editingCollection.value.name == "" ){
            setError("Name is Required");
            return;
        }

        setError( "" );

        send( 'saveCollection', editingCollection.value );
        editingCollection.value = null;
    }

    const cancelEdit = ()=>{
        setError( "" );
        editingCollection.value = null;
    }

    const keyup = e =>{
        editingCollection.value.name = e.target.value;
        if( e.keyCode == 13 ){
            saveCollection();
        }
    }

    return (
        <Popup>
            <div class="editpanel">
                <div class="field">
                    <label for="collectionname">{__('collectionName')}</label>
                    <input ref={input} type="text" id="collectionname" 
                        onKeyup={ keyup }
                        onChange={ e => editingCollection.value.name = e.target.value } value={ editingCollection.value.name }></input>
                </div>
                <div class="field">
                    <label for="collectiondescription">{__('collectionDescription')}</label>
                    <textarea type="text" id="collectiondescription" 
                        onChange={ e => editingCollection.value.description = e.target.value }  value={ editingCollection.value.description }></textarea>
                </div>
                <div class="error">{error}</div>
                <div class="buttonbar">
                    <button onClick={cancelEdit} class="stdbutton"><CancelIcon /> {__('cancel')}</button>
                    <button onClick={saveCollection} class="stdbutton"><SaveIcon /> {__('save')}</button>
                </div>
            </div>
        </Popup>
    )
}

function EditRecording(){
    if( !editingRecording.value ) return;

    let input = useRef();
    
    useLayoutEffect(() => {
        input.current.focus();
    }, []);

    const [error, setError] = useState("");

    const saveRecording = ()=>{

        editingRecording.value.title = editingRecording.value.title.trim();

        if( editingRecording.value.title == "" ){
            setError(__('titleRequired'));
            return;
        }

        setError( "" );

        send( 'saveRecording', editingRecording.value );
        editingRecording.value = null;
    }

    const cancelEdit = ()=>{
        setError( "" );
        editingRecording.value = null;
    }

    const keyup = e =>{
        editingRecording.value.title = e.target.value;
        if( e.keyCode == 13 ){
            saveRecording();
        }
    }

    return (
        <Popup>
            <div class="editpanel">
                <div class="field">
                    <label for="collectionname">{__('recordingTitle')}</label>
                    <input ref={ input } type="text" id="collectionname" 
                        onKeyup={ keyup }
                        onChange={ e => editingRecording.value.title = e.target.value } value={editingRecording.value.title}></input>
                </div>
                <div class="error">{error}</div>
                <div class="buttonbar">
                    <button onClick={cancelEdit} class="stdbutton"><CancelIcon /> {__('cancel')}</button>
                    <button onClick={saveRecording} class="stdbutton"><SaveIcon /> {__('save')}</button>
                </div>
            </div>
        </Popup>
    )
}

function editCollection(){
    const collection = getCurrentCollection();
    editingCollection.value = { ...collection };
}

function newCollection(){
    editingCollection.value = { name: '', description: '' };
}

function saveWarc( collection ){
    send( "saveWarc", collection );
}
function getStats( collection ){
    const stats = { resources: 0, pages: 0, size: 0, recordings: 0 };
    Object.values(collection.recordings).reduce(( accumulator, currentValue ) => {
        accumulator.size += currentValue.size;
        accumulator.resources += currentValue.resources;
        accumulator.pages += currentValue.pages;
        accumulator.recordings++;
        return accumulator;
    }, stats);
    return stats;
}
function CollectionInfo(){
    if( selectedCollection.value == -1 ) return;
    const collection = getCurrentCollection();
    const description =  collection.description.replace( /\r/g, "" ).split("\n\n");
    const formatedDescription = description.map( para => {
        const lines = para.split("\n").map( line => <div>{line}</div>)
        return <p>{ lines }</p>
    })
    const stats = getStats( collection );
    return (
        <div class="collectioninfo">
            <div class="description">
                { formatedDescription }
                <div class="date">{ new Date( collection.created ).toString() }</div>
                <button onClick={ () => newRecording( collection ) } class="stdbutton grey"><RecordIcon /> {__('newRecording')}</button>
                <button onClick={ () => saveWarc( collection )  } class="stdbutton grey"><ExportIcon /> {__('exportWarc')}</button>
            </div>
            <div class="stats">
                <div><b>{__('size')}</b></div><div>{ formatBytes( stats.size ) }</div>
                <div><b>{__('resources')}</b></div><div>{ stats.resources }</div>
                <div><b>{__('pages')}</b></div><div>{ stats.pages }</div>
            </div>
        </div>
    )
}

export function Collections() {
    if( selectedCollection.value == -1 ){
        return <div class="startcontainer">
                <div class="startcontent">
                    
                    <img src="assets/welcome.png" />
                    <h2>{__('noCollectionsTitle')}</h2>
                    <h3>{__('whatAreCollections')}</h3>
                    <p>{__('collectionDetails')}</p>
                <button onClick={newCollection} class="stdbutton"><CollectionIcon /> {__('createCollection')}</button>
                <button onClick={()=>send('importWarc')} class="stdbutton"><ImportIcon /> {__('importWarc')}</button>
                <EditCollection />
                </div>
            </div>
    }
    const collection = getCurrentCollection();
    const recording = getCurrentRecording();
    return(
        <div class="collectionslayout">            
            <div class="collectionlist">
                <h1><span><CollectionsIcon />{__('collections')}</span>
                <button data-tooltip={__('importWarcFile')} onClick={()=>send('importWarc')}><ImportIcon /></button>
                <button data-tooltip={__('creatANewCollection')} onClick={newCollection}><PlusIcon /></button>
                </h1>
                <div class="collectionfilter">
                    <input placeholder={__('filterCollections')} value={ collectionFilter.value } onKeyup={ e => collectionFilter.value = e.target.value } />
                </div>
                <div class="list">
                    <CollectionsList />
                </div>
            </div>
            <div class="recordinglist">
            <h1>
                <span><CollectionIcon /><div class="name">{ collection.name }</div></span>
                <button onClick={ () => editCollection() } data-tooltip={__('editCollectonMeta')}><EditIcon /></button>
                <button class="delete" onClick={ () => deleteCollection() } data-tooltip={__('deleteCollecton')}><TrashIcon /></button>
            </h1>
            <CollectionInfo />
            <div class="list">
                <RecordingList />
            </div>
            </div>
            <ResourceList collection={ collection } recording={ recording } />
            <EditCollection />
            <EditRecording />
        </div>
    )
}
