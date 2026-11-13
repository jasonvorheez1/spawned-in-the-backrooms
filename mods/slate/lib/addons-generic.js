// Add-ons, the generic half (from @dandalruss's Slate): fills any adapter's missing contract fields, and hosts a plain mod by its own tab panel.
// Nothing here imports another mod; addons-host.js hands each mod's modules in.
export const BUDGET=250000; // characters of html one add-on page may draw inside Slate in one frame
const fwd=(id,god)=>(ctx,name,payload)=>{
 if(typeof god?.onInput!=='function')return;
 const k=id+':'+name;
 god.onInput(ctx,{pressed:{[name]:true,[k]:true},held:{},released:{},axes:{},actionData:{[name]:payload,[k]:payload}});
};
export function finish(meta,c,mods){
 c=c&&typeof c==='object'?c:{};
 const pages=Array.isArray(c.pages)&&c.pages.length?c.pages:[{k:'main',label:meta.tab?.label||meta.name,app:'own'}];
 const own=pages.filter(p=>p.app==='own');
 return {...c,
  app:{name:meta.name,glyph:meta.glyph,color:meta.color,sub:()=>meta.version?'v'+meta.version:'',...(c.app||{})},
  pages,
  current:c.current||((ctx,player)=>{const k=player?.state?.slateAoPage?.[meta.id];return own.some(p=>p.k===k)?k:own[0]?.k}),
  go:c.go||((k)=>`sendAction('planAddon',{op:'page',id:${JSON.stringify(meta.id).replace(/"/g,"'")},k:${JSON.stringify(String(k)).replace(/"/g,"'")}})`),
  actions:Array.isArray(c.actions)?c.actions:meta.actions||[],
  forward:c.forward||fwd(meta.id,mods?.god),
 };
}
// a mod with no adapter: its own god-mode tab panel, drawn inside Slate
export function generic(meta,mods){
 const panel=typeof mods?.panel==='function'?mods.panel:mods?.panel?.default;
 return finish(meta,{page:(ctx,player)=>panel?panel(ctx,player,{host:'slate'}):''},mods);
}
