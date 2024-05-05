
import { signal } from '@preact/signals';

watch( "linkList", list => {
    Spider.addURLs( list );
} );

const Defaults={
    completed: 0,
    limitInternalDepth: false,
    internalDepth: 5,
    externalDepth: 0,
    autoScroll: true,
    scrollDelay: 10,
    requestsDelay: 1000,
    pageTimeout: 10000,
    ignorefragmentidentifier: true,
    excludes: ''
}

export const Spider = {
    domain: signal(""),
    currentPage: null,
    webview: null,
    state: signal( "idle" ),
    found: signal( 0 ),
    completed: signal( 0 ),
    limitInternalDepth: signal( Defaults.limitInternalDepth ),
    internalDepth: signal( Defaults.internalDepth ),
    externalDepth: signal( Defaults.externalDepth ),
    autoScroll: signal( Defaults.autoScroll ),
    scrollDelay: signal( Defaults.scrollDelay ),
    requestsDelay: signal( Defaults.requestsDelay ),
    pageTimeout: signal( Defaults.pageTimeout ),
    ignorefragmentidentifier: signal( Defaults.ignorefragmentidentifier ),
    excludes: signal( Defaults.excludes ),
    pageTimeoutTimer: null,
    pagelist: [],
    done: {},
    queue: [],

    pageLoaded( webview ){
        if( this.state.value === "idle" ){
            let url = new URL( webview.getURL() );
            if( url.protocol === "http:" || url.protocol === "https:" ){
                this.domain.value = url.host;
                this.done={};
                this.done[url]=true;
                this.webview = webview;
                this.currentPage = { depth: 0, url, type: "internal" };
            }
        }
    
        //webview.openDevTools(); // DEBUG only

        webview.executeJavaScript(`
            (function(){
                console.log("prescript Loaded")
                function getAllUrlPropertiesFromStyles() {
                    const urls = [];
                
                    for (let sheet of document.styleSheets) {
                        try {
                            const rules = sheet.rules || sheet.cssRules;
                            for (let rule of rules) {
                                const regex = /url\\((['"]?)(.*?)\\1\\)/g;
                                let match;
                                while ((match = regex.exec(rule.cssText)) !== null) {
                                    urls.push(match[2]);
                                }
                                if (rule.type === CSSRule.MEDIA_RULE) {
                                    for (let innerRule of rule.cssRules) {
                                        while ((match = regex.exec(innerRule.cssText)) !== null) {
                                            urls.push(match[2]);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            
                        }
                    }
                
                    return urls;
                }

                function extractUrlsFromSrcset(srcset) {
                    const srcsets = [...document.querySelectorAll("[srcset],[data-srcset],[data-src],img[src]")];
                    const urls = [];

                    srcsets.forEach( el =>{
                        let entries;
                        if( el.hasAttribute("srcset") ){
                            entries = el.getAttribute("srcset").split(",");
                        }
                        if( el.hasAttribute("data-srcset") ){
                            entries = el.getAttribute("data-srcset").split(",");
                        }
                        if( el.hasAttribute("data-src") ){
                            entries = [ el.getAttribute("data-src") ];
                        }
                        if( el.hasAttribute("src") ){
                            entries = [ el.getAttribute("src") ];
                        }
                        entries.forEach(entry => {
                            const parts = entry.trim().split(/\\s+/);
                            urls.push( parts[0] );
                        });
                    });
                    
                    return urls;
                }

                function fetchAllLinks(){
                    try{
                        getAllUrlPropertiesFromStyles().forEach( url => url && fetch(url) );
                        extractUrlsFromSrcset().forEach( url=> url && fetch(url) );
                    }catch(e){}
                }

                function sendLinks(){
                    setTimeout(()=>{
                        const links = [ ...document.querySelectorAll("a") ].map( el => el.href.toString() );
                        linkList( links );
                    },500)
                    fetchAllLinks();
                }
                addEventListener("hashchange", (event) => {
                    setTimeout(()=>{
                        sendLinks();
                    },${ this.requestsDelay.value });
                });
                const AUTOSCROLL = ${ Spider.state == "running" && this.autoScroll.value };
        
                function autoscroll(){
                    if( Math.ceil( document.documentElement.scrollTop ) < Math.floor( document.documentElement.scrollHeight - innerHeight ) ){
                        document.documentElement.scrollTop += 50;
                        setTimeout( autoscroll, ${ this.scrollDelay.value } );
                        return;
                    }
                    sendLinks();
                }
                AUTOSCROLL ? autoscroll() : sendLinks();
            })();
        `);
    },
    nextUrl(){
        if( this.pageTimeoutTimer){
            clearTimeout( this.pageTimeoutTimer );
        }
        if( this.state.value !== "running" ) return;
        if( !this.webview ) return;
        const nextURL = this.queue.shift();
        
        if( nextURL ){
            this.currentPage = nextURL;

            this.webview.loadURL( nextURL.url.toString() );

            this.pageTimeoutTimer = setTimeout( ()=>{
                this.nextUrl();
                this.completed.value++;
            }, this.pageTimeout.value );
            return;
        }
        this.state.value = "complete";
    },
    processList( list ){
        if( !this.currentPage ) return;
        list.forEach( url => {
            if(!url) return;

            const excludes = this.excludes.value.split("\n");
            let urlString = url.toString();

            for(let i=0;i<excludes.length;i++){
                if( excludes[i] == '' ) continue;
                if(urlString.indexOf(excludes[i])!=-1) return;
            }

            if( this.done[ url ] ) return;
            if( url.protocol !== "http:" && url.protocol !== "https:" ) return;
            if( url.host === this.domain.value ){
                if( this.limitInternalDepth.value && this.currentPage.depth >= this.internalDepth.value ){
                    return;
                }
                this.queue.push(
                    { url, depth: this.currentPage.depth + 1, type: "internal" }
                );
                this.done[ url ] = true;
                this.found.value++;
                return;
            }
            let depth = 0;
            if( this.currentPage.type === "external" ) depth = this.currentPage.depth + 1;
            if( depth < this.externalDepth.value ){
                this.queue.push(
                    { url, depth, type: "external" }
                );
                
                this.done[ url ] = true;
                this.found.value++;
            }
        });
    },
    addURLs( urls ){
        if( this.state.value == "idle" ){
            this.queue = [];
            this.found.value = 0;
            this.completed.value = 0;
            this.pagelist = urls;
        }
        if( this.domain.value ){
            this.completed.value++;
            const urlList = urls.map( url => {
                try{
                    if( this.ignorefragmentidentifier ){
                        url = url.split( '#' )[ 0 ];
                    }
                    return new URL( url );
                }catch(e){
                    return;
                }
            }); 
            this.processList( urlList );
            setTimeout( ()=>{
                this.nextUrl();
            }, this.requestsDelay.value );
        }
    },
    reset(){
        this.domain.value = null;
        this.webview = null;
        this.queue = [];
        this.pagelist = [];
        this.done = {};
        this.completed.value = 0;
        this.found.value = 0;
        this.state.value = "idle";
        this.limitInternalDepth.value = Defaults.limitInternalDepth;
        this.internalDepth.value =  Defaults.internalDepth;
        this.externalDepth.value =  Defaults.externalDepth;
        this.autoScroll.value =  Defaults.autoScroll;
        this.scrollDelay.value =  Defaults.scrollDelay;
        this.requestsDelay.value =  Defaults.requestsDelay;
        this.pageTimeout.value =  Defaults.pageTimeout;
        this.excludes.value =  Defaults.excludes;
    },
    start(){
        if( this.domain.value ){
            console.log(this.pagelist);
            this.queue = [];
            this.done = {};
            this.addURLs( this.pagelist );
            this.found.value++;
            this.state.value = "running";
            this.pageLoaded( this.webview );
        }
    },
    pause(){
        if( this.pageTimeoutTimer){
            clearTimeout( this.pageTimeoutTimer );
        }
        this.state.value = "paused";
    },
    resume(){
        this.state.value = "running";
        this.nextUrl();
    },
    stop(){
        if( this.pageTimeoutTimer){
            clearTimeout( this.pageTimeoutTimer );
        }
        this.reset();
        if( this.webview ) this.webview.loadURL( "about:blank" );
    }
}

