// Pure inspection contract. These cards contain text, never executable input.
export const BOOK = 'WWSCODE0BOOK';
export const MAX_CHARS = 12000;
export const MAX_LINES = 80;
export function isSource(bookId){return String(bookId||'')===BOOK;}
export function refuseExecution(bookId){if(isSource(bookId))throw Error('Studio Code is an inspection snapshot, not an executable document.');}
export function allowedFile(path){
 const p=String(path||'');
 return /^mods\/worldwright-studio\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:js|json|yml|yaml)$/.test(p)&&!p.split('/').some(s=>s==='.'||s==='..'||s==='node_modules')&&!/(?:^|\/)(?:secrets?|credentials?|\.env)(?:[./-]|$)/i.test(p);
}
export function paginate(source){
 const text=String(source),out=[];let at=0,line=1,column=1;
 do{
  const from=at,startLine=line,startColumn=column;let lines=0;
  while(at<text.length&&at-from<MAX_CHARS&&lines<MAX_LINES){
   const c=text.charCodeAt(at);if(c>=0xd800&&c<=0xdbff&&at-from===MAX_CHARS-1)break;
   if(text[at++]==='\n'){line++;column=1;lines++;}else column++;
  }
  const content=text.slice(from,at);
  out.push({content,startLine,startColumn,endLine:content.endsWith('\n')?line-1:line,endColumn:content.endsWith('\n')?0:column-1});
 }while(at<text.length);
 return out;
}
export function metadata(page){try{const m=JSON.parse(String(page?.header||''));return m.format==='wws-source-page'&&m.version===1?m:{};}catch(_){return {};}}
