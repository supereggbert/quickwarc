import { render } from 'preact';
import { Collections, refreshResources } from './ui/collections.js'
import { Record } from './ui/record.js'
import { ConfirmPopup } from './ui/popup.js';
import { Tooltip } from './ui/tooltip.js';
import { signal } from '@preact/signals';
import { Play } from './ui/play.js';
import { Spider } from './spider.js';
import { CrossIcon, MaximizeIcon, MinimizeIcon, UnmaximizeIcon } from './ui/icons.js';
import { ExportWarcUI } from './ui/export.js';
import { ImporttWarcUI } from './ui/import.js';

const mode = signal({ view: "collections" })
const maximized = signal(false);

watch( "maximized", ( value ) => {
    maximized.value = value;
})

watch( "mode", ( newMode ) => {
    mode.value = newMode;
})

function Layout(){

    Spider.reset();

    switch(mode.value.view){
        case "collections":
            refreshResources();
            return <Collections />
        case "record":
            return <Record collection={ mode.value.collection } recording={ mode.value.recording } />
        case "play":
            return <Play collection={ mode.value.collection } recording={ mode.value.recording } />
    }
    return;
}

function App() {
  return (
    <div class="windowcontainer">
        <header onDblclick={ ()=>send( "toggleMaximize" ) }>
        <div class="icon"><img src="../assets/icon.png" alt="QuickWARC" /></div>
        <div class="title">QuickWARC <i>v{window.getAppVersion()}</i></div>
        <button onClick={ ()=>send( "minimize" ) }><MinimizeIcon /></button>
        <button onClick={ ()=>send( "toggleMaximize" ) }>{ maximized.value ? <UnmaximizeIcon /> : <MaximizeIcon /> }</button>
        <button class="close" onClick={ ()=>send( "close" ) }><CrossIcon /></button>
        </header>
        <Layout />
        <ConfirmPopup />
        <Tooltip />
        <ExportWarcUI />
        <ImporttWarcUI />
    </div>
  )
}

render(<App />, document.getElementById( "container" ));

