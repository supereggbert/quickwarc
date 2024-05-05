import { Browser } from './browser.js';
import { Spider } from '../spider.js';
import { confirm } from './popup.js';
import { signal } from '@preact/signals';
import { formatBytes } from '../../common/formating.js';
import { PauseIcon, PlayIcon, RecordIcon, StopIcon } from './icons.js';
import { __ } from '../lang.js';

const stats = signal( { resources:0, pages:0, size:0 } );

watch("stats", ( newStats )=>{
    stats.value = newStats;
});

function Pause(){
    if( Spider.state.value == "paused" ){
        return <button class="stdbutton" onClick={ ()=> Spider.resume() }><PlayIcon /> {__('resume')}</button>
    }
    return <button class="stdbutton"onClick={ ()=> Spider.pause() }><PauseIcon /> {__('pause')}</button>
}

function Running(){
    if( Spider.state.value !== "running" && Spider.state.value !== "paused" ) return;
    const stop = ()=>{
        confirm(__('stopCrawl'),()=>{
            const domain = Spider.domain.value;
            Spider.stop();
            Spider.domain.value = domain;
        })
    }
    return (
        <div class="infocopy">        
            <img src="assets/spiderrunning.png"></img>
            <h3>{__('crawlUnderway')}</h3>
            <p>{__('pagesCrawled')}: {Spider.completed}/{Spider.found}</p>
            <div class="buttons">
                <button class="stdbutton" onClick={stop}><StopIcon /> {__('stop')}</button>
                <Pause />
            </div>
        </div>
    )
}

function Complete(){
    if( Spider.state.value !== "complete" ) return;

    const newCrawl = ()=>{
        const domain = Spider.domain.value;
        Spider.reset();
        Spider.domain.value = domain;
    }

    return (
        <div class="infocopy">        
            <img src="assets/spidercomplete.png"></img>
            <h3>{__('crawlComplete')}</h3>
            <p>{__('pagesCrawled')}: { Spider.completed }</p>
            <div class="buttons">
                <button class="stdbutton" onClick={ newCrawl }><RecordIcon /> {__('newCrawl')}</button>
            </div>
        </div>
    )
}

function SpiderIntro(){
    if( Spider.state.value !== "idle" ) return;
    if( Spider.domain.value ) return;
    return (
        <div class="infocopy">
            <img src="assets/spiderhelp.png"></img>
            <p>{__('pleaseBrowse')}</p>
        </div>
    )
}

function Configure(){
    if( Spider.state.value !== "idle" ) return;
    if( !Spider.domain.value ) return;
    const toggle = ( key ) => {
        return ()=>{
            Spider[ key ].value = !Spider[ key ].value;
        }
    }
    const setNumber = ( key, min, max ) => {
        return (e)=>{
            const value = Math.min(max, Math.max(min, e.target.value ) );
            Spider[ key ].value = value;
            e.target.value = value;
        }
    }
    return (
        <div>
            <div class="form">
                <div class="field" data-tooltip={__('limitSiteDepthHelp')}>
                    <label for="limitdepth">{__('limitSiteDepth')}</label>
                    <div><input id="limitdepth" type="checkbox" onChange={ toggle('limitInternalDepth') } checked={ Spider.limitInternalDepth.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('siteCrawlDepthHelp')}>
                    <label for="sitecrawldepth">{__('siteCrawlDepth')}</label>
                    <div><input id="sitecrawldepth" type="number" onChange={ setNumber( 'internalDepth', 0, 100 ) } value={ Spider.internalDepth.value } disabled={ !Spider.limitInternalDepth.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('externalcrawlDepthHelp')}>
                    <label for="externalcrawldepth">{__('externalcrawlDepth')}</label>
                    <div><input id="externalcrawldepth" type="number" onChange={ setNumber( 'externalDepth', 0, 100 ) } value={ Spider.externalDepth.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('autoScrollHelp')}>
                    <label for="autoscroll">{__('autoScroll')}</label>
                    <div><input id="autoscroll" type="checkbox" onChange={ toggle('autoScroll') } checked={ Spider.autoScroll.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('scrollDelayHelp')}>
                    <label for="scrolldelay">{__('scrollDelay')}</label>
                    <div><input id="scrolldelay" type="number" onChange={ setNumber( 'scrollDelay', 10, 2000 ) } value={ Spider.scrollDelay.value } disabled={ !Spider.autoScroll.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('requestDelayHelp')}>
                    <label for="requestdelay">{__('requestDelay')}</label>
                    <div><input id="requestdelay" type="number" onChange={ setNumber( 'requestsDelay', 250, 20000 ) } value={ Spider.requestsDelay.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('pageTimeoutHelp')}>
                    <label for="pagetimeout">{__('pageTimeout')}</label>
                    <div><input id="pagetimeout" type="number" onChange={ setNumber( 'pageTimeout', 250, 300000 ) } value={ Spider.pageTimeout.value }></input></div>
                </div>
                <div class="field" data-tooltip={__('ignoreFragmentIdsHelp')}>
                    <label for="ignorefragmentidentifier">{__('ignoreFragmentIds')}</label>
                    <div><input id="ignorefragmentidentifier" type="checkbox" onChange={ toggle('ignorefragmentidentifier') } checked={ Spider.ignorefragmentidentifier.value }></input></div>
                </div>
                <div class="field multiline" data-tooltip={__('listofExclusionHelp')}>
                    <label for="excludes">{__('listofExclusion')}</label>
                    <div><textarea placeholder="eg, https://www.example.com/news" id="excludes" type="checkbox" onChange={ e => Spider.excludes.value = e.target.value } checked={ Spider.excludes.value }></textarea></div>
                </div>
                
            </div>
            <div class="buttons">
                <button class="stdbutton" onClick={ ()=> Spider.start() }><PlayIcon /> {__('startCrawl')}</button>
            </div>
        </div>
    )
}

function AutoMagicSpider(){
    let domain = Spider.domain.value;
    if(!domain) domain = __('noHostSet');
    return (
        <div class="autospider">
            <div class="info">
                <h2>{__('autoMagicSpider')}</h2>
                <div>{ domain }</div>
            </div>
            <SpiderIntro />
            <Configure />
            <Running />
            <Complete />
        </div>
    )
}

function SideBar(){
    return (
        <div class="recordsidebar">
            <h1><span><RecordIcon /> {__('recording')}</span></h1>
            <div class="stats">
                <div>{__('pagesCaptured')}:</div><div>{ stats.value.pages }</div>
                <div>{__('resourcesCaptured')}:</div><div>{stats.value.resources }</div>
                <div>{__('captureSize')}:</div><div>{ formatBytes( stats.value.size ) }</div>
            </div>
            <AutoMagicSpider />
        </div>
    )
}

function exit( callback ){
    confirm( __('sureLeaveRecording'), callback );
}

export function Record(){
    return <Browser sidebar={ SideBar } onload={ ( webview ) => Spider.pageLoaded( webview ) } onexit={ exit } />
}