// Explicit author-run refile, never a boot migration. JSON values bind into fixed SQL.
const C=require('lib/cards.js'),G=require('lib/graph.js'),PIN=require('lib/pinned.js'),PIANO=require('lib/pianoroll.js');
const FROM='RESEARCH0BOOK',MUSIC='0MUSIC00BOOK0',ASSET='ASSET00STUDIO';
export async function plan(api){
 const [fr,cr,pages,sections,tr]=await Promise.all([C.tableOf(FROM).foldersAll(api),C.tableOf(FROM).cardsAll(api),C.allPages(api,FROM),C.allSections(api,FROM),api.sql`SELECT entityId,originalFolderId FROM trash WHERE originalBookId=${FROM}`]);
 const folders=fr.rows||[],cards=cr.rows||[],archived={};for(const t of tr.rows||[])archived[t.entityId]=t.originalFolderId;
 const by={},dest={};for(const f of folders)by[f.id]=f;
 function home(id,seen={}){if(!id||id===FROM||seen[id])return '';seen[id]=true;const f=by[id];if(!f)return '';if(f.folderId===FROM||archived[f.id]===FROM){if(/^(piano rolls|music|sfx|sounds|instruments)$/i.test(f.name))return MUSIC;if(/^(asset studio|models|textures|materials|poses|animations|object sets|images)$/i.test(f.name))return ASSET;}return home(archived[f.id]||f.folderId,seen);}
 for(const f of folders){const to=home(f.id);if(to)dest[f.id]=to;}
 const media={};for(const p of pages){if(p.title==='Asset Studio')media[p.cardId]=ASSET;else if(PIANO.isPage(p))media[p.cardId]=MUSIC;}for(const s of sections)if(/^piano roll$/i.test(s.name))media[s.cardId]=MUSIC;
 const stacks={};for(const c of cards){const to=home(archived[c.id]||c.folderId)||media[c.id];if(to)stacks[c.stackId]=to;}
 const moves=cards.filter(c=>stacks[c.stackId]).map(c=>({id:c.id,to:stacks[c.stackId],parent:archived[c.id]?c.folderId:dest[c.folderId]?c.folderId:stacks[c.stackId],name:c.name}));
 return {from:FROM,cards:moves,folders:folders.filter(f=>dest[f.id]).map(f=>({id:f.id,to:dest[f.id],parent:archived[f.id]?f.folderId:dest[f.folderId]?f.folderId:dest[f.id],name:f.name}))};
}
export async function contents(api,ids){const j=JSON.stringify(ids);const p=await api.sql`SELECT id,cardId,sortKey,title,content,header,footer FROM pages WHERE cardId IN (SELECT value FROM json_each(${j})) ORDER BY id`;const s=await api.sql`SELECT id,cardId,name,content,lineLimit,sortKey FROM sections WHERE cardId IN (SELECT value FROM json_each(${j})) ORDER BY id`;return JSON.stringify({pages:p.rows,sections:s.rows});}
export async function apply(api,approved){
 if(!approved||approved.from!==FROM)throw Error('Approve a Research refile plan first');
 await C.settleDesk(api,FROM);const fresh=await plan(api);if(JSON.stringify(fresh)!==JSON.stringify(approved))throw Error('The shelf changed; read its plan again');
 if(!fresh.cards.length&&!fresh.folders.length)return {moved:0,unchanged:true};
 const ids=fresh.cards.map(c=>c.id),before=await contents(api,ids),cj=JSON.stringify(fresh.cards),fj=JSON.stringify(fresh.folders);
 await transfer(api,cj,fj);
 const after=await contents(api,ids);if(after!==before)throw Error('Refile verification failed; retain the backup');
 for(const b of [FROM,MUSIC,ASSET])G.invalidate(b);
 return {moved:fresh.cards.length,folders:fresh.folders.length,sourceUnchanged:true,cards:fresh.cards};
}
export async function transfer(api,cj,fj){
 await api.sql`INSERT INTO book_settings(bookId,key,value) SELECT (SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=c.id),b.key,b.value FROM book_settings b JOIN cards c ON c.bookId=b.bookId WHERE b.bookId=${FROM} AND c.id IN (SELECT json_extract(value,'$.id') FROM json_each(${cj})) AND (b.key LIKE '%:'||c.id OR EXISTS(SELECT 1 FROM pages p WHERE p.cardId=c.id AND b.key LIKE '%:'||p.id) OR EXISTS(SELECT 1 FROM sections n WHERE n.cardId=c.id AND b.key LIKE '%:'||n.id)) ON CONFLICT(bookId,key) DO UPDATE SET value=excluded.value;
 DELETE FROM book_settings WHERE bookId=${FROM} AND EXISTS(SELECT 1 FROM cards c WHERE c.id IN (SELECT json_extract(value,'$.id') FROM json_each(${cj})) AND (book_settings.key LIKE '%:'||c.id OR EXISTS(SELECT 1 FROM pages p WHERE p.cardId=c.id AND book_settings.key LIKE '%:'||p.id) OR EXISTS(SELECT 1 FROM sections n WHERE n.cardId=c.id AND book_settings.key LIKE '%:'||n.id)));
 INSERT INTO book_settings(bookId,key,value) SELECT ${MUSIC},key,value FROM book_settings WHERE bookId=${FROM} AND key NOT LIKE '%:%' ON CONFLICT(bookId,key) DO NOTHING;
 INSERT INTO book_settings(bookId,key,value) SELECT ${ASSET},key,value FROM book_settings WHERE bookId=${FROM} AND key NOT LIKE '%:%' ON CONFLICT(bookId,key) DO NOTHING;
 UPDATE pages SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=pages.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE sections SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=sections.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE card_tags SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=card_tags.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE card_stats SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=card_stats.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE card_images SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=card_images.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE card_names SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=card_names.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE atmo_marks SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=atmo_marks.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE cards_fts SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=cards_fts.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE page_pen SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=page_pen.cardId) WHERE bookId=${FROM} AND cardId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE compile_state SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${fj}) WHERE json_extract(value,'$.id')=compile_state.folderId) WHERE bookId=${FROM} AND folderId IN (SELECT json_extract(value,'$.id') FROM json_each(${fj}));
 UPDATE trash SET originalBookId=COALESCE((SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=trash.entityId),(SELECT json_extract(value,'$.to') FROM json_each(${fj}) WHERE json_extract(value,'$.id')=trash.entityId)) WHERE originalBookId=${FROM} AND (entityId IN (SELECT json_extract(value,'$.id') FROM json_each(${cj})) OR entityId IN (SELECT json_extract(value,'$.id') FROM json_each(${fj})));
 UPDATE cards SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=cards.id),folderId=(SELECT json_extract(value,'$.parent') FROM json_each(${cj}) WHERE json_extract(value,'$.id')=cards.id) WHERE bookId=${FROM} AND id IN (SELECT json_extract(value,'$.id') FROM json_each(${cj}));
 UPDATE folders SET bookId=(SELECT json_extract(value,'$.to') FROM json_each(${fj}) WHERE json_extract(value,'$.id')=folders.id),folderId=(SELECT json_extract(value,'$.parent') FROM json_each(${fj}) WHERE json_extract(value,'$.id')=folders.id) WHERE bookId=${FROM} AND id IN (SELECT json_extract(value,'$.id') FROM json_each(${fj}));
 INSERT INTO book_rev(bookId,rev,touchedAt,by) VALUES(${FROM},1,CAST(unixepoch('subsec')*1000 AS INTEGER),'specialist-refile') ON CONFLICT(bookId) DO UPDATE SET rev=book_rev.rev+1,touchedAt=excluded.touchedAt,by=excluded.by;
 INSERT INTO book_rev(bookId,rev,touchedAt,by) VALUES(${MUSIC},1,CAST(unixepoch('subsec')*1000 AS INTEGER),'specialist-refile') ON CONFLICT(bookId) DO UPDATE SET rev=book_rev.rev+1,touchedAt=excluded.touchedAt,by=excluded.by;
 INSERT INTO book_rev(bookId,rev,touchedAt,by) VALUES(${ASSET},1,CAST(unixepoch('subsec')*1000 AS INTEGER),'specialist-refile') ON CONFLICT(bookId) DO UPDATE SET rev=book_rev.rev+1,touchedAt=excluded.touchedAt,by=excluded.by`;
}
