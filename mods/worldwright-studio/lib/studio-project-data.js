// Presentation over ordinary folders, never a second document repository.
export const SOUND='0MUSIC00BOOK0';
export const ASSET='ASSET00STUDIO';
export const INSTRUMENTS='Custom Instruments';
export const TYPES={sound:[{key:'music',name:'Music',label:'Create/edit soundtrack',editor:'piano'},{key:'sfx',name:'SFX',label:'Create/edit SFX',editor:'piano'}],asset:[{key:'models',name:'Models',editor:'model'},{key:'poses',name:'Poses',editor:'pose'},{key:'sets',name:'Object Sets',editor:'set'},{key:'textures',name:'Textures',editor:'texture'},{key:'materials',name:'Materials',editor:'material'},{key:'paths',name:'Paths',editor:'path'},{key:'effects',name:'Effects',editor:'source'},{key:'levels',name:'Levels',editor:'level'}]};
export function kind(id){return id===SOUND?'sound':id===ASSET?'asset':'';}
export function shared(bookId,f){return bookId===SOUND&&f?.folderId===bookId&&['instruments','custom instruments'].includes(String(f.name||'').trim().toLowerCase());}
export function types(bookId){return TYPES[kind(bookId)]||[];}
export function type(bookId,key){return types(bookId).find(t=>t.key===key)||null;}
export function derive(input,old={}){
 const {bookId,folderId,trail=[],folders=[],list=[]}=input,k=kind(bookId);if(!k)return null;
 const root=folderId===bookId,head=folders.find(f=>f.id===(trail[0]?.id||folderId)&&f.folderId===bookId)||(trail[0]?{...trail[0],folderId:bookId}:null),bank=shared(bookId,head),project=!bank&&!root?head:null,same=old.bookId===bookId&&old.folderId===folderId;
 const roots=folders.filter(f=>f.folderId===bookId),previous=old.bookId===bookId?old.projects||[]:[],projects=roots.filter(f=>!shared(bookId,f)).map(f=>{const tile=list.find(t=>t.id===f.id&&t.isFolder)||previous.find(t=>t.id===f.id);return{id:f.id,name:f.name,folderId:bookId,childCounts:tile?.childCounts||null};});
 const children=project?folders.filter(f=>f.folderId===project.id):[],category=trail[1]||(!root&&folderId!==project?.id?folders.find(f=>f.id===folderId):null),selectedType=types(bookId).find(t=>String(t.name).toLowerCase()===String(category?.name||'').toLowerCase());
 const choices=types(bookId).map(t=>({...t,folderId:children.find(f=>f.name.toLowerCase()===t.name.toLowerCase())?.id||''}));
 const extras=children.filter(f=>!choices.some(t=>t.folderId===f.id)).map(f=>({key:'',name:f.name,label:f.name,folderId:f.id,editor:''}));
 const view=root?'projects':bank?'files':folderId===project?.id?'types':same&&old.view==='arrangement'?'arrangement':'files';
 return{kind:k,bookId,folderId,projectId:project?.id||null,name:project?.name||'',projects,instruments:roots.find(f=>shared(bookId,f))||null,shared:bank,types:choices.concat(extras),type:selectedType?.key||'',typeName:category?.name||'',view,arrangementCardId:same?old.arrangementCardId||'':'',loading:false,error:'',creating:!!old.creating};
}
