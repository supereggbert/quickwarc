import { signal } from '@preact/signals'
import { __ } from '../lang';

const confirmContent = signal(null);

export function Popup( props ){
    return (
        <div class="popup">
            <div class="popupcontent">
                {props.children}
            </div>
        </div>
    )
}

export function confirm(message,callback){
    confirmContent.value={
        message,
        callback
    }
}

function confirmOkay(){
    confirmContent.value.callback();
    confirmContent.value = null;
}

function confirmCancel(){
    confirmContent.value = null;
}

export function ConfirmPopup( props ){
    if(!confirmContent.value) return;
    return (
        <Popup>
            <div class="confirm">
                <p>{confirmContent.value.message}</p>
                <div class="buttons"><button class="stdbutton" onClick={confirmCancel}>{__('cancel')}</button><button class="stdbutton" onClick={confirmOkay}>{__('ok')}</button></div>
            </div>
        </Popup>
    )
}
