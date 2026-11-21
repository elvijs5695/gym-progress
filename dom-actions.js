import {parse} from './vendor/acorn.mjs';
// Legacy templates are parsed inertly. Event code is never evaluated by the browser.
// This small interpreter supports only declared UI actions and event/field reads.
const actionCache=new Map(),BLOCKED=new Set(['SCRIPT','IFRAME','OBJECT','EMBED','BASE','META','LINK','FOREIGNOBJECT']);
let actions=()=>({}),report=error=>console.error(error);
export function configureActions(getActions,onError){actions=getActions;if(onError)report=onError;}
function property(node,context){return node.computed?value(node.property,context):node.property.name;}
function value(node,c){
 if(!node)return undefined;
 switch(node.type){
  case'Literal':return node.value;
  case'ThisExpression':return c.element;
  case'Identifier':if(node.name==='event')return c.event;if(node.name==='undefined')return undefined;throw new Error('Unsupported UI identifier');
  case'ArrayExpression':return node.elements.map(x=>value(x,c));
  case'UnaryExpression':{const v=value(node.argument,c);if(node.operator==='!')return!v;if(node.operator==='-')return-v;if(node.operator==='+')return+v;break;}
  case'LogicalExpression':{const a=value(node.left,c);if(node.operator==='&&')return a&&value(node.right,c);if(node.operator==='||')return a||value(node.right,c);if(node.operator==='??')return a??value(node.right,c);break;}
  case'ConditionalExpression':return value(node.test,c)?value(node.consequent,c):value(node.alternate,c);
  case'BinaryExpression':{const a=value(node.left,c),b=value(node.right,c);switch(node.operator){case'===':return a===b;case'!==':return a!==b;case'==':return a==b;case'!=':return a!=b;case'+':return a+b;case'-':return a-b;case'<':return a<b;case'>':return a>b;case'<=':return a<=b;case'>=':return a>=b;}break;}
  case'MemberExpression':{const object=value(node.object,c),key=property(node,c);if(object===c.element&&['value','checked','files'].includes(key))return object[key];if(object===c.event&&['key','target','currentTarget'].includes(key))return object[key];if(object===c.element.files&&Number.isInteger(key)&&key>=0&&key<10)return object[key];throw new Error('Unsupported UI property');}
  case'CallExpression':{
   if(node.callee.type!=='MemberExpression'||node.callee.computed)throw new Error('Unsupported UI call');
   const base=node.callee.object,name=node.callee.property.name,args=node.arguments.map(x=>value(x,c));
   if(base.type==='Identifier'&&base.name==='gp'){const api=actions();if(!Object.hasOwn(api,name)||typeof api[name]!=='function')throw new Error(`Unknown UI action: ${name}`);return api[name](...args);}
   if(base.type==='Identifier'&&base.name==='event'&&['stopPropagation','preventDefault'].includes(name))return c.event[name]();
   throw new Error('Unsupported UI call');
  }
 }
 throw new Error(`Unsupported UI expression: ${node.type}`);
}
function statement(node,c){if(node.type==='ExpressionStatement')return value(node.expression,c);if(node.type==='IfStatement')return value(node.test,c)?statement(node.consequent,c):node.alternate?statement(node.alternate,c):undefined;if(node.type==='BlockStatement'||node.type==='Program'){let result;for(const s of node.body)result=statement(s,c);return result;}throw new Error('Unsupported UI statement');}
export function runAction(source,event,element){if(source.length>4096)throw new Error('UI action too long');let ast=actionCache.get(source);if(!ast){ast=parse(source,{ecmaVersion:2022});if(actionCache.size>2048)actionCache.clear();actionCache.set(source,ast);}return statement(ast,{event,element});}
function safeURL(raw,{image=false}={}){try{const url=new URL(raw,document.baseURI);return ['http:','https:'].includes(url.protocol)&&(!image||url.origin===new URL(document.baseURI).origin);}catch{return false;}}
export function setHTML(target,html){
 const template=document.createElement('template');template.innerHTML=String(html??'');
 for(const el of template.content.querySelectorAll('*')){
  if(BLOCKED.has(el.tagName.toUpperCase())){el.remove();continue;}
  for(const attr of [...el.attributes]){
   const name=attr.name.toLowerCase();
   if(name.startsWith('on')){el.removeAttribute(attr.name);if(['onclick','oninput','onchange','onkeydown'].includes(name)){const source=attr.value;el.setAttribute(`data-action-${name.slice(2)}`,source);el.addEventListener(name.slice(2),event=>{if(el.dataset.actionBusy==='true')return;try{const result=runAction(source,event,el);if(result?.then){const button=el.tagName==='BUTTON',wasDisabled=el.disabled;if(button){el.dataset.actionBusy='true';el.disabled=true;el.setAttribute('aria-busy','true');}result.catch(report).finally(()=>{if(button){delete el.dataset.actionBusy;el.disabled=wasDisabled;el.removeAttribute('aria-busy');}});}}catch(error){report(error);}});}continue;}
   if(name==='srcdoc'||name==='xlink:href'||name==='formaction'||(name==='style'&&/url\s*\(|expression\s*\(|@import/i.test(attr.value))){el.removeAttribute(attr.name);continue;}
   if(['href','src'].includes(name)&&!safeURL(attr.value,{image:name==='src'}))el.removeAttribute(attr.name);
   if(name==='target'&&attr.value==='_blank')el.setAttribute('rel','noopener noreferrer');
  }
 }
 target.replaceChildren(template.content);return target;
}
