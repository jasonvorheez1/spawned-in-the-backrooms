// IDs are durable. History follows current ownership without rewriting old journal rows.
export async function forTarget(api,id,fallback){
 const r=await api.sql`SELECT bookId FROM cards WHERE id=${id}
 UNION ALL SELECT bookId FROM pages WHERE id=${id}
 UNION ALL SELECT bookId FROM sections WHERE id=${id}
 UNION ALL SELECT bookId FROM folders WHERE id=${id} LIMIT 1`;
 return r.rows?.[0]?.bookId||fallback;
}
export async function history(api,row){
 if(row.bookId!=='RESEARCH0BOOK'||!row.targetId)return row;
 const before=row.bookId,book=await forTarget(api,row.targetId,before);if(book===before)return row;
 function addresses(o){if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){if((k==='bookId'||k==='folderId')&&o[k]===before)o[k]=book;else if(typeof o[k]==='object')addresses(o[k]);}}
 row.bookId=book;addresses(row.before);addresses(row.after);return row;
}
