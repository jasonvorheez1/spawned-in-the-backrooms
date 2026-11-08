// The one-time project layout migration is a book fact, not a per-seat promise.
export async function ready(api,bookId){const r=await api.sql`SELECT value FROM book_settings WHERE bookId=${bookId} AND key='studioProjectLayoutVersion'`;return r.rows?.[0]?.value==='2';}
export async function mark(api,bookId){await api.sql`INSERT INTO book_settings(bookId,key,value) VALUES(${bookId},'studioProjectLayoutVersion','2') ON CONFLICT(bookId,key) DO UPDATE SET value=excluded.value`;}
