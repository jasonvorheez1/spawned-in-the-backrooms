// Basis Universal (Apache-2.0), pinned with Three r186. Lazy, renderer-specific KTX2 workers.
export const BASIS='/cdn/value.0b3b2185b7e99cf6a986f805f112097b4d1486fbc11f29faf07ac54b18fa60b1.txt';
let payload;
async function source(){if(!payload)payload=fetch(BASIS).then(async r=>{if(!r.ok)throw Error('Texture decoder could not load ('+r.status+')');return r.json();}).catch(e=>{payload=null;throw e;});return payload;}
export function createCodecs(T,KTX2Loader,renderer){
 let decoder=null,job=null,dead=false;const urls=[];
 async function configure(loader,bytes){
  const head=new DataView(bytes);if(bytes.byteLength<20||head.getUint32(0,true)!==0x46546c67)return;
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,head.getUint32(12,true))).trim());
  if(!(json.extensionsUsed||[]).includes('KHR_texture_basisu')&&!(json.textures||[]).some(t=>t.extensions?.KHR_texture_basisu))return;
  if(!job)job=(async()=>{const src=await source();if(dead)throw Error('The viewer closed while its decoder was loading');const binary=Uint8Array.from(atob(src.wasmBase64),c=>c.charCodeAt(0));const js=URL.createObjectURL(new Blob([src.js],{type:'text/javascript'})),wasm=URL.createObjectURL(new Blob([binary],{type:'application/wasm'}));urls.push(js,wasm);
   const manager=new T.LoadingManager();manager.setURLModifier(url=>url.endsWith('basis_transcoder.js')?js:url.endsWith('basis_transcoder.wasm')?wasm:url);
   decoder=new KTX2Loader(manager).setTranscoderPath('/wws-basis/').setWorkerLimit(1).detectSupport(renderer);return decoder;
  })().catch(e=>{job=null;throw e;});
  const ready=await job;if(dead)throw Error('The viewer closed before texture decoding');loader.setKTX2Loader(ready);
 }
 return {configure,dispose(){dead=true;decoder?.dispose();for(const url of urls)URL.revokeObjectURL(url);urls.length=0;}};
}
