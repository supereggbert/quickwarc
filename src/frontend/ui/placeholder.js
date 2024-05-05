import { __ } from "../lang";
import { RecordIcon } from "./icons";

export function NoRecordings( props ){
    return (
        <div class="placeholderblock">
            <div class="placholderimage">
            <img src="../assets/needhelp.png" />
            </div>
            <div class="placeholdercontent">
            <h2>{__('noRecordings')}</h2>
            <p>{__('whatIsRecording')}</p>
            <button class="stdbutton" onClick={ ()=> send('startRecord', props.collection.id ) }><RecordIcon /> {__('createRecording')}</button>
            </div>
        </div>
    )
}

export function Loading( props ){
    return (
        <div class="placeholderblock loading">
            <div class="placholderimage">
            <img src="../assets/thinking.png" />
            </div>
            <div class="placeholdercontent">
            <p>{__('workingOnIt')}</p>
            </div>
        </div>
    )
}

export function NothingToSee( props ){
    return (
        <div class="placeholderblock">
            <div class="placholderimage">
            <img src="../assets/nothingtosee.png" />
            </div>
            <div class="placeholdercontent">
            <p>{__('nothingToSee')}</p>
            </div>
        </div>
    )
}