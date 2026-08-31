/**
 * Combine three editor files into a single HTML document for sandboxed iframe `srcDoc`.
 * - CSS is inlined as <style> inside <head>
 * - JS is inlined as <script> before </body>
 * - Existing <link href="styles.css"> and <script src="script.js"> references are stripped
 *   and replaced with inlined content (no file server needed).
 * - Missing <head>/<body> are handled gracefully — malformed HTML still renders via browser parser.
 */
export function combineFiles(html: string, css: string, js: string): string {
  // Strip OneCompiler-style external references to avoid 404s in srcDoc
  let processedHtml = html
    // <link rel="stylesheet" href="styles.css"> variants
    .replace(/<link[^>]*href\s*=\s*["']\s*styles\.css\s*["'][^>]*>\s*/gi, "")
    // <script src="script.js"></script> variants
    .replace(/<script[^>]*src\s*=\s*["']\s*script\.js\s*["'][^>]*>\s*<\/script>\s*/gi, "");

  const styleTag = `<style>\n${css}\n</style>`;
  const interceptorScript = `<script>(function(){var o={log:console.log.bind(console),warn:console.warn.bind(console),error:console.error.bind(console),info:console.info.bind(console)};function s(v){var seen=new WeakSet();try{return JSON.stringify(v,function(k,val){if(typeof val==='function')return'[Function'+(val.name?': '+val.name:'')+']';if(typeof val==='symbol')return'[Symbol]';if(val===undefined)return'[undefined]';if(typeof val==='bigint')return val.toString()+'n';if(val!==null&&typeof val==='object'){if(seen.has(val))return'[Circular]';seen.add(val);}return val;});}catch(e){try{return String(v);}catch(_){return'[Unserializable]';}}}function a(arg){if(typeof arg==='string')return arg;if(arg===null)return'null';if(arg===undefined)return'undefined';if(typeof arg==='number'||typeof arg==='boolean'||typeof arg==='bigint')return String(arg);if(typeof arg==='function')return'[Function'+(arg.name?': '+arg.name:'')+']';if(arg instanceof Error)return arg.stack||arg.message||String(arg);try{var j=s(arg);return j;}catch{return String(arg);}}function p(l,args){try{var m=args.map(a).join(' ');window.parent.postMessage({source:'ladecompile-preview',type:'console',level:l,message:m,timestamp:Date.now()},'*');}catch(_){}}console.log=function(){try{o.log.apply(console,arguments);}catch(_){}p('log',Array.from(arguments));};console.warn=function(){try{o.warn.apply(console,arguments);}catch(_){}p('warn',Array.from(arguments));};console.error=function(){try{o.error.apply(console,arguments);}catch(_){}p('error',Array.from(arguments));};console.info=function(){try{o.info.apply(console,arguments);}catch(_){}p('log',Array.from(arguments));};window.addEventListener('error',function(e){p('error',[e.message+(e.filename?' at '+e.filename+':'+e.lineno+':'+e.colno:'')]);});window.addEventListener('unhandledrejection',function(e){var r=e.reason;var m=r?(r.stack||r.message||String(r)):'Unhandled promise rejection';p('error',[m]);});var prev=window.onerror;window.onerror=function(m,u,l,c,er){p('error',[m+(l?' ('+l+':'+c+')':'')]);if(typeof prev==='function')return prev.apply(this,arguments);return false;};})();<\/script>`;
  const scriptTag = `${interceptorScript}\n<script>\n${js}\n<\/script>`;

  // Inject CSS
  if (/<\/head>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<\/head>/i, `${styleTag}\n</head>`);
  } else if (/<head[^>]*>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<head[^>]*>/i, (m) => `${m}\n${styleTag}`);
  } else if (/<html[^>]*>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<html[^>]*>/i, (m) => `${m}\n<head>\n${styleTag}\n</head>`);
  } else {
    processedHtml = `${styleTag}\n${processedHtml}`;
  }

  // Inject JS — before </body> for correct DOM-ready semantics, fallback otherwise
  if (/<\/body>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<\/body>/i, `${scriptTag}\n</body>`);
  } else if (/<\/html>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<\/html>/i, `${scriptTag}\n</html>`);
  } else {
    processedHtml = `${processedHtml}\n${scriptTag}`;
  }

  return processedHtml;
}
