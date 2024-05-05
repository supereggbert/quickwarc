import { signal } from "@preact/signals"
import { ExportIcon } from "./icons";
import { __ } from "../lang";


watch("exportingWarc", data =>{
    progress.value = data;
})

const progress = signal( { on: 0, of: 0, done: 100 } )

export function ExportWarcUI(){
    const show = progress.value.done < 100 || progress.value.on != progress.value.of;
    return (
        <div class="exportback" style={ { display: show ? '' : 'none' } }>
            <div class="exportdetails">
                <h1><ExportIcon />{__('exporting')}</h1>
                <p>{__('exportingRecording')} { progress.value.on } / { progress.value.of }</p>
                <div class="progress"><div class="bar" style={ {width: progress.value.done+"%" }}></div><span>{ progress.value.done.toFixed(0) }%</span></div>
            </div>
        </div>
    )
}