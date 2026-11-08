// Bounded, pull-only shelf pages. No partner runtime, writes, spawns or catalog mirror.
const A=require('lib/assetshelf.js'),T=require('lib/data/workbench.yml'),INPUT=require('lib/asset-input-data.js');
export function capability(row,mode=""){
 const p=String(row.path||'');
 if(mode==='source')return {use:'reference',note:'Insert an asset reference into this page · no placement'};
 if(row.kind==='sound'&&/^\/?cdn\/[\w./%+@-]+\.(mp3|wav|ogg|flac|m4a|aac|webm)(?:\?[^\s]*)?$/i.test(p)&&!p.includes('..'))return {use:'audio',note:'Original recording · use as an instrument or SFX source'};
 if(['model','animation'].includes(row.kind)&&/^\/?cdn\/[\w./%+@-]+\.glb(?:\?[^\s]*)?$/i.test(p)&&!p.includes('..'))return {use:'model',note:mode==='path'?'Context model · existing waypoints stay unchanged':row.kind==='animation'?'Rigged GLB · original clips retained':'GLB model'};
 if(row.kind==='image'&&/^\/?cdn\/[\w./%+@-]+\.(png|jpe?g|webp)(?:\?[^\s]*)?$/i.test(p)&&!p.includes('..'))return {use:'texture',note:'2D canvas or selected mesh texture'};
 const why={set:'Captured set · private set import is not supported yet',effect:'Scripted prop / effect · needs a private preview adapter',motion:'Motion recipe · not a standalone rigged GLB',sound:'Audio clips belong in Sound studio'};
 return {use:'',note:why[row.kind]||'This format cannot open in the private editor yet'};
}
export function page(api,args={}){
 const mode=String(args.mode||''),group=T.shelfGroups[mode];
 const source=args.source==='world'?'world':'library',version=A.installed(api),seen=new Set();
 const all=source==='world'?A.gameAssetRows(api,!!args.refresh).filter(r=>{if(seen.has(r.path)||!INPUT.kind(r.path))return false;seen.add(r.path);return true;}).map(r=>({...r,id:'',kind:INPUT.kind(r.path),thumb:INPUT.kind(r.path)==='image'?r.path:''})):version?A.rows(api):[],query=String(args.query||'').trim().slice(0,T.shelfQueryLength),kind=String(args.kind||'editable'),kinds={editable:0},needle=query.toLowerCase();
 for(const r of all){kinds[r.kind]=(kinds[r.kind]||0)+1;if(capability(r,mode).use)kinds.editable++;}
 const matches=all.filter(r=>(group?(source==='world'?INPUT.compatible(r.kind,mode):group.kinds.includes(r.kind)):(kind==='all'||kind==='editable'&&capability(r,mode).use||r.kind===kind))&&(!needle||[r.id,r.name,r.path,...(r.tags||[])].join(' ').toLowerCase().includes(needle))).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(matches.length/T.shelfPageSize)),index=Math.max(0,Math.min(pages-1,Math.floor(Number(args.page)||0))),rows=matches.slice(index*T.shelfPageSize,(index+1)*T.shelfPageSize).map(r=>({id:r.id,name:r.name,path:r.path,kind:r.kind,thumb:r.thumb,clips:r.clips,...capability(r,mode)}));
 return {mode,source,group:group?.label||'Asset Library',version,total:all.length,query,kind,kinds,count:matches.length,page:index,pages,rows,request:String(args.request||''),error:source==='library'&&version&&!all.length?'The installed shelf is empty or unreadable. Refresh after Asset Library finishes loading.':''};
}
