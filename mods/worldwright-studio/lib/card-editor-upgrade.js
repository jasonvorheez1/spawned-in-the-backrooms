// Fold only retired explicit preferences into metadata. No page content is written. The old card-wide asset choice wins; otherwise the first numbered page with an explicit preference wins. Thereafter cards.editor is the sole authority.
export async function inherit(api){
 await api.sql`WITH choices AS (
 SELECT c.id,COALESCE(
 CASE WHEN json_extract(CASE WHEN json_valid(a.value) THEN a.value ELSE '{}' END,'$.v') IN ('pose','model','set','texture','path')
 THEN json_extract(a.value,'$.v') END,
 (SELECT CASE s.value WHEN 'true' THEN 'piano' WHEN 'false' THEN 'source' END
 FROM pages p JOIN book_settings s ON s.bookId=p.bookId AND s.key='pageEditor:'||p.id
 WHERE p.bookId=c.bookId AND p.cardId=c.id AND s.value IN ('true','false') ORDER BY p.sortKey,p.id LIMIT 1),'') AS editor
 FROM cards c LEFT JOIN book_settings a ON a.bookId=c.bookId AND a.key='assetEditor:'||c.id WHERE c.editor='')
 UPDATE cards SET editor=(SELECT editor FROM choices WHERE choices.id=cards.id)
 WHERE editor='' AND id IN (SELECT id FROM choices WHERE editor<>'');
 DELETE FROM book_settings WHERE key LIKE 'pageEditor:%' OR key LIKE 'assetEditor:%'`;
}
