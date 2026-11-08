// Named paper presets only. Layout math belongs to pagelayout; stored overrides win in config.
const PRESETS = {
  book: {unit:'mm',width:152.4,height:228.6,marginL:25.4,marginR:25.4,headerH:25.4,footerH:25.4,leading:5.08},
  a3: {unit:'mm',width:297,height:420,marginL:25.4,marginR:25.4,headerH:25.4,footerH:25.4,leading:5.08},
  piano: {unit:'mm',width:420,height:297,marginL:25.4,marginR:25.4,headerH:25.4,footerH:0,leading:5.08}
};
export function preset(name='book'){
  if(!Object.prototype.hasOwnProperty.call(PRESETS,name))throw Error('Unknown page size: '+name);
  return {...PRESETS[name]};
}
export function names(){return Object.keys(PRESETS);}
