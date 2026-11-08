const LEVEL=require('lib/level-data.js'),LINK=require('lib/studio-link-data.js'),ANIMATION=require('lib/animation-lab-data.js');
const PATH=require('lib/workbench-path.js'),PAPER=require('lib/workbench-paper.js'),DETAIL=require('lib/model-detail-data.js');
const L=require('lib/data/workbench.yml'),PL=require('lib/pagelayout.js'),W=require('lib/score-width.js');
export const MODES=['pose','model','set','texture','material','path','level'];
export const TITLE='Asset Studio';
export function blank(mode='pose'){return {version:1,mode,model:'',nodes:{},parts:[],keys:[],duration:3,texture:'',...(mode==='material'?{material:{baseColorFactor:[1,1,1,1],metalness:1,roughness:1,slots:[]}}:{}),...(mode==='path'?{path:PATH.blank()}: {}),...(mode==='level'?{level:LEVEL.blank()}: {})};}
export function validate(input){
  if(!input||input.version!==1||!MODES.includes(input.mode))throw Error('Unsupported asset document');
  if(input.studioSource!==undefined)LINK.validateSource(input.studioSource);
  if(input.studioAsset!==undefined){const a=input.studioAsset;if(!a||a.version!==1||a.bookId!==LINK.ASSET||!/^\w{13}$/.test(a.cardId)||typeof a.model!=='string')throw Error('Invalid asset-family identity');if(a.model)LINK.sourceRef(a.model);}
  if(input.mode==='material')LINK.validateMaterial(input.material);
  if(input.studioLinks!==undefined&&(!Array.isArray(input.studioLinks)||input.studioLinks.length>129||input.studioLinks.some(l=>l.bookId!==LINK.ASSET||!l.cardId||l.tag!==LINK.tag(l.cardId))))throw Error('Invalid linked file list');
  if(input.detail!==undefined)DETAIL.validateDetail(input.detail);
  if(input.animation!==undefined){ANIMATION.validateAnimation(input.animation);if(input.model&&!input.animation.sourceHash)throw Error('Animation source identity is missing');}
  const raw=JSON.stringify(input);if(raw.length>L.maxBytes)throw Error('Asset document is too large; split this set or animation into cards');
  const d=JSON.parse(raw),ref=(v,ext)=>!v||new RegExp('^/?cdn/[A-Za-z0-9_./%+@-]+\\.('+ext+')(\\?[^\\s]*)?$','i').test(v)&&!v.includes('..');
  if(!ref(d.model,'glb')||!ref(d.texture,'png|jpg|jpeg|webp'))throw Error('Use an uploaded/CDN GLB model or image');
  if(!d.nodes||Object.keys(d.nodes).length>L.maxNodes||!Array.isArray(d.parts)||d.parts.length>L.maxNodes||!Array.isArray(d.keys)||d.keys.length>L.maxKeys)throw Error('Too many nodes or keyframes');
  const vec=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(x=>Number.isFinite(x)&&Math.abs(x)<100000);
  const poses=nodes=>{if(!nodes||Array.isArray(nodes)||Object.keys(nodes).length>L.maxNodes)throw Error('Too many pose nodes');for(const [id,n]of Object.entries(nodes)){if(!/^\d+$/.test(id)||Number(id)>=L.maxNodes||!vec(n.p,3)||!vec(n.q,4)||Math.hypot(...n.q)<1e-9||!vec(n.s,3)||n.s.some(x=>x<=0))throw Error('Invalid node transform');if(!ref(n.texture,'png|jpg|jpeg|webp'))throw Error('Use a CDN material texture');if(n.color&&!/^#[0-9a-f]{6}$/i.test(n.color)||n.metalness!=null&&(!Number.isFinite(n.metalness)||n.metalness<0||n.metalness>1)||n.roughness!=null&&(!Number.isFinite(n.roughness)||n.roughness<0||n.roughness>1))throw Error('Invalid material');}};poses(d.nodes);
  if(!Number.isFinite(d.duration)||d.duration<=0||d.duration>L.maxSeconds)throw Error('Duration is 0–'+L.maxSeconds+' seconds');
  for(const k of d.keys){if(!Number.isFinite(k.time)||k.time<0||k.time>d.duration)throw Error('Keyframe is outside the timeline');poses(k.nodes||{});}
  for(const p of d.parts)if(!ref(p.texture,'png|jpg|jpeg|webp')||!['box','sphere','cylinder','cone','capsule','torus','wedge'].includes(p.kind)||!vec(p.p,3)||!vec(p.s,3)||p.s.some(x=>x<=0)||!vec(p.q,4)||!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('Invalid set component');
  if(d.path!==undefined)PATH.validate(d.path);if(d.mode==='path'&&!d.path)throw Error('A path editor needs path data');
  if(d.level!==undefined)LEVEL.validate(d.level);if(d.mode==='level'&&!d.level)throw Error('A level editor needs level data');
  return d;
}
export function fingerprint(pages){return JSON.stringify(pages.map(p=>({id:p.id,content:p.content||'',header:p.header||'',footer:p.footer||'',title:p.title,sortKey:p.sortKey})));}
export function read(pages){
 if(!pages.length||pages.every(p=>!(p.content||'').trim()))return null;
 if(pages.length>L.maxPages)throw Error('Too many asset pages');
 try{return validate(PAPER.decode(pages.map(p=>p.content||'').join('\n')));}
 catch(e){throw Error('This card contains prose or music, or invalid asset data: '+e.message);}
}
export function paginate(data,spec){const valid=validate(data),lines=PAPER.lines(valid,spec),pages=[];let content='';for(const line of lines){if(!W.fits(line,spec))throw Error('This paper is too narrow for an asset document');const next=content?content+'\n'+line:line;if(!PL.zoneFit(next,spec,'body').ok){if(!content)throw Error('This paper has no body space');pages.push({title:TITLE,content});content=line;}else content=next;}if(content)pages.push({title:TITLE,content});if(pages.length>L.maxPages)throw Error('This asset needs too many source pages');if(JSON.stringify(read(pages))!==JSON.stringify(valid))throw Error('Asset pagination changed the source');return pages;}
