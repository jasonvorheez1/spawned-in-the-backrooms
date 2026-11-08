// Resolve only Worldwright's own runtime components; no optional partner imports.
export function resolve(api, leaf) {
  const name=String(leaf||'');
  if(!/^[a-z0-9-]+\.js$/.test(name))throw Error('Invalid Worldwright component');
  let files=[];
  try{files=api.world.files||[];}catch(_){}
  if(!files.length&&api.listScripts)files=api.listScripts()||[];
  const suffix='/worldwright-studio/'+name;
  const found=files.find(p=>String(p).endsWith(suffix)||String(p)==='worldwright-studio/'+name);
  if(!found)throw Error('Worldwright component missing: '+name);
  return String(found);
}
module.exports={resolve};
