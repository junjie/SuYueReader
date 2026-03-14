var St=Object.defineProperty;var Lt=(r,t,e)=>t in r?St(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e;var h=(r,t,e)=>Lt(r,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(i){if(i.ep)return;i.ep=!0;const n=e(i);fetch(i.href,n)}})();const D={fontFamily:"Noto Serif",fontSize:22,lineHeight:1.5,paragraphSpacing:1,verticalParagraphSpacing:.5,marginH:32,marginV:32,verticalMarginV:48,writingMode:"horizontal",theme:"light",showPinyin:!1,pinyinPosition:"over",pinyinSize:12,showNumbering:!0,scriptVariant:"original",lineLength:35,showCedict:!0,showCvdict:!0,dictOrder:["cedict","cvdict"]},K=new Set,nt=new Set,gt={"Noto Serif SC":"Noto+Serif+SC:wght@400;700","Noto Serif TC":"Noto+Serif+TC:wght@400;700","Noto Sans SC":"Noto+Sans+SC:wght@400;700","Noto Sans TC":"Noto+Sans+TC:wght@400;700","LXGW WenKai TC":"LXGW+WenKai+TC:wght@400;700","Ma Shan Zheng":"Ma+Shan+Zheng"},ot=["Noto Serif","Noto Sans","LXGW WenKai","Ma Shan Zheng"],ft={"Noto Serif":{sc:"Noto Serif SC",tc:"Noto Serif TC"},"Noto Sans":{sc:"Noto Sans SC",tc:"Noto Sans TC"},"LXGW WenKai":{sc:"LXGW WenKai TC",tc:"LXGW WenKai TC"},"Ma Shan Zheng":{sc:"Ma Shan Zheng",tc:"Ma Shan Zheng"}};function Et(r,t){const e=ft[r];return e?t==="traditional"?e.tc:e.sc:r}function vt(r){const t=ft[r];return t?t.tc:r}function mt(r){if(K.has(r))return;const t=gt[r];if(!t)return;const e=document.createElement("link");e.rel="stylesheet",e.href=`https://fonts.googleapis.com/css2?family=${t}&display=swap`,document.head.appendChild(e),K.add(r)}function xt(r){const t=vt(r);if(K.has(t)||nt.has(t))return;const e=gt[t];if(!e)return;const s=document.createElement("link");s.rel="stylesheet",s.href=`https://fonts.googleapis.com/css2?family=${e}&display=swap&text=${encodeURIComponent("Aa文字")}`,document.head.appendChild(s),nt.add(t)}function Ct(){mt("Noto Serif SC")}const rt="chinese-reader-settings",x=class x{constructor(){h(this,"settings");this.settings=this.load(),this.syncCSS(),this.syncTheme()}load(){try{const t=localStorage.getItem(rt);if(t){const e=JSON.parse(t);return e.fontFamily&&x.FONT_MIGRATION[e.fontFamily]&&(e.fontFamily=x.FONT_MIGRATION[e.fontFamily]),{...D,...e}}}catch{}return{...D}}save(){localStorage.setItem(rt,JSON.stringify(this.settings))}get(){return{...this.settings}}update(t){const e={...this.settings};Object.assign(this.settings,t),this.save(),this.syncCSS(),this.syncTheme();const s=t.showPinyin!==void 0&&t.showPinyin!==e.showPinyin,i=t.writingMode!==void 0&&t.writingMode!==e.writingMode,n=t.scriptVariant!==void 0&&t.scriptVariant!==e.scriptVariant;document.dispatchEvent(new CustomEvent("settings-changed",{detail:{settings:this.get(),pinyinChanged:s,writingModeChanged:i,scriptVariantChanged:n,prevWritingMode:e.writingMode}}))}reset(){this.update({...D})}syncCSS(){const t=this.settings,e=document.documentElement.style,s=Et(t.fontFamily,t.scriptVariant);mt(s),e.setProperty("--reader-font-family",`"${s}", serif`),e.setProperty("--reader-font-size",`${t.fontSize}px`),e.setProperty("--reader-line-height",`${t.lineHeight}`);const i=t.writingMode==="vertical";e.setProperty("--reader-paragraph-spacing",`${i?t.verticalParagraphSpacing:t.paragraphSpacing}em`),e.setProperty("--reader-margin-h",`${t.marginH}px`),e.setProperty("--reader-margin-v",`${i?t.verticalMarginV:t.marginV}px`),e.setProperty("--reader-writing-mode",t.writingMode==="vertical"?"vertical-rl":"horizontal-tb"),e.setProperty("--reader-max-line-length",`${t.lineLength}em`),e.setProperty("--reader-max-line-length-px",`${t.lineLength*t.fontSize}px`),e.setProperty("--pinyin-size",`${t.pinyinSize}px`)}syncTheme(){const t=this.settings.theme;document.documentElement.setAttribute("data-theme",t);const e=document.querySelector('meta[name="theme-color"]');e&&(e.content=x.themeColors[t]||x.themeColors.light)}};h(x,"FONT_MIGRATION",{"Noto Serif SC":"Noto Serif","Noto Serif TC":"Noto Serif","Noto Sans SC":"Noto Sans","Noto Sans TC":"Noto Sans","LXGW WenKai":"LXGW WenKai","LXGW WenKai TC":"LXGW WenKai"}),h(x,"themeColors",{light:"#faf8f5",dark:"#1a1a1a",sepia:"#f5e6c8"});let G=x;const kt="modulepreload",Tt=function(r){return"/suyue/"+r},at={},et=function(t,e,s){let i=Promise.resolve();if(e&&e.length>0){let o=function(u){return Promise.all(u.map(p=>Promise.resolve(p).then(l=>({status:"fulfilled",value:l}),l=>({status:"rejected",reason:l}))))};document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),c=(a==null?void 0:a.nonce)||(a==null?void 0:a.getAttribute("nonce"));i=o(e.map(u=>{if(u=Tt(u),u in at)return;at[u]=!0;const p=u.endsWith(".css"),l=p?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${l}`))return;const d=document.createElement("link");if(d.rel=p?"stylesheet":kt,p||(d.as="script"),d.crossOrigin="",d.href=u,c&&d.setAttribute("nonce",c),document.head.appendChild(d),p)return new Promise((f,b)=>{d.addEventListener("load",f),d.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${u}`)))})}))}function n(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return i.then(o=>{for(const a of o||[])a.status==="rejected"&&n(a.reason);return t().catch(n)})};let j=null;async function $t(){return j||(j=await et(()=>import("./index-CJlwA9qH.js"),[])),j}async function Mt(r){return(await $t()).pinyin(r,{type:"array"})}let X=null,J=null;async function Pt(){if(X&&J)return;const r=await et(()=>import("./full-IpR1Lmkt.js"),[]);X=r.Converter({from:"tw",to:"cn"}),J=r.Converter({from:"cn",to:"tw"})}const It=[["“","「"],["”","」"],["‘","『"],["’","』"]],At=[["「","“"],["」","”"],["『","‘"],["』","’"]];function ct(r,t){for(const[e,s]of t)r=r.split(e).join(s);return r}async function qt(r,t){return t==="original"?r:(await Pt(),t==="simplified"?ct(X(r),At):ct(J(r),It))}const zt=/[\u4e00-\u9fff\u3400-\u4dbf]/;let z=null;function Ht(){return z||(typeof Intl<"u"&&"Segmenter"in Intl?(z=new Intl.Segmenter("zh",{granularity:"word"}),z):null)}function Vt(r){const t=[];let e="";for(const s of r)zt.test(s)?(e&&(t.push({text:e,isWordLike:!1}),e=""),t.push({text:s,isWordLike:!0})):e+=s;return e&&t.push({text:e,isWordLike:!1}),t}function B(r){const t=Ht();return t?Array.from(t.segment(r),e=>({text:e.segment,isWordLike:e.isWordLike??!1})):Vt(r)}let $=null,A=null,M=null,P=null;function I(r,t){const e=new Map;for(const[s,i]of Object.entries(r))e.set(s,i.map(n=>({traditional:n.t,pinyin:n.p,definitions:n.d,source:t})));return e}async function Nt(){if(!$)return M||(M=(async()=>{const e=await(await fetch("/suyue/dict/cedict.json")).json();$=I(e,"cedict")})(),M)}async function Ot(){if(!A)return P||(P=(async()=>{const e=await(await fetch("/suyue/dict/cvdict.json")).json();A=I(e,"cvdict")})(),P)}async function bt(){await Promise.all([Nt(),Ot()])}let H=null;async function Rt(){return H||(H=(await et(()=>import("./full-IpR1Lmkt.js"),[])).Converter({from:"tw",to:"cn"}),H)}function lt(r,t,e){if(!r)return[];const s=r.get(t);if(s)return s;if(e&&e!==t){const i=r.get(e);if(i)return i}return[]}async function N(r){await bt();const e=(await Rt())(r),s=lt($,r,e),i=lt(A,r,e),n=[...s,...i];return n.length>0?n:null}async function Ft(r){return N(r)}function Wt(){return $!==null||A!==null}let C=null;async function Dt(r){await bt(),C=new Map;for(const t of r)C.set(t,await N(t))}function _(r){return C==null?void 0:C.get(r)}function dt(){C=null}let k=null;function ht(r){k=r.size>0?r:null}function jt(r){return(k==null?void 0:k.get(r))??null}function Bt(r){return(k==null?void 0:k.has(r))??!1}function _t(r){if(Object.values(r).some(e=>e.some(s=>s.s!==void 0))){const e={},s={};for(const[i,n]of Object.entries(r))for(const o of n){const a=o.s==="cvdict"?s:e;a[i]||(a[i]=[]),a[i].push(o)}Object.keys(e).length>0&&($=I(e,"cedict")),Object.keys(s).length>0&&(A=I(s,"cvdict"))}else $=I(r,"cedict");M=Promise.resolve(),P=Promise.resolve()}function Ut(){if(!C)return null;const r={};for(const[t,e]of C)e&&(r[t]=e.map(s=>({t:s.traditional,p:s.pinyin,d:s.definitions,s:s.source})));return Object.keys(r).length>0?r:null}const ut=/[\u4e00-\u9fff\u3400-\u4dbf]/,O=class O{constructor(t){h(this,"el");h(this,"store");h(this,"currentWord",null);h(this,"currentFootnoteKey",null);h(this,"activeAnchor",null);h(this,"history",[]);h(this,"hideTimeout",null);h(this,"showTimeout",null);h(this,"_justDrilledDown",!1);h(this,"pinned",!1);var s;this.store=t,this.el=document.createElement("div"),this.el.className="dict-popup",document.body.appendChild(this.el),this.el.addEventListener("pointerenter",()=>{this.cancelHide()}),this.el.addEventListener("pointerleave",()=>{this.pinned||this.scheduleHide()}),this.el.addEventListener("click",i=>{var u;i.stopPropagation();const n=i.target,o=n.closest(".dict-popup-char-link");if(o){const p=(u=o.textContent)==null?void 0:u.trim();p&&this.drillDown(p);return}if(n.closest(".dict-popup-back")){this.goBack();return}n.closest(".dict-popup-config")&&(this.hide(),document.dispatchEvent(new CustomEvent("open-dict-settings")))}),document.addEventListener("pointerdown",i=>{var o,a;!this.el.classList.contains("visible")||this.el.contains(i.target)||this._justDrilledDown||(a=(o=i.target).closest)!=null&&a.call(o,".word")||this.hide()});const e=()=>{this.el.classList.contains("visible")&&this.hide()};window.addEventListener("scroll",e,{passive:!0}),(s=document.getElementById("reader-container"))==null||s.addEventListener("scroll",e,{passive:!0})}async show(t,e,s,i=!1){if(this.cancelHide(),this.cancelShow(),i&&this.currentWord===t&&this.el.classList.contains("visible")){this.pinned=!0,this.el.classList.add("pinned");return}this.clearActive(),this.currentWord=t,this.currentFootnoteKey=e.dataset.footnoteKey||null,this.activeAnchor=e,e.classList.add("active"),this.history=[],this.pinned=i,this.el.classList.toggle("pinned",i);const n=_(t);if(n!==void 0){this.renderEntries(t,n),this.position(e,s),this.el.classList.add("visible");return}Wt()||(this.el.innerHTML='<div class="dict-popup-body"><div class="dict-popup-loading">Loading dictionary</div></div>',this.position(e,s),this.el.classList.add("visible"));const o=await N(t);this.currentWord===t&&(this.renderEntries(t,o),this.position(e,s),this.el.classList.add("visible"))}renderEntries(t,e){let s="";this.history.length>0&&(s+='<button class="dict-popup-back">← back</button>'),s+=this.buildContent(t,e),this.el.innerHTML=`<div class="dict-popup-body">${s}</div>`}buildContent(t,e){const s=[...t].filter(d=>ut.test(d)),i=jt(this.currentFootnoteKey||t),n=this.store.get(),o={};if(e)for(const d of e)(d.source==="cedict"?n.showCedict:n.showCvdict)&&(o[d.source]||(o[d.source]=[]),o[d.source].push(d));const a=n.dictOrder.filter(d=>{var f;return((f=o[d])==null?void 0:f.length)>0}),c=a.length>0,p=(i?1:0)+a.length>1;let l=`<div class="dict-popup-header"><span class="dict-popup-word">${this.buildWordChars(t,s)}</span><button class="dict-popup-config" aria-label="Configure dictionaries" title="Configure dictionaries">⚙</button></div>`;i&&(l+='<div class="dict-popup-source">',p&&(l+='<div class="dict-popup-source-label">Note</div>'),l+=`<div class="dict-popup-footnote-text">${this.renderFootnote(i)}</div>`,l+="</div>");for(const d of a)l+='<div class="dict-popup-source">',p&&(l+=`<div class="dict-popup-source-label">${O.DICT_LABELS[d]||d}</div>`),l+=this.buildDictHtml(t,o[d]),l+="</div>";return!i&&!c&&(l+='<div class="dict-popup-notfound">No definition found</div>'),l}buildDictHtml(t,e){let s="";const i=e[0],n=i.traditional!==t;if(e.length===1){s+=`<span class="dict-popup-pinyin">${this.esc(i.pinyin)}</span>`,n&&(s+=`<span class="dict-popup-trad">${this.esc(i.traditional)}</span>`),s+='<ol class="dict-popup-defs">';for(const o of i.definitions)s+=`<li>${this.esc(o)}</li>`;s+="</ol>"}else for(const o of e){s+='<div class="dict-popup-entry">',s+=`<div class="dict-popup-entry-pinyin">${this.esc(o.pinyin)}`,o.traditional!==t&&(s+=` <span class="dict-popup-trad">${this.esc(o.traditional)}</span>`),s+="</div>",s+='<ol class="dict-popup-defs">';for(const a of o.definitions)s+=`<li>${this.esc(a)}</li>`;s+="</ol></div>"}return s}buildWordChars(t,e){if(e.length<=1)return this.esc(t);let s="";for(const i of[...t])ut.test(i)?s+=`<span class="dict-popup-char-link">${this.esc(i)}</span>`:s+=this.esc(i);return s}async drillDown(t){this.cancelHide(),this.currentWord&&this.history.push(this.currentWord),this.currentWord=t,this.currentFootnoteKey=null,this._justDrilledDown=!0,requestAnimationFrame(()=>{this._justDrilledDown=!1});const e=_(t);let s;e!==void 0?s=e:s=await Ft(t),this.currentWord===t&&this.renderEntries(t,s)}async goBack(){this.cancelHide();const t=this.history.pop();if(!t)return;this.currentWord=t,this._justDrilledDown=!0,requestAnimationFrame(()=>{this._justDrilledDown=!1});const e=_(t);let s;e!==void 0?s=e:s=await N(t),this.currentWord===t&&this.renderEntries(t,s)}position(t,e){const s=t.getBoundingClientRect(),i=8;this.el.style.left="0",this.el.style.top="0";const n=this.el.getBoundingClientRect();let o,a,c;e?(o=s.left-n.width-i,a=s.top,c="popup-left",o<i&&(o=s.right+i,c="popup-right")):(o=s.left+s.width/2-n.width/2,a=s.top-n.height-i,c="popup-above",a<i&&(a=s.bottom+i,c="popup-below")),o=Math.max(i,Math.min(o,window.innerWidth-n.width-i)),a=Math.max(i,Math.min(a,window.innerHeight-n.height-i)),this.el.style.left=`${o}px`,this.el.style.top=`${a}px`,this.el.classList.remove("popup-above","popup-below","popup-left","popup-right"),this.el.classList.add(c)}scheduleHide(){this.cancelHide(),this.hideTimeout=setTimeout(()=>this.hide(),200)}cancelHide(){this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=null)}cancelShow(){this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=null)}scheduleShow(t,e,s){this.cancelShow(),this.clearActive(),this.activeAnchor=e,e.classList.add("active"),this.showTimeout=setTimeout(()=>this.show(t,e,s),50)}hide(){this.cancelHide(),this.cancelShow(),this.clearActive(),this.el.classList.remove("visible","pinned"),this.currentWord=null,this.currentFootnoteKey=null,this.history=[],this.pinned=!1}clearActive(){this.activeAnchor&&(this.activeAnchor.classList.remove("active"),this.activeAnchor=null)}get isVisible(){return this.el.classList.contains("visible")}get isPinned(){return this.pinned}renderFootnote(t){return t.split(`

`).map(e=>`<p>${this.esc(e).replace(/\n/g,"<br>")}</p>`).join("")}esc(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}};h(O,"DICT_LABELS",{cedict:"CC-CEDICT",cvdict:"CVDICT"});let Z=O;const U=/[\u4e00-\u9fff\u3400-\u4dbf]/;function Kt(r,t){if(t.length===0)return B(r);const e=[...r],s=[...t].sort((o,a)=>o.start-a.start),i=[];let n=0;for(const o of s){if(o.start>n){const c=e.slice(n,o.start).join("");i.push(...B(c))}const a=e.slice(o.start,o.end).join("");i.push({text:a,isWordLike:!0}),n=o.end}if(n<e.length){const o=e.slice(n).join("");i.push(...B(o))}return i}class Gt{constructor(t,e){h(this,"container");h(this,"store");h(this,"paragraphs",[]);h(this,"popup");h(this,"renderGeneration",0);h(this,"rawText","");h(this,"textTitle","");h(this,"storedSegments",new Map);h(this,"precomputedSegments",null);this.container=t,this.store=e,this.popup=new Z(e),document.addEventListener("settings-changed",s=>{const i=s.detail;if((i.pinyinChanged||i.scriptVariantChanged)&&this.render(),i.writingModeChanged){const n=this.getReadingProgress(i.prevWritingMode);this.updateAttributes(),requestAnimationFrame(()=>this.setReadingProgress(n))}else this.updateAttributes()}),this.setupInteraction()}setupInteraction(){this.container.addEventListener("pointerout",t=>{t.target.closest(".word")&&t.pointerType==="mouse"&&(this.popup.isPinned||this.popup.scheduleHide())}),this.container.addEventListener("click",t=>{const e=t.target.closest(".word");if(!e)return;const s=e.dataset.word;if(!s)return;const i=this.store.get().writingMode==="vertical";this.popup.show(s,e,i,!0)})}setParagraphs(t,e,s){this.paragraphs=t,this.rawText=e||"",this.textTitle=s||"",this.precomputedSegments=null,this.storedSegments.clear(),dt(),this.render(),this.scrollToBeginning()}loadBundle(t,e){if(this.paragraphs=t,this.rawText=e.text,this.textTitle=e.title,e.segments){this.precomputedSegments=new Map;for(const[s,i]of Object.entries(e.segments))this.precomputedSegments.set(Number(s),i.map(n=>n.map(o=>({text:o.t,isWordLike:o.w}))))}e.dictionary&&_t(e.dictionary),this.storedSegments.clear(),dt(),this.render(),this.scrollToBeginning()}exportCRDR(){const t={};for(const[s,i]of this.storedSegments)t[s]=i.map(n=>n.map(o=>({t:o.text,w:o.isWordLike})));const e=Ut();return{version:1,title:this.textTitle,text:this.rawText,segments:Object.keys(t).length>0?t:void 0,dictionary:e||void 0}}scrollToBeginning(){const t=this.store.get();if(window.scrollTo(0,0),t.writingMode==="vertical"){const e=this.container.parentElement;e&&(e.scrollLeft=0)}}getReadingProgress(t){if(t==="vertical"){const s=this.container.parentElement;if(!s)return 0;const i=s.scrollWidth-s.clientWidth;return i<=0?0:-s.scrollLeft/i}const e=document.documentElement.scrollHeight-window.innerHeight;return e<=0?0:window.scrollY/e}setReadingProgress(t){if(this.store.get().writingMode==="vertical"){const s=this.container.parentElement;if(!s)return;requestAnimationFrame(()=>{const i=s.scrollWidth-s.clientWidth;s.scrollLeft=-(t*i)})}else{const s=document.documentElement.scrollHeight-window.innerHeight;window.scrollTo(0,t*s)}}updateAttributes(){const t=this.store.get();this.container.setAttribute("data-pinyin-position",t.pinyinPosition),this.container.classList.toggle("show-numbering",t.showNumbering),this.container.classList.toggle("vertical-mode",t.writingMode==="vertical")}async render(){const t=this.store.get();this.updateAttributes();const e=++this.renderGeneration;if(this.paragraphs.length===0){this.container.innerHTML='<p class="reader-placeholder">Load a text to begin reading.</p>';return}this.renderPlain(t.scriptVariant!=="original"?t.scriptVariant:null);const s=await this.segmentAndRender(e);this.renderGeneration===e&&s.size>0&&await Dt([...s])}renderPlain(t){const e=[];for(let s=0;s<this.paragraphs.length;s++){const i=this.paragraphs[s],n=i.text.split(`
`).map(o=>this.escapeHtml(o)).join("<br>");if(i.type==="list-bullet"||i.type==="list-ordered"){const o=i.type==="list-bullet"?"ul":"ol",a=this.paragraphs[s-1],c=this.paragraphs[s+1],u=(a==null?void 0:a.type)!==i.type||(a==null?void 0:a.index)!==i.index,p=(c==null?void 0:c.type)!==i.type||(c==null?void 0:c.index)!==i.index;let l="";u&&(l+=`<${o} data-list-index="${i.index}">`),l+=`<li data-index="${i.index}">${n}</li>`,p&&(l+=`</${o}>`),e.push(l)}else{const o=i.type==="heading2"?"h2":i.type==="heading3"?"h3":"p";e.push(`<${o} data-index="${i.index}">${n}</${o}>`)}}this.container.innerHTML=e.join(""),t&&document.dispatchEvent(new CustomEvent("segmentation-progress",{detail:{progress:0}}))}async segmentAndRender(t){var a;const e=this.store.get(),s=new Set,i=this.container.querySelectorAll("[data-index]"),n=this.paragraphs.length,o=20;for(let c=0;c<n;c+=o){if(this.renderGeneration!==t)return s;const u=Math.min(c+o,n);for(let l=c;l<u;l++){const d=this.paragraphs[l];let f=d.text;e.scriptVariant!=="original"&&(f=await qt(f,e.scriptVariant));const b=d.formatting||[],v=d.footnoteRanges||[],y=f.split(`
`),S=[];let g=0;const w=[];for(const L of y){const E=[...L].length,F=g+E,wt=b.filter(m=>m.start<F&&m.end>g).map(m=>({start:Math.max(m.start-g,0),end:Math.min(m.end-g,E),type:m.type,color:m.color})),it=v.filter(m=>m.start<F&&m.end>g).map(m=>({start:Math.max(m.start-g,0),end:Math.min(m.end-g,E),key:m.key}));let q;const W=(a=this.precomputedSegments)==null?void 0:a.get(d.index);W&&W[S.length]?q=W[S.length]:q=Kt(L,it),w.push(q),S.push(await this.renderLine(L,q,e.showPinyin,s,wt,it)),g=F+1}this.storedSegments.set(d.index,w);const T=i[l];T&&(T.innerHTML=S.join("<br>"))}const p=Math.min(u/n,1);document.dispatchEvent(new CustomEvent("segmentation-progress",{detail:{progress:p}})),u<n&&await new Promise(l=>setTimeout(l,0))}return s}async renderLine(t,e,s,i,n,o){let a=null;s&&(a=await Mt(t));let c="",u=0,p=0;const l=new Set;for(const d of e){const f=[...d.text],b=f.length,v=p+b,y=f.some(g=>U.test(g));for(const g of l)g.end<=p&&(c+=this.fmtCloseTag(g),l.delete(g));if(n.length>0){for(const g of n)!l.has(g)&&g.start<=p&&g.end>p&&(c+=this.fmtOpenTag(g),l.add(g));for(const g of n)!l.has(g)&&g.start>=p&&g.start<v&&(c+=this.fmtOpenTag(g),l.add(g))}const S=o.find(g=>p<g.end&&v>g.start);if(d.isWordLike&&y){i==null||i.add(d.text);const g=!!S||Bt(d.text);let w="";for(const L of f){if(s&&a&&U.test(L)){const E=a[u]||"";w+=`<ruby>${this.escapeHtml(L)}<rp>(</rp><rt>${E}</rt><rp>)</rp></ruby>`}else w+=this.escapeHtml(L);u++}const T=S?` data-footnote-key="${this.escapeAttr(S.key)}"`:"";c+=`<span class="word${g?" has-footnote":""}" data-word="${this.escapeAttr(d.text)}"${T}>${w}</span>`}else for(const g of f){if(s&&a&&U.test(g)){const w=a[u]||"";c+=`<ruby>${this.escapeHtml(g)}<rp>(</rp><rt>${w}</rt><rp>)</rp></ruby>`}else c+=this.escapeHtml(g);u++}p=v}for(const d of l)c+=this.fmtCloseTag(d);return c}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}escapeAttr(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}fmtOpenTag(t){return t.type==="bold"?"<strong>":t.type==="underline"?"<u>":t.type==="highlight"&&t.color?`<span class="hl-${t.color}">`:""}fmtCloseTag(t){return t.type==="bold"?"</strong>":t.type==="underline"?"</u>":t.type==="highlight"?"</span>":""}}class Xt{constructor(t,e){h(this,"onLoad");h(this,"onLoadBundle");h(this,"manifest",[]);this.onLoad=t,this.onLoadBundle=e||null}async loadManifest(){try{const s=await(await fetch("/suyue/texts/manifest.json")).json();this.manifest=Object.entries(s).map(([i,n])=>({id:i,title:n}))}catch{this.manifest=[]}return this.manifest}getManifest(){return this.manifest}async loadBuiltIn(t){const e=this.manifest.find(o=>o.id===t);if(!e)return;const n=await(await fetch(`/suyue/texts/${t}-${e.title}.txt`)).text();this.onLoad(n,e.title)}setupFileInput(t){t.addEventListener("change",()=>{var i;const e=(i=t.files)==null?void 0:i[0];if(!e)return;const s=new FileReader;s.onload=()=>{const n=s.result,o=e.name;o.endsWith(".crdr")?this.handleCRDR(n,o):this.onLoad(n,o.replace(/\.txt$/,""))},s.readAsText(e),t.value=""})}loadFromPaste(t){this.onLoad(t,"Pasted Text")}handleCRDR(t,e){try{const s=JSON.parse(t);if(s.version!==1||!s.text){this.onLoad(t,e.replace(/\.crdr$/,""));return}this.onLoadBundle?this.onLoadBundle(s):this.onLoad(s.text,s.title||e.replace(/\.crdr$/,""))}catch{this.onLoad(t,e.replace(/\.crdr$/,""))}}}function Jt(){return`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>`}function Zt(){return`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`}class Yt{constructor(t,e,s){h(this,"nav");h(this,"lastScroll",0);h(this,"ticking",!1);h(this,"scrollTarget",window);h(this,"boundScrollHandler");h(this,"store");h(this,"scriptSeg");this.store=s,this.nav=document.createElement("nav"),this.nav.className="navbar",this.nav.innerHTML=`
      <div class="navbar-inner">
        <button class="navbar-btn navbar-btn-icon" id="navbar-open" aria-label="Open">
          ${Jt()}
        </button>
        <div class="navbar-script-seg">
          <button data-variant="original" class="nseg-btn">原</button>
          <button data-variant="simplified" class="nseg-btn">简</button>
          <button data-variant="traditional" class="nseg-btn">繁</button>
        </div>
        <button class="navbar-btn navbar-btn-icon" id="navbar-settings" aria-label="Settings">
          ${Zt()}
        </button>
      </div>
      <div class="navbar-progress">
        <div class="navbar-progress-bar"></div>
      </div>
    `,document.body.appendChild(this.nav),this.scriptSeg=this.nav.querySelector(".navbar-script-seg"),this.syncScriptActive(s.get().scriptVariant),this.nav.querySelector("#navbar-open").addEventListener("click",t),this.nav.querySelector("#navbar-settings").addEventListener("click",e),this.scriptSeg.addEventListener("click",o=>{const a=o.target.closest("[data-variant]");a&&this.store.update({scriptVariant:a.dataset.variant})}),s.get().writingMode==="vertical"&&this.nav.classList.add("navbar-vertical"),this.boundScrollHandler=this.onScroll.bind(this),this.attachScrollListener();const i=this.nav.querySelector(".navbar-progress-bar"),n=this.nav.querySelector(".navbar-progress");document.addEventListener("segmentation-progress",o=>{const{progress:a}=o.detail;i.style.transform=`scaleX(${a})`,a>=1?setTimeout(()=>{n.classList.add("navbar-progress-done")},300):n.classList.remove("navbar-progress-done")}),document.addEventListener("settings-changed",o=>{this.attachScrollListener();const a=o.detail;a.scriptVariantChanged&&this.syncScriptActive(a.settings.scriptVariant),a.writingModeChanged&&this.nav.classList.toggle("navbar-vertical",a.settings.writingMode==="vertical")})}syncScriptActive(t){this.scriptSeg.querySelectorAll(".nseg-btn").forEach(e=>{e.classList.toggle("active",e.dataset.variant===t)})}setNavbarOffset(t){document.documentElement.style.setProperty("--navbar-offset",t?"48px":"0px")}attachScrollListener(){if(this.scrollTarget.removeEventListener("scroll",this.boundScrollHandler),document.documentElement.style.getPropertyValue("--reader-writing-mode")==="vertical-rl"){const e=document.getElementById("reader-container");this.scrollTarget=e||window}else this.scrollTarget=window;this.lastScroll=this.getScrollPosition(),this.scrollTarget.addEventListener("scroll",this.boundScrollHandler,{passive:!0})}getScrollPosition(){return this.scrollTarget===window?window.scrollY:-this.scrollTarget.scrollLeft}onScroll(){this.ticking||(this.ticking=!0,requestAnimationFrame(()=>{const t=this.getScrollPosition(),e=t-this.lastScroll;t<50?(this.nav.classList.remove("navbar-scroll-hidden"),this.setNavbarOffset(!0)):e>5?(this.nav.classList.add("navbar-scroll-hidden"),this.setNavbarOffset(!1)):e<-5&&(this.nav.classList.remove("navbar-scroll-hidden"),this.setNavbarOffset(!0)),this.lastScroll=t,this.ticking=!1}))}}class Qt{constructor(t,e){h(this,"overlay",null);h(this,"textLoader");h(this,"fileInput");h(this,"onExport",null);this.textLoader=t,this.onExport=e||null,this.fileInput=document.createElement("input"),this.fileInput.type="file",this.fileInput.accept=".txt,.text,.crdr",this.fileInput.hidden=!0,document.body.appendChild(this.fileInput),this.textLoader.setupFileInput(this.fileInput),this.fileInput.addEventListener("change",()=>{var s;(s=this.fileInput.files)!=null&&s.length&&this.close()})}toggle(){this.overlay?this.close():this.open()}open(){if(this.overlay)return;document.dispatchEvent(new CustomEvent("sheet-opening",{detail:"open"})),this.overlay=document.createElement("div"),this.overlay.className="sheet-overlay";const t=document.createElement("div");t.className="sheet-panel",this.positionPanel(t),this.overlay.appendChild(t),document.body.appendChild(this.overlay),this.buildMainView(t),t.getBoundingClientRect(),requestAnimationFrame(()=>{var e;return(e=this.overlay)==null?void 0:e.classList.add("open")}),this.overlay.addEventListener("touchstart",e=>{e.target===this.overlay&&(e.preventDefault(),this.close())},{passive:!1}),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.close()})}close(){if(!this.overlay)return;const t=this.overlay;t.classList.remove("open");const e=t.querySelector(".sheet-panel");e&&e.addEventListener("transitionend",()=>t.remove(),{once:!0}),setTimeout(()=>{t.parentNode&&t.remove()},250),this.overlay=null,document.dispatchEvent(new CustomEvent("sheet-closed"))}buildMainView(t){t.innerHTML=`
      <div class="sheet-header">
        <span class="sheet-nav-back" style="visibility:hidden">‹</span>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>
      <div class="sheet-group">
        <button class="sheet-group-row" data-action="builtin">
          <span>Choose from Library</span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="file">
          <span>Upload File</span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="paste">
          <span>Paste Text</span>
          <span class="row-chevron">›</span>
        </button>
      </div>
      <div class="sheet-group" style="margin-top: 12px">
        <button class="sheet-group-row" data-action="export">
          <span>Export as .crdr</span>
          <span class="row-chevron">↓</span>
        </button>
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector('[data-action="builtin"]').addEventListener("click",()=>{this.buildLibraryView(t)}),t.querySelector('[data-action="file"]').addEventListener("click",()=>{this.close(),this.fileInput.click()}),t.querySelector('[data-action="paste"]').addEventListener("click",()=>{this.close(),this.showPasteModal()}),t.querySelector('[data-action="export"]').addEventListener("click",()=>{this.onExport&&this.onExport(),this.close()})}async buildLibraryView(t){t.innerHTML=`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="lib-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>
      <div class="sheet-group" id="lib-list">
        <div class="sheet-group-row static" style="justify-content:center;color:var(--fg-muted)">Loading…</div>
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector("#lib-back").addEventListener("click",()=>{this.buildMainView(t)});const e=await this.textLoader.loadManifest(),s=t.querySelector("#lib-list");s.innerHTML=e.map((i,n)=>`${n>0?'<div class="sheet-group-divider"></div>':""}<button class="sheet-group-row" data-id="${i.id}"><span>${i.title}</span></button>`).join(""),s.addEventListener("click",i=>{const n=i.target.closest("[data-id]");n&&(this.textLoader.loadBuiltIn(n.dataset.id),this.close())})}positionPanel(t){const e=document.getElementById("navbar-open"),s=document.querySelector(".navbar"),i=s==null?void 0:s.classList.contains("navbar-vertical");if(e){const n=e.getBoundingClientRect(),o=8;i?(t.style.right=`${window.innerWidth-n.left+o}px`,t.style.top=`${n.top}px`,t.style.maxHeight=`${window.innerHeight-n.top-o}px`,n.top>window.innerHeight/2&&(t.style.top="",t.style.bottom=`${window.innerHeight-n.bottom}px`,t.style.maxHeight=`${n.bottom-o}px`)):(t.style.top=`${n.bottom+o}px`,t.style.left=`${n.left}px`,t.style.maxHeight=`${window.innerHeight-n.bottom-o*2}px`)}}showPasteModal(){const t=document.createElement("div");t.className="modal-overlay",t.innerHTML=`
      <div class="modal">
        <h3>Paste Chinese Text</h3>
        <textarea id="paste-area" rows="12" placeholder="Paste your text here..."></textarea>
        <div class="modal-actions">
          <button class="sheet-action-btn" id="modal-cancel">Cancel</button>
          <button class="sheet-action-btn primary" id="modal-load">Load</button>
        </div>
      </div>
    `,document.body.appendChild(t);const e=t.querySelector("#paste-area");e.focus();const s=()=>{t.remove(),document.dispatchEvent(new CustomEvent("sheet-closed"))};t.querySelector("#modal-cancel").addEventListener("click",s),t.addEventListener("touchstart",i=>{i.target===t&&(i.preventDefault(),s())},{passive:!1}),t.addEventListener("click",i=>{i.target===t&&s()}),t.querySelector("#modal-load").addEventListener("click",()=>{const i=e.value.trim();i&&this.textLoader.loadFromPaste(i),s()})}}const R=class R{constructor(t){h(this,"overlay",null);h(this,"store");h(this,"view","main");this.store=t}toggle(){this.overlay?this.close():this.open()}open(){if(this.overlay)return;document.dispatchEvent(new CustomEvent("sheet-opening",{detail:"settings"})),this.view="main",this.overlay=document.createElement("div"),this.overlay.className="sheet-overlay";const t=document.createElement("div");t.className="sheet-panel",this.positionPanel(t),this.overlay.appendChild(t),document.body.appendChild(this.overlay),this.buildMainView(t),this.syncUI(t),t.getBoundingClientRect(),requestAnimationFrame(()=>{var s;return(s=this.overlay)==null?void 0:s.classList.add("open")}),this.overlay.addEventListener("touchstart",s=>{s.target===this.overlay&&(s.preventDefault(),this.close())},{passive:!1}),this.overlay.addEventListener("click",s=>{s.target===this.overlay&&this.close()});const e=()=>{if(this.overlay){const s=this.overlay.querySelector(".sheet-panel");s&&this.syncUI(s)}};document.addEventListener("settings-changed",e),this.overlay._cleanup=()=>document.removeEventListener("settings-changed",e)}close(){var s;if(!this.overlay)return;const t=this.overlay;(s=t._cleanup)==null||s.call(t),t.classList.remove("open");const e=t.querySelector(".sheet-panel");e&&e.addEventListener("transitionend",()=>t.remove(),{once:!0}),setTimeout(()=>{t.parentNode&&t.remove()},250),this.overlay=null,document.dispatchEvent(new CustomEvent("sheet-closed"))}positionPanel(t){const e=document.getElementById("navbar-settings"),s=document.querySelector(".navbar"),i=s==null?void 0:s.classList.contains("navbar-vertical");if(e){const n=e.getBoundingClientRect(),o=8;i?(t.style.right=`${window.innerWidth-n.left+o}px`,t.style.top=`${n.top}px`,t.style.maxHeight=`${window.innerHeight-n.top-o}px`,n.top>window.innerHeight/2&&(t.style.top="",t.style.bottom=`${window.innerHeight-n.bottom}px`,t.style.maxHeight=`${n.bottom-o}px`)):(t.style.top=`${n.bottom+o}px`,t.style.right=`${window.innerWidth-n.right}px`,t.style.maxHeight=`${window.innerHeight-n.bottom-o*2}px`)}}buildMainView(t){this.view="main",t.innerHTML=`
      <div class="sheet-header">
        <span class="sheet-nav-back" style="visibility:hidden">‹</span>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Font</label>
          <div class="font-size-controls">
            <button class="pinyin-opts-btn" id="s-font-opts" aria-label="Font Options">⋯</button>
            <button class="size-btn" id="s-fontsize-down">A</button>
            <span id="s-fontsize-val" class="size-value"></span>
            <button class="size-btn size-btn-large" id="s-fontsize-up">A</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Theme</label>
          <div class="theme-swatches" id="s-theme-group">
            <button data-theme="light" class="theme-swatch" style="background:#faf8f5;border-color:#ccc" aria-label="Light">
              <span class="swatch-char" style="color:#1a1a1a">文</span>
            </button>
            <button data-theme="dark" class="theme-swatch" style="background:#1a1a1a;border-color:#444" aria-label="Dark">
              <span class="swatch-char" style="color:#e0ddd8">文</span>
            </button>
            <button data-theme="sepia" class="theme-swatch" style="background:#f5e6c8;border-color:#d4c4a8" aria-label="Sepia">
              <span class="swatch-char" style="color:#5b4636">文</span>
            </button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Layout</label>
          <div class="segmented-control" id="s-mode-group">
            <button data-mode="horizontal" class="seg-btn">Horizontal</button>
            <button data-mode="vertical" class="seg-btn">Vertical</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static toggle-row">
          <label>Pinyin</label>
          <div class="pinyin-toggle-group">
            <button class="pinyin-opts-btn" id="s-pinyin-opts" aria-label="Pinyin Options">⋯</button>
            <label class="ios-switch">
              <input type="checkbox" id="s-pinyin" />
              <span class="ios-switch-track"></span>
            </label>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" id="s-dictionaries">
          <span>Dictionaries</span>
          <span class="row-chevron">›</span>
        </button>
      </div>

      <div class="sheet-group">
        <button class="sheet-group-row" id="s-more">
          <span>More Options</span>
          <span class="row-chevron">›</span>
        </button>
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector("#s-fontsize-down").addEventListener("click",()=>{const e=this.store.get();this.store.update({fontSize:Math.max(14,e.fontSize-2)})}),t.querySelector("#s-fontsize-up").addEventListener("click",()=>{const e=this.store.get();this.store.update({fontSize:Math.min(48,e.fontSize+2)})}),t.querySelector("#s-font-opts").addEventListener("click",()=>{this.buildFontView(t),this.syncUI(t)}),t.querySelector("#s-theme-group").addEventListener("click",e=>{const s=e.target.closest("[data-theme]");s&&this.store.update({theme:s.dataset.theme})}),t.querySelector("#s-mode-group").addEventListener("click",e=>{const s=e.target.closest("[data-mode]");s&&this.store.update({writingMode:s.dataset.mode})}),t.querySelector("#s-pinyin").addEventListener("change",e=>{this.store.update({showPinyin:e.target.checked})}),t.querySelector("#s-pinyin-opts").addEventListener("click",()=>{this.buildPinyinView(t),this.syncUI(t)}),t.querySelector("#s-dictionaries").addEventListener("click",()=>{this.buildDictionariesView(t),this.syncUI(t)}),t.querySelector("#s-more").addEventListener("click",()=>{this.buildAdvancedView(t),this.syncUI(t)})}buildAdvancedView(t){this.view="advanced",t.innerHTML=`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Line Height</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-lineheight-down">−</button>
            <span id="s-lineheight-val" class="size-value"></span>
            <button class="size-btn" id="s-lineheight-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Paragraph Spacing</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-paraspacing-down">−</button>
            <span id="s-paraspacing-val" class="size-value"></span>
            <button class="size-btn" id="s-paraspacing-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Line Length</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-linelen-down">−</button>
            <span id="s-linelen-val" class="size-value"></span>
            <button class="size-btn" id="s-linelen-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>V Margin</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-marginv-down">−</button>
            <span id="s-marginv-val" class="size-value"></span>
            <button class="size-btn" id="s-marginv-up">+</button>
          </div>
        </div>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static toggle-row">
          <label>Paragraph Numbers</label>
          <label class="ios-switch">
            <input type="checkbox" id="s-numbering" />
            <span class="ios-switch-track"></span>
          </label>
        </div>
      </div>

      <div class="sheet-group">
        <button class="sheet-group-row reset-row" id="s-reset">
          <span>Reset to Defaults</span>
        </button>
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector("#s-back").addEventListener("click",()=>{this.buildMainView(t),this.syncUI(t)});const e=this.store.get().writingMode==="vertical";this.bindStepper(t,"s-lineheight",1.2,3.5,.1,"lineHeight"),this.bindStepper(t,"s-paraspacing",0,4,.25,e?"verticalParagraphSpacing":"paragraphSpacing"),this.bindStepper(t,"s-linelen",20,60,5,"lineLength"),this.bindStepper(t,"s-marginv",0,100,4,e?"verticalMarginV":"marginV"),t.querySelector("#s-numbering").addEventListener("change",s=>{this.store.update({showNumbering:s.target.checked})}),t.querySelector("#s-reset").addEventListener("click",()=>{this.store.reset()})}buildFontView(t){this.view="font",t.innerHTML=`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Font Size</label>
          <div class="font-size-controls">
            <button class="size-btn" id="s-fontsize-down">A</button>
            <span id="s-fontsize-val" class="size-value"></span>
            <button class="size-btn size-btn-large" id="s-fontsize-up">A</button>
          </div>
        </div>
      </div>

      <div class="font-scroll-row" id="s-font-list">
        ${ot.map(e=>`<button class="font-card" data-font="${e}"><span class="font-card-preview" style="font-family:'${vt(e)}',serif">文字</span><span class="font-card-name">${e}</span></button>`).join("")}
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector("#s-back").addEventListener("click",()=>{this.buildMainView(t),this.syncUI(t)}),t.querySelector("#s-fontsize-down").addEventListener("click",()=>{const e=this.store.get();this.store.update({fontSize:Math.max(14,e.fontSize-2)})}),t.querySelector("#s-fontsize-up").addEventListener("click",()=>{const e=this.store.get();this.store.update({fontSize:Math.min(48,e.fontSize+2)})}),t.querySelector("#s-font-list").addEventListener("click",e=>{const s=e.target.closest("[data-font]");if(s){const i=s.dataset.font;this.store.update({fontFamily:i})}}),ot.forEach(e=>xt(e))}buildPinyinView(t){this.view="pinyin",t.innerHTML=`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Pinyin Position</label>
          <div class="segmented-control" id="s-pypos-group">
            <button data-pos="over" class="seg-btn">Above</button>
            <button data-pos="under" class="seg-btn">Below</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Pinyin Size</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-pysize-down">−</button>
            <span id="s-pysize-val" class="size-value"></span>
            <button class="size-btn" id="s-pysize-up">+</button>
          </div>
        </div>
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector("#s-back").addEventListener("click",()=>{this.buildMainView(t),this.syncUI(t)}),t.querySelector("#s-pypos-group").addEventListener("click",e=>{const s=e.target.closest("[data-pos]");s&&this.store.update({pinyinPosition:s.dataset.pos})}),this.bindStepper(t,"s-pysize",8,20,1,"pinyinSize")}buildDictionariesView(t){this.view="dictionaries";const s=this.store.get().dictOrder;t.innerHTML=`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group" id="s-dict-list">
        ${s.map((i,n)=>this.buildDictRow(i,n,s.length)).join("")}
      </div>
    `,t.querySelector("#sheet-close").addEventListener("click",()=>this.close()),t.querySelector("#s-back").addEventListener("click",()=>{this.buildMainView(t),this.syncUI(t)}),this.bindDictListEvents(t)}buildDictRow(t,e,s){const i=R.DICT_LABELS[t]||{name:t,desc:""},n=t==="cedict"?"showCedict":"showCvdict",o=this.store.get()[n]?"checked":"";let a="";return e>0&&(a+='<div class="sheet-group-divider"></div>'),a+=`<div class="sheet-group-row static dict-row" data-dict="${t}">
      <div class="dict-row-reorder">
        <button class="dict-reorder-btn" data-dir="up" ${e===0?"disabled":""} aria-label="Move up">▲</button>
        <button class="dict-reorder-btn" data-dir="down" ${e===s-1?"disabled":""} aria-label="Move down">▼</button>
      </div>
      <div class="dict-row-info">
        <span class="dict-row-name">${i.name}</span>
        <span class="dict-row-desc">${i.desc}</span>
      </div>
      <label class="ios-switch">
        <input type="checkbox" data-dict-toggle="${t}" ${o} />
        <span class="ios-switch-track"></span>
      </label>
    </div>`,a}bindDictListEvents(t){const e=t.querySelector("#s-dict-list");e.addEventListener("change",s=>{const i=s.target,n=i.dataset.dictToggle;n&&(n==="cedict"&&this.store.update({showCedict:i.checked}),n==="cvdict"&&this.store.update({showCvdict:i.checked}))}),e.addEventListener("click",s=>{const i=s.target.closest(".dict-reorder-btn");if(!i)return;const o=i.closest(".dict-row").dataset.dict,a=i.dataset.dir,c=[...this.store.get().dictOrder],u=c.indexOf(o);if(u===-1)return;const p=a==="up"?u-1:u+1;p<0||p>=c.length||([c[u],c[p]]=[c[p],c[u]],this.store.update({dictOrder:c}),this.buildDictionariesView(t),this.syncUI(t))})}openDictionaries(){var e;this.overlay||this.open();const t=(e=this.overlay)==null?void 0:e.querySelector(".sheet-panel");t&&(this.buildDictionariesView(t),this.syncUI(t))}bindStepper(t,e,s,i,n,o){t.querySelector(`#${e}-down`).addEventListener("click",()=>{const a=this.store.get()[o];this.store.update({[o]:Math.max(s,Math.round((a-n)*100)/100)})}),t.querySelector(`#${e}-up`).addEventListener("click",()=>{const a=this.store.get()[o];this.store.update({[o]:Math.min(i,Math.round((a+n)*100)/100)})})}syncUI(t){const e=this.store.get();if(this.view==="main"){const s=t.querySelector("#s-fontsize-val");s&&(s.textContent=`${e.fontSize}px`),t.querySelectorAll("#s-theme-group .theme-swatch").forEach(o=>{o.classList.toggle("active",o.dataset.theme===e.theme)}),t.querySelectorAll("#s-mode-group .seg-btn").forEach(o=>{o.classList.toggle("active",o.dataset.mode===e.writingMode)});const i=t.querySelector("#s-pinyin");i&&(i.checked=e.showPinyin);const n=t.querySelector("#s-pinyin-opts");n&&(n.style.display=e.showPinyin?"":"none")}else if(this.view==="advanced"){const s=e.writingMode==="vertical";this.setStepperVal(t,"s-lineheight",`${e.lineHeight}`),this.setStepperVal(t,"s-paraspacing",`${s?e.verticalParagraphSpacing:e.paragraphSpacing}em`),this.setStepperVal(t,"s-linelen",`${e.lineLength}字`),this.setStepperVal(t,"s-marginv",`${s?e.verticalMarginV:e.marginV}px`);const i=t.querySelector("#s-numbering");i&&(i.checked=e.showNumbering)}else if(this.view==="font"){const s=t.querySelector("#s-fontsize-val");s&&(s.textContent=`${e.fontSize}px`),t.querySelectorAll("#s-font-list .font-card").forEach(i=>{i.classList.toggle("active",i.dataset.font===e.fontFamily)})}else if(this.view==="dictionaries"){const s=t.querySelector('[data-dict-toggle="cedict"]');s&&(s.checked=e.showCedict);const i=t.querySelector('[data-dict-toggle="cvdict"]');i&&(i.checked=e.showCvdict)}else this.view==="pinyin"&&(t.querySelectorAll("#s-pypos-group .seg-btn").forEach(s=>{s.classList.toggle("active",s.dataset.pos===e.pinyinPosition)}),this.setStepperVal(t,"s-pysize",`${e.pinyinSize}px`))}setStepperVal(t,e,s){const i=t.querySelector(`#${e}-val`);i&&(i.textContent=s)}};h(R,"DICT_LABELS",{cedict:{name:"CC-CEDICT",desc:"English"},cvdict:{name:"CVDICT",desc:"Vietnamese"}});let Y=R;const te=new Set(["purple","pink","orange","mint","blue"]);function ee(r){const t=new Map,e=/^\[\^(.+?)\]:\s*(.*)$/,s=r.split(`
`),i=[];let n=null,o=[];function a(){n!==null&&(t.set(n,o.join(`
`)),n=null,o=[])}for(const c of s){const u=c.match(e);if(u){a(),n=u[1];const p=u[2].trim();p&&o.push(p);continue}if(n!==null){if(c.match(/^[ \t]{2,}/)){o.push(c.replace(/^[ \t]+/,""));continue}if(c.trim()===""){o.push("");continue}for(;o.length>0&&o[o.length-1]==="";)o.pop();a()}i.push(c)}for(;o.length>0&&o[o.length-1]==="";)o.pop();return a(),{body:i.join(`
`),footnotes:t}}function V(r){const t=[],e=[];let s="",i=0,n=0,o=null,a=null;const c=[];for(;n<r.length;){if(r[n]==="*"&&n+1<r.length&&r[n+1]==="*"){o!==null?(i>o&&t.push({start:o,end:i,type:"bold"}),o=null):o=i,n+=2;continue}if(r[n]==="_"&&n+1<r.length&&r[n+1]==="_"){a!==null?(i>a&&t.push({start:a,end:i,type:"underline"}),a=null):a=i,n+=2;continue}if(r[n]==="{"){const l=r.indexOf(":",n+1);if(l!==-1&&l-n-1<=10){const d=r.substring(n+1,l);if(te.has(d)){c.push({start:i,color:d}),n=l+1;continue}}}if(r[n]==="}"&&c.length>0){const l=c.pop();i>l.start&&t.push({start:l.start,end:i,type:"highlight",color:l.color}),n++;continue}if(r[n]==="["&&n+1<r.length&&r[n+1]==="^"){const l=r.indexOf("]",n+2);if(l!==-1){const d=r.substring(n+2,l),f=[...d].length;e.push({start:i,end:i+f,key:d}),s+=d,i+=f,n=l+1;continue}}const u=r.codePointAt(n),p=String.fromCodePoint(u);s+=p,i++,n+=p.length}return{cleanText:s,formatting:t.length>0?t:[],footnoteRanges:e.length>0?e:[]}}function pt(r){const t=r.trim();if(!t)return{paragraphs:[],footnotes:new Map};const{body:e,footnotes:s}=ee(t);let i=e.split(/\n\n+/);i.length===1&&(i=e.split(/\n/));const n=[];let o=1;for(const a of i){const c=a.trim();if(!c)continue;if(!c.includes(`
`)){const d=c.match(/^##\s+(.+)$/);if(d){const{cleanText:b,formatting:v,footnoteRanges:y}=V(d[1]);n.push({index:o++,text:b,type:"heading3",formatting:v.length>0?v:void 0,footnoteRanges:y.length>0?y:void 0});continue}const f=c.match(/^#\s+(.+)$/);if(f){const{cleanText:b,formatting:v,footnoteRanges:y}=V(f[1]);n.push({index:o++,text:b,type:"heading2",formatting:v.length>0?v:void 0,footnoteRanges:y.length>0?y:void 0});continue}}{const d=c.split(`
`).map(v=>v.trimEnd()),f=d.every(v=>/^[-*]\s+/.test(v)),b=d.every(v=>/^\d+[.)]\s+/.test(v));if(f||b){const v=f?"list-bullet":"list-ordered",y=f?/^[-*]\s+(.+)$/:/^\d+[.)]\s+(.+)$/,S=o++;for(const g of d){const w=g.match(y);if(w){const{cleanText:T,formatting:L,footnoteRanges:E}=V(w[1]);n.push({index:S,text:T,type:v,formatting:L.length>0?L:void 0,footnoteRanges:E.length>0?E:void 0})}}continue}}const{cleanText:u,formatting:p,footnoteRanges:l}=V(c);n.push({index:o++,text:u,formatting:p.length>0?p:void 0,footnoteRanges:l.length>0?l:void 0})}return{paragraphs:n,footnotes:s}}Ct();const st=new G,se=document.getElementById("reader"),Q=new Gt(se,st),tt=new Xt((r,t)=>{const{paragraphs:e,footnotes:s}=pt(r);ht(s),Q.setParagraphs(e,r,t)},r=>{const{paragraphs:t,footnotes:e}=pt(r.text);ht(e),Q.loadBundle(t,r)});function ie(){const r=Q.exportCRDR();if(!r.text)return;const t=JSON.stringify(r),e=new Blob([t],{type:"application/json"}),s=URL.createObjectURL(e),i=document.createElement("a");i.href=s,i.download=`${r.title||"text"}.crdr`,i.click(),URL.revokeObjectURL(s)}const ne=new Qt(tt,ie),yt=new Y(st);new Yt(()=>ne.toggle(),()=>yt.toggle(),st);document.addEventListener("open-dict-settings",()=>yt.openDictionaries());const oe=new URLSearchParams(window.location.search),re=oe.get("text"),ae=re||"000";tt.loadManifest().then(()=>tt.loadBuiltIn(ae));
