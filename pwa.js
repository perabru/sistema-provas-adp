(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const mode=window.matchMedia('(display-mode: standalone)');
  let promptEvent=null,installed=mode.matches||navigator.standalone===true,registration=null,reloading=false,formEdited=false;
  const message=text=>{const status=$('pwaStatus');if(status)status.textContent=text;};
  function render(){
    document.documentElement.dataset.standalone=String(installed);
    document.querySelectorAll('[data-install],[data-install-card]').forEach(el=>el.hidden=installed);
    document.querySelectorAll('[data-install]').forEach(el=>{
      el.dataset.ready=String(Boolean(promptEvent));
      el.setAttribute('aria-label',promptEvent?'Instalar aplicativo':'Ver como instalar o aplicativo');
    });
  }
  function openGuide(){
    const guide=$('installGuide');if(!guide)return;
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
    const android=/Android/.test(navigator.userAgent);
    $('installInstructions').textContent=ios
      ?'Abra este site no Safari. Toque em Compartilhar e depois em Adicionar à Tela de Início. Confirme em Adicionar.'
      :android?'Abra este site no Chrome do Android. Toque no menu ⋮ e escolha Instalar aplicativo ou Adicionar à tela inicial. Se estiver dentro do WhatsApp ou Instagram, use Abrir no navegador primeiro.'
      :'No Chrome ou Edge, use o ícone de instalação na barra de endereço ou a opção Instalar aplicativo no menu do navegador. Se a opção não aparecer, continue usando o site normalmente.';
    if(!guide.open)guide.showModal();
  }
  async function install(){
    if(installed)return;
    if(!promptEvent){openGuide();return;}
    const pending=promptEvent;promptEvent=null;render();
    try{
      await pending.prompt();
      const choice=await pending.userChoice;
      message(choice.outcome==='accepted'?'Instalação confirmada. Aguarde a conclusão pelo Android.':'Você pode instalar depois pelo botão Instalar aplicativo.');
    }catch{openGuide();message('Use o menu do navegador para concluir a instalação.');}
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();promptEvent=event;render();
    message('Aplicativo disponível para instalar. Toque em Instalar aplicativo.');
  });
  window.addEventListener('appinstalled',()=>{
    installed=true;promptEvent=null;render();message('Aplicativo instalado. Abra Provas Máximu’s pela tela inicial.');
    $('installGuide')?.close();
  });
  mode.addEventListener?.('change',event=>{installed=event.matches;render();});
  document.querySelectorAll('[data-install]').forEach(button=>button.addEventListener('click',install));
  $('closeInstallGuide')?.addEventListener('click',()=>$('installGuide').close());
  $('closeInstallGuideBottom')?.addEventListener('click',()=>$('installGuide').close());
  function connectivity(){
    const offline=navigator.onLine===false;
    const banner=$('offlineNotice');if(banner)banner.hidden=!offline;
    document.documentElement.dataset.offline=String(offline);
  }
  window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);connectivity();render();
  document.addEventListener('input',()=>{formEdited=true;});
  document.addEventListener('change',()=>{formEdited=true;});
  document.addEventListener('submit',event=>{
    if(navigator.onLine!==false||!['profLoginForm','adminLoginForm'].includes(event.target.id))return;
    event.preventDefault();event.stopImmediatePropagation();
    const target=$(event.target.id==='profLoginForm'?'profLoginMsg':'adminLoginMsg');
    if(target){target.textContent='Conecte-se à internet para entrar. O resumo de conteúdo continua disponível.';target.className='message error';}
  },true);
  function updateAvailable(){if(registration?.waiting&&navigator.serviceWorker.controller)$('pwaUpdate').hidden=false;}
  $('applyPwaUpdate')?.addEventListener('click',()=>{
    if(!registration?.waiting)return;
    const editing=formEdited||[$('questoesEditor')?.textContent,$('summarySource')?.value,$('summaryResult')?.value,$('conteudoMinistrado')?.value].some(t=>t?.trim());
    if(editing&&!window.confirm('Há conteúdo em edição. Copie ou exporte antes de atualizar. Atualizar e recarregar agora?'))return;
    reloading=true;registration.waiting.postMessage({type:'SKIP_WAITING'});
  });
  if('serviceWorker' in navigator&&window.isSecureContext){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
    window.addEventListener('load',async()=>{
      try{
        registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
        updateAvailable();
        registration.addEventListener('updatefound',()=>{
          const worker=registration.installing;
          worker?.addEventListener('statechange',()=>{if(worker.state==='installed')updateAvailable();});
        });
        navigator.serviceWorker.ready.then(()=>{if(navigator.onLine&&!promptEvent)message('Para instalar, toque em Instalar aplicativo ou use o menu do navegador.');});
      }catch{message('Abra o site com internet para preparar a instalação e os recursos offline.');}
    },{once:true});
  }
})();
