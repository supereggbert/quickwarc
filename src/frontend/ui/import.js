import { signal } from "@preact/signals"
import { ImportIcon } from "./icons";
import { __ } from "../lang";


watch("importingWarc", data =>{
    progress.value = data;
})

const progress = signal( { status: __('startingImport'), done: 100 } )

export function ImporttWarcUI(){
    const show = progress.value.done < 100;
    return (
        <div class="exportback" style={ { display: show ? '' : 'none' } }>
            <div class="exportdetails">
                <h1><ImportIcon />{__('importing')}</h1>
                <p>{progress.value.status}</p>
                <div class="progress"><div class="bar" style={ {width: progress.value.done+"%" }}></div><span>{ progress.value.done.toFixed(0) }%</span></div>
            </div>
        </div>
    )
}