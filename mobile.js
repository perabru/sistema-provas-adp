(function(){
  'use strict';
  const $=id=>document.getElementById(id),small=window.matchMedia('(max-width: 1023px)');
  const links=[...document.querySelectorAll('.bottom-nav a')];
  function activeSection(id){
    links.forEach(link=>{const active=link.hash==='#'+id;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  links.forEach(link=>link.addEventListener('click',()=>activeSection(link.hash.slice(1))));
  document.querySelectorAll('[data-mobile-menu]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.mobileMenu)?.click()));
  // Os botões novos de resumo usam o mesmo diálogo existente, inclusive sem internet.
  document.querySelectorAll('[data-mobile-summary]').forEach(button=>button.addEventListener('click',()=>{
    const dialog=$('summaryDialog');if(!dialog)return;
    if(!$('summarySource').value&&$('conteudoMinistrado')?.value)$('summarySource').value=$('conteudoMinistrado').value;
    dialog.showModal();
  }));
  const preview=$('previewProva'),fitButton=$('fitPreview');let fit=true;
  function fitPreview(){
    if(!preview)return;
    const paper=preview.querySelector('.model-paper');
    const available=preview.clientWidth-16;
    preview.dataset.fit=String(fit);
    if(paper&&available>0)preview.style.setProperty('--preview-scale',String(Math.min(1,available/(215.9*96/25.4))));
    if(fitButton){fitButton.textContent=fit?'Ver em tamanho real':'Ajustar à tela';fitButton.setAttribute('aria-pressed',String(fit));}
  }
  fitButton?.addEventListener('click',()=>{fit=!fit;fitPreview();});
  if(preview){new MutationObserver(fitPreview).observe(preview,{childList:true});if('ResizeObserver' in window)new ResizeObserver(fitPreview).observe(preview);}
  fitPreview();
  const drawers=[...document.querySelectorAll('.app .sidebar')];
  function drawerState(){
    let open=false;
    drawers.forEach(sidebar=>{
      const visible=!sidebar.closest('.app').classList.contains('hidden');
      const expanded=small.matches&&visible&&sidebar.classList.contains('menu-open');
      sidebar.inert=small.matches&&!expanded;
      if(small.matches)sidebar.setAttribute('aria-hidden',String(!expanded));else sidebar.removeAttribute('aria-hidden');
      open ||=expanded;
    });
    document.documentElement.classList.toggle('drawer-open',open);
    const workspace=[...document.querySelectorAll('.app')].find(app=>!app.classList.contains('hidden'));
    document.documentElement.dataset.workspace=String(Boolean(workspace));
    if(workspace&&!location.hash)activeSection(workspace.id==='adminAppView'?'painel':'workspace');
  }
  drawers.forEach(sidebar=>new MutationObserver(drawerState).observe(sidebar,{attributes:true,attributeFilter:['class']}));
  document.querySelectorAll('.app').forEach(app=>new MutationObserver(()=>{drawerState();keyboardState();}).observe(app,{attributes:true,attributeFilter:['class']}));
  small.addEventListener?.('change',()=>{drawerState();fitPreview();});drawerState();
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!small.matches||document.querySelector('dialog[open]'))return;
    const sidebar=drawers.find(s=>s.classList.contains('menu-open')&&!s.closest('.app').classList.contains('hidden'));if(!sidebar)return;
    const focusable=[sidebar.closest('.app').querySelector('.hamburger-btn'),...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(el=>el&&!el.hidden);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  function keyboardState(){
    const focused=document.activeElement;
    document.documentElement.dataset.editing=String(Boolean(small.matches&&focused?.matches('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]')));
  }
  document.addEventListener('focusin',keyboardState);document.addEventListener('focusout',()=>queueMicrotask(keyboardState));
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      const entry=entries.filter(e=>e.isIntersecting&&!e.target.closest('.app')?.classList.contains('hidden')).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(entry)activeSection(entry.target.id);
    },{rootMargin:'-10% 0px -60% 0px',threshold:0});
    ['workspace','orientacoes','preview','painel','alunos','turmas'].forEach(id=>{const el=$(id);if(el)observer.observe(el);});
  }
  activeSection(location.hash.slice(1)||'workspace');
})();
