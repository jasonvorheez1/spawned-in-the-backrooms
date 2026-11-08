const LINKS=require('lib/studio-links.js'),LINK_DATA=require('lib/studio-link-data.js');
const C=require('lib/cards.js'),D=require('lib/workbench-data.js'),CFG=require('lib/config.js'),PL=require('lib/pagelayout.js'),F=require('lib/writefence.js'),PEN=require('lib/pagelock.js');
const LEVEL=require('lib/level-data.js');
const PATH=require('lib/workbench-path.js'),SHELF=require('lib/workbench-shelf.js');
const PAGE_ROLL=require('lib/page-roll.js'),ROLL=require('lib/roll-editor.js');
const BUSY={};
export function state(api){return api.getState().ui?.workbench||{};}
export function patch(api,p){const ui=api.getState().ui||{};api.patchState({ui:{...ui,workbench:{...ui.workbench,...p}}});}
export function fail(api,e){
  if(e.workbenchTarget&&!saveTarget(api,e.workbenchTarget)){api.log('[asset] '+String(e.message||e)+'; current draft untouched');return;}
  patch(api,{busy:!!BUSY[String(api.id||'')],error:String(e.message||e),reply:(state(api).reply||0)+1});
}
function saveTarget(api,target){
  const current=state(api),doc=api.getState().ui?.cards?.pageDoc;
  return current.open&&current.bookId===target.bookId&&current.cardId===target.cardId&&(current.loadKey||0)===target.loadKey&&current.baseline===target.baseline&&doc?.bookId===target.bookId&&doc?.cardId===target.cardId;
}
function saveWritable(api,target){
  const current=state(api),doc=api.getState().ui?.cards?.pageDoc;
  if(!saveTarget(api,target)||current.readOnly||!F.mayWrite()||C.isLockedBook(target.bookId)||doc?.pen?.mine===false)throw Error('The writable asset changed; your draft is kept');
}
export async function mode(api,book,card){const m=await PAGE_ROLL.choice(api,book,card);return D.MODES.includes(m)?m:'';}
export async function open(api,args){
  const ui=api.getState().ui||{},doc=ui.cards?.pageDoc;if(!doc||args.cardId&&args.cardId!==doc.cardId)throw Error('Open a card page first');
  if(doc.bookId==='RESEARCH0BOOK')throw Error('Research is for prose. Create this asset in Asset Studio.');
  if(!D.MODES.includes(args.mode))throw Error('Unknown asset editor');
  await C.settleDesk(api,doc.bookId);const card=await C.getCard(api,doc.bookId,doc.cardId);if(!card)throw Error('The asset card was deleted');const pages=await C.listPages(api,doc.bookId,doc.cardId),saved=D.read(pages),data=saved||D.blank(args.mode);if(saved)args={...args,mode:saved.mode};
  if(api.getState().ui?.cards?.pageDoc?.cardId!==doc.cardId||api.getState().ui?.cards?.pageDoc?.bookId!==doc.bookId)return;
  const writable=F.mayWrite()&&!C.isLockedBook(doc.bookId)&&doc.pen?.mine!==false;
  if(writable&&args.remember!==false)await PAGE_ROLL.setMode(api,doc,false,args.mode);
  const now=api.getState().ui||{},current=now.cards?.pageDoc;
  if(!current||current.cardId!==doc.cardId||current.bookId!==doc.bookId)return;
  ROLL.stop(api);
  api.patchState({ui:{...now,cards:{...now.cards,pageDoc:{...current,pianoRoll:false,pianoLoading:false}},pianoRoll:{...now.pianoRoll,open:false,loading:false,busy:false,loadSeq:(now.pianoRoll?.loadSeq||0)+1}}});
  data.mode=args.mode;if(args.mode==='material'&&!data.material)data.material=D.blank('material').material;if(args.mode==='path'&&!data.path)data.path=PATH.blank();if(args.mode==='level'&&!data.level)data.level=LEVEL.blank();
  patch(api,{open:true,busy:false,bookId:doc.bookId,cardId:doc.cardId,pageId:doc.pageId,name:ui.cards?.card?.name||doc.cardName||'Asset',linkChoices:[],linkNotice:'',linkWarning:'',sourceLinks:LINK_DATA.links(data),data,pages,selectedEditor:writable&&args.remember!==false?args.mode:(card.editor||''),baseline:D.fingerprint(pages),readOnly:!writable,error:'',reply:0,library:SHELF.page(api,{mode:args.mode}),key:doc.bookId+'/'+doc.cardId,loadKey:(state(api).loadKey||0)+1});
}
export async function save(api,args){
  const s=state(api),doc=api.getState().ui?.cards?.pageDoc,key=String(api.id||'');
  const target={bookId:s.bookId,cardId:s.cardId,loadKey:s.loadKey||0,baseline:s.baseline};
  if(BUSY[key])throw Error('A save is already in progress');
  saveWritable(api,target);
  if(args.cardId!==target.cardId||args.baseline!==target.baseline)throw Error('The writable asset changed; your draft is kept');
  // Acquire the local latch BEFORE the first await. A configuration read used to leave a race.
  BUSY[key]=true;patch(api,{busy:true,error:''});
  const me=PEN.identity(api);let held=false;
  try{
    let data=D.validate(args.data);const selectedEditor=s.selectedEditor??s.data.mode; if(data.mode!==s.data.mode)throw Error('Choose another editor in Metadata before saving');const submitted=JSON.stringify(data),before=s.pages.map(p=>({...p}));
    const prior=D.read(before);
    if(JSON.stringify(prior?.studioAsset)!==JSON.stringify(data.studioAsset)&&!(prior?.studioAsset&&!data.studioAsset&&data.model!==prior.model))throw Error('Asset-family identity cannot be replaced; switch tools to create a companion');
    if(!prior?.studioSource&&data.studioSource)throw Error('Linked components are created from the saved model, not a copied identity');
    if(prior?.studioLinks)data.studioLinks=prior.studioLinks;
    if(prior?.studioManifest)data.studioManifest=prior.studioManifest;
    if(prior?.studioSource&&JSON.stringify(prior.studioSource)!==JSON.stringify(data.studioSource))throw Error('Linked source identity cannot be replaced; create another file instead');
    if(data.mode==='model'&&data.studioManifest&&LINK_DATA.sourceRef(data.model)!==data.studioManifest.ref){delete data.studioLinks;delete data.studioManifest;}
    const spec=(await CFG.getBook(api,target.bookId)).pageSpec||PL.DEFAULT_SPEC;
    saveWritable(api,target);
    const plan=D.paginate(data,spec);
    for(const p of before)for(const zone of ['header','footer'])if(!PL.zoneFit(p[zone]||'',spec,zone).ok)throw Error('An existing page band is full; nothing changed');
    const pen=await PEN.acquire(api,target.bookId,target.cardId,me.id,me.name);
    if(!pen.mine||pen.degraded)throw Error('This card’s pen could not be acquired');held=true;
    saveWritable(api,target);
    if(await PAGE_ROLL.choice(api,target.bookId,target.cardId)!==selectedEditor)throw Error('The card’s metadata editor changed; your draft is kept');
    saveWritable(api,target);
    let pages=await C.setAssetPages(api,target.bookId,target.cardId,before,plan,{beforeWrite:()=>saveWritable(api,target),authority:{editor:selectedEditor,holder:me.id,takenAt:pen.takenAt||0,staleSeconds:PEN.STALE_S||45}});
    await C.settleDesk(api,target.bookId);
    if(JSON.stringify(D.read(pages))!==JSON.stringify(data))throw Error('Saved asset did not match; keep your draft');
    // Only the explicit ordinary model Save reaches component creation. A failed/partial
    // component batch acknowledges the model save and leaves an actionable retry warning.
    let linkWarning='';
    if(target.bookId===LINK_DATA.ASSET&&data.mode==='model'&&data.model){
      try{
        saveWritable(api,target);
        const envelope=args.components;
        if(!envelope||envelope.cardId!==target.cardId||envelope.bookId!==target.bookId||envelope.loadKey!==target.loadKey)throw Error(args.componentError||'Load this model successfully, then Save again to create linked files');
        LINK_DATA.validateReceipt(envelope.receipt,data.model);
        const expected=D.fingerprint(pages);
        const checkSource=async()=>{saveWritable(api,target);const current=await C.listPages(api,target.bookId,target.cardId);if(D.fingerprint(current)!==expected||await PAGE_ROLL.choice(api,target.bookId,target.cardId)!==selectedEditor)throw Error('The saved model source changed; reopen it before linking');saveWritable(api,target);};
        const result=await LINKS.ensure(api,{bookId:target.bookId,cardId:target.cardId,data,receipt:envelope.receipt,spec,actor:me,guard:()=>saveWritable(api,target),checkSource,sourcePen:pen});
        await checkSource();
        const linked=D.validate({...data,studioLinks:[...LINK_DATA.links(data).filter(l=>l.kind==='asset'),...result.links],studioManifest:{version:1,ref:LINK_DATA.sourceRef(data.model),hash:result.sourceHash}});
        if(JSON.stringify(linked)!==JSON.stringify(data)){
          pages=await C.setAssetPages(api,target.bookId,target.cardId,pages,D.paginate(linked,spec),{beforeWrite:()=>saveWritable(api,target),authority:{editor:selectedEditor,holder:me.id,takenAt:pen.takenAt||0,staleSeconds:PEN.STALE_S||45}});
          await C.settleDesk(api,target.bookId);
          if(JSON.stringify(D.read(pages))!==JSON.stringify(linked))throw Error('Model link page receipt did not match; retry Save');
          data=linked;
        }
        linkWarning=result.warnings.join(' · ');
      }catch(error){linkWarning='Model saved; linked files need attention: '+String(error.message||error)+'. Reopen the source if it changed, then retry Save. Completed component files are kept.';}
    }
    // Metadata remains its owner's authority. Save never writes it back over a later choice.
    // A dispatched transaction can finish after navigation; acknowledge ONLY the same draft.
    if(saveTarget(api,target))patch(api,{busy:false,data,pages,baseline:D.fingerprint(pages),savedData:submitted,sourceLinks:LINK_DATA.links(data),linkWarning,reply:(state(api).reply||0)+1,error:'',saved:true});
    return {saved:true,bookId:target.bookId,cardId:target.cardId};
  }catch(e){e.workbenchTarget=target;throw e;}
  finally{
    delete BUSY[key];
    if(saveTarget(api,target))patch(api,{busy:false});
    if(held&&!doc.pen?.mine)await PEN.release(api,target.bookId,target.cardId,me.id);
  }
}
export function requestModel(api,args){
 const s=state(api),doc=api.getState().ui?.cards?.pageDoc,request=String(args.request||''),path=String(args.path||'');
 if(!s.open||s.readOnly||!F.mayWrite()||!doc||args.cardId!==s.cardId||doc.cardId!==s.cardId||doc.bookId!==s.bookId||!['pose','model','set','path','level'].includes(args.mode))return;
 if(!request||!/^\/?cdn\/[A-Za-z0-9_./%+@-]+\.glb(?:\?[^\s]*)?$/i.test(path)||path.includes('..'))return;
 if(s.modelRequest?.request===request)return;
 try{api.preloadAsset(path);patch(api,{modelRequest:{request,path,status:'requested',message:'Engine request submitted; waiting for the model. Generation is not confirmed until the host responds.'}});}
 catch(e){patch(api,{modelRequest:{request,path,status:'error',message:String(e.message||e)}});}
}
export async function handle(api,args){if(args.op==='requestModel')return requestModel(api,args);if(args.op==='shelf'){const s=state(api);if(!s.open||args.cardId!==s.cardId)return;const mode=args.mode==='material'?'material':D.MODES.includes(args.mode)?args.mode:s.data.mode;try{patch(api,{library:SHELF.page(api,{...args,mode})});}catch(e){patch(api,{library:{...s.library,source:args.source==='world'?'world':'library',mode,request:String(args.request||''),rows:[],count:0,page:0,pages:1,error:'Could not read Asset Library: '+String(e.message||e)}});}return;}if(args.op==='open')return open(api,args);if(args.op==='save')return save(api,args);if(args.op==='close'){const s=state(api),doc=api.getState().ui?.cards?.pageDoc;if(args.source){if(!doc||doc.bookId!==s.bookId||doc.cardId!==s.cardId)throw Error('The open card changed');await PAGE_ROLL.setMode(api,doc,false);}patch(api,{open:false});}}

export async function enter(api,doc){const s=state(api);if(s.open&&s.cardId===doc.cardId&&s.bookId===doc.bookId)return;const m=await mode(api,doc.bookId,doc.cardId);if(api.getState().ui?.cards?.pageDoc?.cardId!==doc.cardId)return;if(D.MODES.includes(m))await open(api,{mode:m,cardId:doc.cardId,remember:false});else if(s.open)patch(api,{open:false});}
