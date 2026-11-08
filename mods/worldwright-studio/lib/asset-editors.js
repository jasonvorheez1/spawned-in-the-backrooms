const C=require('lib/cards.js'),D=require('lib/workbench-data.js'),L=require('lib/studio-link-data.js'),LINKS=require('lib/studio-links.js'),PROJECT=require('lib/studio-projects.js'),TYPES=require('lib/studio-project-data.js'),CFG=require('lib/config.js'),PL=require('lib/pagelayout.js'),PEN=require('lib/pagelock.js'),F=require('lib/writefence.js');
const LOCKS={};
const clone=x=>JSON.parse(JSON.stringify(x));
const ref=d=>d?.model?L.sourceRef(d.model):d?.studioSource?.ref?L.sourceRef(d.studioSource.ref):'';
const target=c=>({bookId:L.ASSET,cardId:c.id,editor:c.editor,name:c.name,tag:L.tag(c.id)});
function choices(rows){return {ok:false,code:'choose_file',message:'Choose this asset’s file to open.',choices:rows.map(target)};}
export async function switchEditor(api,{bookId,cardId,editor,components,guard}){
 if(bookId!==L.ASSET||!D.MODES.includes(editor))throw Error('Choose an Asset Studio editor');guard();
 const source=await LINKS.project(api,bookId,cardId);guard();const pages=await C.listPages(api,bookId,cardId);guard();const data=D.read(pages)||D.blank(source.card.editor||'model');
 if(editor===data.mode)return target({...source.card,editor:data.mode});
 const found=await LINKS.resolve(api,{bookId,cardId,editor});guard();if(found&&found.code!=='missing_link')return found;
 const model=ref(data),seen=new Set();let anchor=source.card,seed=data;
 for(let i=0;i<8;i++){
  const id=seed.studioAsset?.cardId||seed.studioSource?.cardId;if(!id)break;if(seen.has(id))throw Error('The asset’s source links contain a cycle');seen.add(id);
  const next=await LINKS.project(api,bookId,id);guard();if(next.root.id!==source.root.id)throw Error('The asset source moved outside this project');
  const doc=D.read(await C.listPages(api,bookId,id));guard();if(!doc||ref(doc)!==model)throw Error('The original asset source changed; choose its current file explicitly');anchor=next.card;seed=doc;
  if(i===7)throw Error('Too many nested asset source links');
 }
 const key=bookId+'/'+anchor.id+'/'+model;if(LOCKS[key])throw Error('This asset’s companion file is still being created; retry shortly');LOCKS[key]=true;
 const actor=PEN.identity(api);let rootPen=null,releaseRoot=false;
 const writable=()=>{guard();const ui=api.getState().ui||{};if(!F.mayWrite()||C.isLockedBook(bookId)||ui.shelf?.canWrite===false||ui.workbench?.readOnly||ui.cards?.pageDoc?.pen?.mine===false||PEN.identity(api).id!==actor.id)throw Error('This asset is read-only; no companion files were created');};
 try{
  let rows=await C.allCards(api,bookId,{includeTrashed:true});guard();const docs=new Map([[anchor.id,seed],[source.card.id,data]]);
  const read=async c=>{if(!docs.has(c.id))docs.set(c.id,D.read(await C.listPages(api,bookId,c.id)));guard();return docs.get(c.id);};
  async function candidates(mode){const out=[];for(const c of rows){if(c.id!==anchor.id&&c.duplicatedFrom!==anchor.id)continue;const d=await read(c);if((d?.mode||c.editor)!==mode)continue;if(c.id!==anchor.id&&d&&(!d.studioAsset||d.studioAsset.cardId!==anchor.id||d.studioAsset.model!==model))continue;if(c.id===anchor.id&&ref(d)!==model)continue;
   if(await C.isTrashedInBook(api,bookId,c.id))throw Error('This asset’s '+mode+' file is in Trash; restore it instead of making a duplicate');guard();const p=await PROJECT.rootFor(api,bookId,c.folderId);guard();if(p?.id!==source.root.id)throw Error('This asset’s '+mode+' file moved outside the project');if(c.id!==anchor.id&&c.editor&&c.editor!==mode)throw Error('The companion card’s editor metadata changed; open it explicitly');out.push({...c,editor:mode});}return out;}
  const direct=await candidates(editor);if(direct.length>1)return choices(direct);if(direct.length===1&&await read(direct[0]))return target(direct[0]);
  writable();const prior=await PEN.peek(api,bookId,anchor.id,actor.id);writable();rootPen=await PEN.acquire(api,bookId,anchor.id,actor.id,actor.name);if(!rootPen.mine||rootPen.degraded)throw Error('The asset source pen is unavailable; nothing was replaced');releaseRoot=!prior.mine;
  const sourceFingerprint=D.fingerprint(pages),anchorFingerprint=D.fingerprint(await C.listPages(api,bookId,anchor.id));writable();const spec=(await CFG.getBook(api,bookId)).pageSpec||PL.DEFAULT_SPEC;
  async function check(){writable();const pen=await PEN.peek(api,bookId,anchor.id,actor.id);if(!pen.mine||pen.degraded||pen.stale||pen.takenAt!==rootPen.takenAt)throw Error('The source pen changed; retry the editor switch');if(D.fingerprint(await C.listPages(api,bookId,cardId))!==sourceFingerprint)throw Error('The source pages changed; reopen before switching tools');if(D.fingerprint(await C.listPages(api,bookId,anchor.id))!==anchorFingerprint)throw Error('The original asset changed; reopen before switching tools');const p=await LINKS.project(api,bookId,cardId);if(p.root.id!==source.root.id)throw Error('The project changed; retry from its current file');writable();}
  async function ensure(mode){const existing=await candidates(mode);if(existing.length>1)return {choice:choices(existing)};if(existing.length===1&&await read(existing[0]))return {card:existing[0],data:await read(existing[0])};await check();const type=TYPES.types(bookId).find(t=>t.editor===mode);if(!type)throw Error('That editor has no asset folder');const folder=await PROJECT.ensureType(api,{bookId,projectId:source.root.id,type:type.key,actor:actor.name});await check();let c=existing[0];
   if(!c){c=await C.createCardRow(api,bookId,{folderId:folder.id,name:anchor.name+' · '+type.name,editor:mode,duplicatedFrom:anchor.id,actor:actor.name});if(!c)throw Error('Companion card creation was refused');const done=await C.settleOf(bookId,c.id);if(done?.ok===false)throw Error(done.error||'Companion card did not settle');await C.settleDesk(api,bookId);rows.push(c);}
   await check();const p=await C.listPages(api,bookId,c.id);if(D.read(p))throw Error('The companion acquired content; open it again without overwriting it');const pen=await PEN.acquire(api,bookId,c.id,actor.id,actor.name);if(!pen.mine||pen.degraded)throw Error('The companion pen is unavailable');try{
    const basis=data.studioSource?seed:data,doc={...clone(basis),mode,studioAsset:{version:1,bookId,cardId:anchor.id,model},studioLinks:[L.link(anchor,seed.mode,'asset',-1)]};delete doc.studioSource;delete doc.studioManifest;if(mode==='path'&&!doc.path)doc.path=D.blank('path').path;if(mode==='level'&&!doc.level)doc.level=D.blank('level').level;
    const valid=D.validate(doc);await check();await C.setAssetPages(api,bookId,c.id,p,D.paginate(valid,spec),{authority:{editor:mode,holder:actor.id,takenAt:pen.takenAt||0,staleSeconds:PEN.STALE_S||45},beforeWrite:writable});await C.settleDesk(api,bookId);const saved=D.read(await C.listPages(api,bookId,c.id));if(JSON.stringify(saved)!==JSON.stringify(valid))throw Error('Companion readback did not match; retry to recover its existing card');docs.set(c.id,saved);return {card:c,data:saved};
   }finally{await PEN.release(api,bookId,c.id,actor.id);}
  }
  if(!['texture','material'].includes(editor)){const made=await ensure(editor);return made.choice||target(made.card);}
  if(!model)throw Error('Load a model first; there is no source '+editor+' to open');
  const models=await candidates('model');if(models.length>1)return choices(models);
  if(models.length===1){const linked=await LINKS.resolve(api,{bookId,cardId:models[0].id,editor});guard();if(linked&&linked.code!=='missing_link')return linked;}
  const envelope=components;if(!envelope||envelope.bookId!==bookId||envelope.cardId!==cardId||envelope.loadKey!==api.getState().ui?.workbench?.loadKey)throw Error('Load this asset’s model before opening its embedded files');L.validateReceipt(envelope.receipt,model);if(!(editor==='texture'?envelope.receipt.images:envelope.receipt.materials).length)throw Error('This model contains no supported '+(editor==='texture'?'embedded images':'materials')+'; no blank replacement was created');
  const owner=await ensure('model');if(owner.choice)return owner.choice;const priorModelPen=await PEN.peek(api,bookId,owner.card.id,actor.id),pen=await PEN.acquire(api,bookId,owner.card.id,actor.id,actor.name);if(!pen.mine||pen.degraded)throw Error('The model pen is unavailable');
  try{const currentPages=await C.listPages(api,bookId,owner.card.id),fingerprint=D.fingerprint(currentPages);await check();const result=await LINKS.ensure(api,{bookId,cardId:owner.card.id,data:owner.data,receipt:envelope.receipt,spec,actor,sourcePen:pen,guard:writable,checkSource:async()=>{await check();if(D.fingerprint(await C.listPages(api,bookId,owner.card.id))!==fingerprint)throw Error('The model changed while linking its components');}});await check();const linked=D.validate({...owner.data,studioLinks:[...L.links(owner.data).filter(l=>l.kind==='asset'),...result.links],studioManifest:{version:1,ref:model,hash:result.sourceHash}});
   await C.setAssetPages(api,bookId,owner.card.id,currentPages,D.paginate(linked,spec),{authority:{editor:'model',holder:actor.id,takenAt:pen.takenAt||0,staleSeconds:PEN.STALE_S||45},beforeWrite:writable});await C.settleDesk(api,bookId);if(JSON.stringify(D.read(await C.listPages(api,bookId,owner.card.id)))!==JSON.stringify(linked))throw Error('Linked model readback did not match');return await LINKS.resolve(api,{bookId,cardId:owner.card.id,editor});
  }finally{if(!priorModelPen.mine)await PEN.release(api,bookId,owner.card.id,actor.id);}
 }finally{delete LOCKS[key];if(releaseRoot&&rootPen?.mine)await PEN.release(api,bookId,anchor.id,actor.id);}
}
