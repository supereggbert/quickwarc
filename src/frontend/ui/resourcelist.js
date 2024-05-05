import { signal } from "@preact/signals";
import { ArchiveIcon, DownloadIcon } from "./icons";
import { formatBytes } from "../../common/formating";
import { Loading, NothingToSee } from "./placeholder";
import { __ } from "../lang";

export const resourceList = signal( [] );
export const listLimit = signal( 100 );

export const pageType = signal( "text/html" );
export const keywordFilter = signal( "" );

watch( "resourceList", list => {
    if( !list ){
        resourceList.value = null;
        return;
    }
    resourceList.value = list.sort( ( a, b ) => a.title!="No title" && b.title=="No title" ? -1 : 1 );
    listLimit.value = 100;
    pageType.value = "text/html";
    keywordFilter.value = "";
})

function List( props ){
    if( !resourceList.value ){
        return <Loading />
    }
    const list = resourceList.value.filter(item =>{
        if( pageType.value == ""  && keywordFilter.value == "" ) return true;
        const inFilter = pageType.value == "" || ( item.contentType.toLowerCase().indexOf( pageType.value ) != -1 );
        const needle = keywordFilter.value.toLowerCase();
        const haystack = ( item.title ? item.title.toLowerCase() : '' ) + item.url.toLowerCase();
        const inLink = keywordFilter.value == "" || haystack.indexOf(needle) != -1;
        return inFilter && inLink;
    })
    if(list.length==0){
        return <NothingToSee />
    }
    return list.map( ( item, idx ) =>{
        if( idx > listLimit.value ) return;
        let title = item.title;
        if( !item.title || item.title=="No title"){
            const url = new URL( item.url );
            const pathname = url.pathname;
            title = unescape( pathname.substring(pathname.lastIndexOf('/')+1) );
        }
        if( title == "" ){
            title = "Unknown";
        }
        let filename = title;
        if(item.title){
            filename += ".html"
        }
        return (
            <div class="item">
                <div onClick={ ()=> send('startPlayback', { cid: props.collection.id, rid: props.recording.id, url: item.url } ) }>
                    <div class="topline"><div class="title">{ title }</div><span>({ formatBytes(item.size) })</span></div>
                    <div class="date">{ new Date( item.date ).toString() }</div>
                    <div class="url">{ item.url }</div>
                </div>
                <div>
                    <button onClick={ () => window.location =`download://${props.recording.id}/${item.uid}/${ escape(filename) }` }><DownloadIcon /></button>
                </div>
            </div>
        )
    });
}

function scrolled( e ){
    let listbox = e.target;
    let limitscroll = (listbox.scrollHeight - listbox.offsetHeight) - 100;
    if( listbox.scrollTop > limitscroll ){  
        listLimit.value += 100;
    }
}

export function ResourceList( props ){
    const changeKeyword = e =>{
        keywordFilter.value = e.target.value;
    }
    return (
        <div class="resourcelist">
            <h1><span><ArchiveIcon /> {__('resources')}</span></h1>
            <div class="filter">
                <select onChange={ (e)=> pageType.value = e.target.options[ e.target.selectedIndex ].value } value={ pageType }>
                    <option value="text/html">{__('pages')}</option>
                    <option value="image">{__('images')}</option>
                    <option value="video">{__('video')}</option>
                    <option value="audio">{__('audio')}</option>
                    <option value="application/pdf">{__('PDF')}</option>
                    <option value="">{__('all')}</option>
                </select>
                <input type="text" onKeyup={changeKeyword} onChange={changeKeyword} placeholder={__('filterKeywords')} value={ keywordFilter }></input>
            </div>
            <div class="list" onScroll={ scrolled }>
                <List collection={ props.collection } recording={ props.recording } />
            </div>
        </div>
    )
}


