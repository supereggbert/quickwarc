import { Browser } from './browser.js';
import { ResourceList } from './resourcelist.js';

let webView;

function pageLoaded( webview ){
    webView = webview;
    //webview.openDevTools();
}

function SideBar( props ){
    return (
        <ResourceList collection={ props.collection } recording={ props.recording } />
    )
}

export function Play( props ){
    return <Browser sidebar={ SideBar } onload={ pageLoaded } collection={ props.collection } recording={ props.recording } />
}