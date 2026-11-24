// Local-only preview: real Worker routes backed by a private SQLite database.
// The preview daemon owns this server. No Cloudflare credentials are used.
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import worker from '../worker/index.mjs';
await mkdir('.local-dev',{recursive:true});
const sqlite=new DatabaseSync('.local-dev/battle.sqlite');
sqlite.exec('CREATE TABLE IF NOT EXISTS dev_migrations(name TEXT PRIMARY KEY)');
for(const file of (await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort())if(!sqlite.prepare('SELECT 1 FROM dev_migrations WHERE name=?').get(file)){
 sqlite.exec(await readFile('migrations/'+file,'utf8'));sqlite.prepare('INSERT INTO dev_migrations(name) VALUES(?)').run(file);
}
function prepare(sql){const query=sqlite.prepare(sql);let args=[];const run=()=>{const r=query.run(...args);return {meta:{changes:Number(r.changes)}};};return {bind(...values){args=values;return this;},async first(){return query.get(...args)||null;},async all(){return {results:query.all(...args)};},async run(){return run();},runSync:run};}
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.stl':'model/stl','.glb':'model/gltf-binary','.png':'image/png','.webmanifest':'application/manifest+json'};
const root=resolve('dist');
const env={DB:{prepare,async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.runSync());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},ASSETS:{async fetch(req){let file=resolve(root,'.'+decodeURIComponent(new URL(req.url).pathname));if(file!==root&&!file.startsWith(root+'/'))return new Response('Not found',{status:404});if(file===root)file=root+'/index.html';try{return new Response(await readFile(file),{headers:{'content-type':types[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}}};
const argv=process.argv.slice(2),port=Number(process.env.PORT||(argv.includes('--port')?argv[argv.indexOf('--port')+1]:undefined)||5173);
createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end('Local preview error');console.error(e);}}).listen(port,'0.0.0.0',()=>console.log('Local Worker preview on port '+port));
