/* Gestão manual e navegação da coordenação. */
(function(root){
  'use strict';
  const sameSet=(a,b)=>JSON.stringify([...new Set(a)].sort())===JSON.stringify([...new Set(b)].sort());
  function associationPlan(teacher,classes,selected,baseline,classKey){
    if(!teacher||teacher.role!=='professor'||teacher.ativo===false)throw new Error('Selecione um professor ativo.');
    if(!teacher.id||/[.#$\[\]/\u0000-\u001f]/.test(teacher.id))throw new Error('O cadastro do professor é inválido.');
    if(!Array.isArray(baseline)||!sameSet((teacher.turmas||[]).map(classKey),baseline))throw new Error('Os vínculos deste professor mudaram. Recarregue os vínculos antes de salvar.');
    const keys=[...new Set(selected)],available=new Map(classes.map(c=>[c.key,c.nome]));
    if(keys.some(key=>!available.has(key)))throw new Error('Uma turma selecionada foi removida. Recarregue os vínculos.');
    const names=keys.map(key=>available.get(key)).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return {names,updates:{['usuarios/'+teacher.id+'/turmas']:names,['usuarios/'+teacher.id+'/turmasAcesso']:Object.fromEntries(names.map(name=>[classKey(name),true]))}};
  }
  const api={associationPlan,sameSet};root.MaximusManagement=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root.document)return;
  const admin=document.getElementById('adminAppView');if(!admin)return;
  const labels={painel:'Coordenação',professores:'Professores',turmas:'Turmas',vinculos:'Associar professor e turma',alunos:'Alunos','cadastro-aluno':'Cadastrar aluno',planilha:'Importar planilha',coordenadores:'Coordenadores',adaptacoes:'Regras de adaptação',backup:'Backup e manutenção'};
  const panels=[...admin.querySelectorAll('[data-admin-page]')];
  const visible=()=>!admin.classList.contains('hidden');
  function show(page,focus=false){
    page=Object.hasOwn(labels,page)?page:'painel';
    panels.forEach(panel=>panel.classList.toggle('hidden',panel.dataset.adminPage!==page));
    admin.dataset.activePage=page;
    const heading=document.getElementById('adminPageTitle');if(heading)heading.textContent=labels[page];
    admin.querySelectorAll('a[href^="#"]').forEach(a=>{const active=a.hash==='#'+page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.getElementById('adminBack')?.classList.toggle('hidden',page==='painel');
    if(focus){heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});}
    return page;
  }
  function navigate(page,openId){
    const target=show(page,true);
    if(location.hash!=='#'+target)history.pushState(null,'','#'+target);
    if(openId){const detail=document.getElementById(openId);if(detail){detail.open=true;detail.querySelector('input')?.focus({preventScroll:true});detail.scrollIntoView({block:'start'});}}
    if(admin.querySelector('.sidebar.menu-open'))document.getElementById('adminHamburger')?.click();
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-admin-target],a[href^="#"]');
    if(!trigger||!admin.contains(trigger)||!visible())return;
    const page=trigger.dataset.adminTarget||trigger.hash?.slice(1);if(!Object.hasOwn(labels,page))return;
    event.preventDefault();navigate(page,trigger.dataset.adminOpen);
  });
  window.addEventListener('hashchange',()=>{if(visible())show(location.hash.slice(1),true);});
  window.addEventListener('popstate',()=>{if(visible())show(location.hash.slice(1),true);});
  new MutationObserver(()=>{if(visible())show(location.hash.slice(1),true);else show('painel');}).observe(admin,{attributes:true,attributeFilter:['class']});
  api.navigate=navigate;api.resetView=()=>show('painel');
  show(location.hash.slice(1));
})(typeof window!=='undefined'?window:globalThis);
