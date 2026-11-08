import { layout, sheet } from './score-notation.js';

// A local sheet turn changes only the picture, never the source or its save state.
export function mount(){
  const prior=window.__wwsNotation;
  if(prior?.version===2){prior.apply();return;}
  const sheets=prior?.sheets||new Map();
  prior?.dispose();
  let frame=0,cache=null,dead=false;
  const rootNow=()=>document.querySelector('#sb-zone-body .sbp-score-paper');
  const countOf=root=>Math.max(1,Number(root.dataset.notationSheets)||root.querySelectorAll('.notation-sheet').length);
  function indexOf(root){
    const key=root.dataset.notationKey;
    if(!sheets.has(key))sheets.set(key,Math.max(0,(Number(root.querySelector('.notation-sheet:not([hidden])')?.dataset.sheet)||1)-1));
    return Math.max(0,Math.min(countOf(root)-1,sheets.get(key)||0));
  }
  function apply(){
    if(frame)cancelAnimationFrame(frame);frame=0;if(dead)return;
    const root=rootNow();if(!root){cache=null;return;}
    const key=root.dataset.notationKey,count=countOf(root),i=indexOf(root),payload=root.querySelector('.notation-payload');
    if(payload){
      const encoded=payload.textContent;
      if(cache?.encoded!==encoded)cache={encoded,plan:null,html:new Map()};
      const current=root.querySelector('.notation-sheet');
      if(!current||Number(current.dataset.sheet)!==i+1){
        try{
          if(!cache.plan){const source=JSON.parse(encoded);cache.plan=layout(source.text,source.options);if(cache.plan.error)throw Error(cache.plan.error);}
          let html=cache.html.get(i);
          if(!html){html=sheet(cache.plan,i);if(!html)throw Error('This score sheet is unavailable');if(cache.html.size>=2)cache.html.delete(cache.html.keys().next().value);cache.html.set(i,html);}
          const template=document.createElement('template');template.innerHTML=html;
          if(current)current.replaceWith(template.content);else root.prepend(template.content);
          delete root.dataset.notationError;
        }catch(e){
          root.dataset.notationError=String(e?.message||e);
          const label=document.getElementById('sb-notation-count');if(label)label.textContent='Sheet unavailable — source remains editable';
          return;
        }
      }
    }else{
      // Older markup may still be present during a hot module handoff.
      const rows=[...root.querySelectorAll('.notation-sheet')];
      for(let n=0;n<rows.length;n++)if(rows[n].hidden!==(n!==i))rows[n].hidden=n!==i;
    }
    const label=document.getElementById('sb-notation-count'),text='Score sheet '+(i+1)+' / '+count;
    if(label&&label.textContent!==text)label.textContent=text;
    for(const b of document.querySelectorAll('[data-notation-step]')){const off=Number(b.dataset.notationStep)<0?i===0:i===count-1;if(b.disabled!==off)b.disabled=off;}
    if(sheets.size>64)sheets.delete(sheets.keys().next().value);
  }
  function schedule(){if(!dead&&!frame)frame=requestAnimationFrame(apply);}
  function click(e){
    const b=e.target.closest('[data-notation-step]');if(!b||b.disabled)return;
    const root=rootNow();if(!root)return;e.preventDefault();
    sheets.set(root.dataset.notationKey,Math.max(0,Math.min(countOf(root)-1,indexOf(root)+Number(b.dataset.notationStep))));apply();
  }
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-notation-key']});
  document.addEventListener('click',click);
  const host={version:2,sheets,apply,dispose(){dead=true;observer.disconnect();document.removeEventListener('click',click);window.removeEventListener('pagehide',host.dispose);if(frame)cancelAnimationFrame(frame);cache=null;if(window.__wwsNotation===host)delete window.__wwsNotation;}};
  window.__wwsNotation=host;window.addEventListener('pagehide',host.dispose);apply();
}
