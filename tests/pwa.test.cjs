const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function worker(){
  const events={},storage=new Map(),network=[],state={fail:false,skipped:0,claimed:0};
  const key=request=>typeof request==='string'?request:request.url;
  const caches={async open(name){if(!storage.has(name))storage.set(name,new Map());const data=storage.get(name);return {async addAll(urls){for(const url of urls)data.set(url,{cached:url});},async match(request){return data.get(key(request));},async put(request,response){data.set(key(request),response);}};},async keys(){return [...storage.keys()];},async delete(name){return storage.delete(name);}};
  const context={URL,Response,Set,caches,fetch:async request=>{network.push(key(request));if(state.fail)throw Error('offline');return {ok:true,type:'basic',clone(){return this;}};},self:{location:{href:'https://perabru.github.io/sistema-provas-adp/sw.js'},addEventListener:(type,handler)=>events[type]=handler,clients:{claim:async()=>state.claimed++},skipWaiting:async()=>state.skipped++}};
  vm.runInNewContext(read('sw.js'),context);
  async function lifecycle(type,data={}){let promise;events[type]({...data,waitUntil:p=>promise=p});await promise;}
  async function request(url,extra={}){let response;events.fetch({request:{url,method:'GET',mode:'cors',...extra},respondWith:p=>response=p});return await response;}
  return {events,storage,network,state,lifecycle,request};
}
test('manifest instala no subdiretório correto, com ícones Android válidos',()=>{
  const m=JSON.parse(read('manifest.webmanifest'));
  const base='https://perabru.github.io/sistema-provas-adp/';
  assert.equal(new URL(m.scope,base).pathname,'/sistema-provas-adp/');
  assert.equal(new URL(m.start_url,base).pathname,'/sistema-provas-adp/');
  assert.equal(m.display,'standalone');assert.ok(m.icons.some(i=>i.purpose==='maskable'));
  for(const icon of m.icons){const png=fs.readFileSync(path.join(root,icon.src));const [w,h]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);}
  assert.match(read('index.html'),/rel="manifest" href="manifest.webmanifest"/);
});
test('prepara os arquivos públicos e mantém o resumo disponível offline',async()=>{
  const w=worker();await w.lifecycle('install');assert.equal(w.state.skipped,0);
  const urls=[...w.storage.values()][0].keys();
  for(const url of urls){const file=new URL(url).pathname.replace('/sistema-provas-adp/','');assert.ok(fs.existsSync(path.join(root,file)),file);}
  w.state.fail=true;
  const page=await w.request('https://perabru.github.io/sistema-provas-adp/?source=pwa',{mode:'navigate'});
  assert.equal(page.cached,'https://perabru.github.io/sistema-provas-adp/index.html');
  const summary=await w.request('https://perabru.github.io/sistema-provas-adp/resumo.js?v=20261022-firebase4');
  assert.match(summary.cached,/resumo\.js/);
});
test('uma versão pendente não mistura HTML novo com scripts antigos',async()=>{
  const w=worker();await w.lifecycle('install');
  const page=await w.request('https://perabru.github.io/sistema-provas-adp/',{mode:'navigate'});
  assert.match(page.cached,/index\.html$/);assert.equal(w.network.length,0);
  const resources=[...read('index.html').matchAll(/(?:src|href)="([^" ]+\?v=[^" ]+)"/g)].map(match=>new URL(match[1],'https://perabru.github.io/sistema-provas-adp/').href);
  for(const resource of resources)assert.ok((await w.request(resource))?.cached,resource);
  assert.equal(w.network.length,0);
});
test('não intercepta Firebase, outros sites Pages, POST ou caminhos privados',async()=>{
  const w=worker();await w.lifecycle('install');
  for(const url of ['https://siteoficial-2279a-default-rtdb.firebaseio.com/alunos.json','https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js','https://perabru.github.io/outro-site/','https://perabru.github.io/sistema-provas-adp/backup.json'])assert.equal(await w.request(url),undefined);
  assert.equal(await w.request('https://perabru.github.io/sistema-provas-adp/index.html',{method:'POST'}),undefined);
  assert.equal(w.network.length,0);
});
test('limpa somente versões deste aplicativo e atualiza apenas após solicitação',async()=>{
  const w=worker();w.storage.set('maximus-shell-/sistema-provas-adp/-antiga',new Map());w.storage.set('cache-de-outro-site',new Map());
  await w.lifecycle('install');await w.lifecycle('activate');
  assert.equal(w.storage.has('maximus-shell-/sistema-provas-adp/-antiga'),false);assert.equal(w.storage.has('cache-de-outro-site'),true);assert.equal(w.state.skipped,0);
  await w.lifecycle('message',{data:{type:'SKIP_WAITING'}});assert.equal(w.state.skipped,1);assert.equal(w.state.claimed,1);
});
function installUI({secure=false,editing=false,userAgent='Chrome Android',platform='',maxTouchPoints=0,standalone=false}={}){
  const windowEvents={},docEvents={},workerEvents={},nodes=new Map(),state={prompts:0,messages:0,reloads:0,confirm:true};
  const element=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,dataset:{},textContent:'',value:'',open:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},setAttribute(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
  const button=element('install'),card=element('card');
  const registration={waiting:{postMessage(){state.messages++;}},addEventListener(){}};
  const navigator={userAgent,platform,maxTouchPoints,standalone,onLine:true};
  if(secure)navigator.serviceWorker={controller:{},addEventListener:(t,h)=>workerEvents[t]=h,register:async()=>registration,ready:Promise.resolve()};
  const window={isSecureContext:secure,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(t,h)=>windowEvents[t]=h,confirm:()=>state.confirm};
  const document={documentElement:{dataset:{}},getElementById:element,querySelectorAll:selector=>selector==='[data-install],[data-install-card]'?[button,card]:selector==='[data-install]'?[button]:[],addEventListener:(t,h)=>docEvents[t]=h};
  if(editing)element('questoesEditor').textContent='Questões em edição';
  vm.runInNewContext(read('pwa.js'),{window,navigator,document,location:{reload:()=>state.reloads++}});
  return {windowEvents,docEvents,workerEvents,element,button,card,state};
}
test('instalação usa gesto do usuário e consome o prompt uma única vez',async()=>{
  const ui=installUI();let prevented=false;
  ui.windowEvents.beforeinstallprompt({preventDefault(){prevented=true;},prompt:async()=>ui.state.prompts++,userChoice:Promise.resolve({outcome:'accepted'})});
  assert.equal(prevented,true);assert.equal(ui.state.prompts,0);
  await ui.button.handlers.click();assert.equal(ui.state.prompts,1);assert.equal(ui.button.hidden,false);
  await ui.button.handlers.click();assert.equal(ui.state.prompts,1);assert.equal(ui.element('installGuide').open,true);
  ui.windowEvents.appinstalled();assert.equal(ui.button.hidden,true);assert.equal(ui.card.hidden,true);
});
test('fallback Android explica instalação, sem simular sucesso',async()=>{
  const ui=installUI();await ui.button.handlers.click();assert.equal(ui.element('installGuide').open,true);assert.match(ui.element('installInstructions').textContent,/Chrome do Android/);assert.equal(ui.button.hidden,false);
});
test('atualização respeita conteúdo em edição antes de recarregar',async()=>{
  const ui=installUI({secure:true,editing:true});await ui.windowEvents.load();assert.equal(ui.element('pwaUpdate').hidden,false);
  ui.state.confirm=false;ui.element('applyPwaUpdate').handlers.click();assert.equal(ui.state.messages,0);
  ui.state.confirm=true;ui.element('applyPwaUpdate').handlers.click();assert.equal(ui.state.messages,1);
  ui.workerEvents.controllerchange();assert.equal(ui.state.reloads,1);
});
test('atualização também protege alterações nos formulários da coordenação',async()=>{
  const ui=installUI({secure:true});await ui.windowEvents.load();
  ui.docEvents.input();ui.state.confirm=false;
  ui.element('applyPwaUpdate').handlers.click();assert.equal(ui.state.messages,0);
});

test('iPhone e iPadOS mostram instruções específicas e não simulam instalação',async()=>{
 for(const device of [{userAgent:'iPhone Safari'},{userAgent:'Safari',platform:'MacIntel',maxTouchPoints:5}]){
  const ui=installUI(device);await ui.button.handlers.click();assert.equal(ui.element('installGuide').open,true);
  assert.equal(ui.element('iosInstallSteps').hidden,false);assert.match(ui.element('installInstructions').textContent,/Safari/);
  assert.equal(ui.state.prompts,0);assert.match(ui.button.textContent,/iPhone/);
 }
 const installed=installUI({userAgent:'iPhone Safari',standalone:true});assert.equal(installed.button.hidden,true);
});
