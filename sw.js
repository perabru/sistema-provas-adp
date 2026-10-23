/* Cache público do aplicativo. Não armazena respostas do Firebase nem dados dos alunos. */
'use strict';
const VERSION='interface-elegante-20261023-v4';
const BASE=new URL('./',self.location.href);
const PREFIX='maximus-shell-'+BASE.pathname+'-';
const CACHE=PREFIX+VERSION;
const SHELL=[
  './index.html','./interface.css?v=20261023-elegante4','./styles.css?v=20261023-elegante4','./mobile.css?v=20261023-elegante4',
  './gestao.js?v=20261023-elegante4','./planilhas.js?v=20261023-elegante4','./conta.js?v=20261023-elegante4','./pedagogia.js?v=20261023-elegante4','./app.js?v=20261023-elegante4','./resumo.js?v=20261023-elegante4',
  './mobile.js?v=20261023-elegante4','./pwa.js?v=20261023-elegante4',
  './manifest.webmanifest','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'
].map(path=>new URL(path,BASE).href);
const ALLOWED=new Set(SHELL);
const INDEX=new URL('./index.html',BASE).href;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  // Uma versão nova aguarda o usuário terminar a edição antes de assumir o controle.
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
});
const cacheable=response=>response.ok&&response.type==='basic';
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==BASE.origin)return;
  const isPage=request.mode==='navigate'&&(url.pathname===BASE.pathname||url.pathname===new URL(INDEX).pathname);
  if(!isPage&&!ALLOWED.has(url.href))return;
  if(isPage){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      // Mantém o HTML e os scripts na mesma versão até o usuário atualizar.
      const fallback=await cache.match(INDEX);
      if(fallback)return fallback;
      try{
        const response=await fetch(request);
        if(response.ok)return response;
      }catch{}
      return new Response('Reconecte à internet para abrir o aplicativo pela primeira vez.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
    })());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(request);
    if(cached)return cached;
    const response=await fetch(request);
    if(cacheable(response))await cache.put(request,response.clone());
    return response;
  })());
});
