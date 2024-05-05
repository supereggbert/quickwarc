import { signal } from '@preact/signals'

const tooltipContent = signal(null);

let timer;

document.addEventListener("mousemove", e => {
    clearTimeout(timer);
    timer=setTimeout(()=>{
        tooltipContent.value = null;
    })
    let target = e.target;
    while( target && !target.dataset.tooltip ) target = target.parentElement;

    if( target ){
        let rect = target.getBoundingClientRect();
        timer = setTimeout(()=>{
            tooltipContent.value={
                tip: target.dataset.tooltip,
                left: rect.left + rect.width / 2 - 20,
                top: rect.bottom + 15,
            }
        },1000)
    }
})

export function Tooltip(){
    if(!tooltipContent.value) return;
    return (
        <div class="tooltip" style={{left: tooltipContent.value.left+"px",top: tooltipContent.value.top+"px"}}>
            <span></span>{tooltipContent.value.tip}
        </div>
    )
}