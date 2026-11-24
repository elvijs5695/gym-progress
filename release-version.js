// SemVer ordering matters when moving from the beta to the public release.
export function compareVersions(a,b){
 const parse=value=>{const [core,pre]=String(value||'0').split('+')[0].split(/-(.*)/s);return {core:core.split('.').map(x=>Number(x)||0),pre:pre===undefined?null:pre.split('.')};};
 const aa=parse(a),bb=parse(b);
 for(let i=0;i<Math.max(aa.core.length,bb.core.length);i++){const difference=(aa.core[i]||0)-(bb.core[i]||0);if(difference)return Math.sign(difference);}
 if(aa.pre===null||bb.pre===null)return aa.pre===bb.pre?0:aa.pre===null?1:-1;
 for(let i=0;i<Math.max(aa.pre.length,bb.pre.length);i++){
  const x=aa.pre[i],y=bb.pre[i];if(x===y)continue;if(x===undefined||y===undefined)return x===undefined?-1:1;
  const xn=/^\d+$/.test(x),yn=/^\d+$/.test(y);if(xn&&yn)return Math.sign(Number(x)-Number(y));if(xn!==yn)return xn?-1:1;return x<y?-1:1;
 }
 return 0;
}
