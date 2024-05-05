import { useState } from 'preact/hooks'
import { Addressbar } from './addressbar.js'
import { createRef } from 'preact'
import { signal } from '@preact/signals';
import { LeftArrowIcon, BackIcon, ForwardIcon, MenuIcon, ImageIcon, ReloadIcon } from './icons.js';
import { __ } from '../lang.js';


let url = signal( "asset://blank.html" );
let urlWebview = "asset://blank.html";

watch("setUrl", newUrl =>{
    url.value = newUrl;
    urlWebview = newUrl;
})

export function Browser( props ){
    const [ canGoBack, setCanGoBack ] = useState(false);
    const [ canGoForward, setCanGoForward ] = useState(false);
    const [ addressUrl, setAddressUrl ] = useState( url.value );
    const [ sidebar, setSidebar ] = useState( true );

    const webview = createRef();

    const SideBar = props.sidebar;

    const updateHistory = ()=>{
        setCanGoBack( webview.current.canGoBack() );
        setCanGoForward( webview.current.canGoForward() );
    }

    const goBack = ()=>{
        webview.current.goBack();
        updateHistory();
    }

    const goForward = ()=>{
        webview.current.goForward();
        updateHistory();
    }

    const reload = ()=>{
        webview.current.reload();
        updateHistory();
    }

    const navigate = e =>{
        const navURL = e.target.getURL();
        url.value = navURL;
        setAddressUrl( navURL );
        updateHistory();
    }

    const domReady = e => {
        const webview = e.target;
        if( props.onload ) props.onload( webview );
        webview.executeJavaScript(`
        [ ...document.querySelectorAll("a") ].map( el => el.removeAttribute("target") );
        `);
    }

    const setViewUrl = newUrl =>{
        url.value = newUrl;
        webview.current.loadURL( newUrl );
    }
    
    const exit = ()=>{
        if(props.onexit){
            props.onexit(()=>{
                send( "mode", { view: "collections" } )
            })
            return;
        }
        send( "mode", { view: "collections" } );
    }

    return (
        <div class="browsecontainer">
            <div class="topbar">
                <button class="transparent" onClick={ exit }><LeftArrowIcon /></button>
                <button style={ {backgroundColor: sidebar ? 'rgba(0,0,0,0.3)' : 'transparent' } } class="transparent" onClick={ () => setSidebar( !sidebar ) }><MenuIcon /></button>
                { props.recording ? <button data-tooltip={__('captureImage')} class="transparent" onClick={()=>{ send("saveFullPage",{ url: url.value, cid: props.collection.id, rid: props.recording.id } ) }}><ImageIcon /></button> : '' }
                <span class="divider"></span>
                <button disabled={ !canGoBack } onClick={ goBack }><BackIcon /></button>
                <button disabled={ !canGoForward } onClick={ goForward }><ForwardIcon /></button>
                <button onClick={ reload }><ReloadIcon /></button>
                <Addressbar change={ setViewUrl } url = { { addressUrl, setAddressUrl } } />
            </div>
            <div class="browsemain">
                <div class={ sidebar ? 'sidebar' : 'sidebar hide' }>
                    <SideBar collection={ props.collection } recording={ props.recording } />
                </div>
                <webview ref={ webview } 
                    preload="frontend/preload_capture.js" 
                    ondom-ready={ domReady } 
                    ondid-navigate={ navigate } 
                    src={ urlWebview } 
                    partition="persist:browse">
                </webview>
            </div>
        </div>
    )
}