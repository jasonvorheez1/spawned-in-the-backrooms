// Your own shortcuts: each free key is declared once in mod.json as slateK_<key>; which command it runs is yours, on player.state.slateKeys.
export const FREE=['b','h','i','j','k','l','m','n','o','t','u','v','x','y','z','4','5','6','7','8','9','0'];
export const CMDS={pocket:['open / tuck the small slate','j'],planner:['open the planner',''],diary:['open the loom',''],gallery:['open the gallery',''],crowd:['open players',''],selfie:['open the camera','']};
export const keysOf=p=>{const k=p?.state?.slateKeys;const o={};for(const c in CMDS)o[c]=k&&c in k?k[c]:CMDS[c][1];return o;};
export function keyOp(ctx,p,d){
 const k={...keysOf(p)};if(!(d.cmd in CMDS))return false;
 const key=d.key===''?'':String(d.key||'').toLowerCase();if(key&&!FREE.includes(key))return false;
 for(const c in k)if(key&&k[c]===key)k[c]='';k[d.cmd]=key;p.state.slateKeys=k;return false;
}
