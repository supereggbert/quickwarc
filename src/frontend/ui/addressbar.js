import { GoIcon } from './icons';

export function Addressbar(props){
    
    const setAddressUrl = props.url.setAddressUrl;
    const addressUrl = props.url.addressUrl;

    const keyUp = e =>{      
        if(e.keyCode==13){
            go();
        }
        setAddressUrl( e.target.value );
    }

    const go = ()=>{
        if( props.change ){
            let url = addressUrl;
            if( url.indexOf("://") == - 1 && url != "asset://blank.html" ){
                url = "https://" + url;
                setAddressUrl( url );
            }
            props.change( url );
        }
    }

    return (
        <div class="addressbar">
            <input onKeyup={keyUp} type="text" placeholder="url" value={addressUrl} onFocus={ e => e.target.select() }></input>
            <button onClick={go}><GoIcon /></button>
        </div>
    )
}