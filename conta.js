(function(root){
  'use strict';
  const needsChange=profile=>profile?.mustChangePassword===true;
  function validatePasswords(current,password,confirmation){
    if(!current)throw new Error('Informe sua senha atual.');
    if(typeof password!=='string'||password.trim().length<8)throw new Error('Escolha uma nova senha com pelo menos 8 caracteres.');
    if(password.length>4096)throw new Error('A nova senha é muito longa.');
    if(password!==confirmation)throw new Error('A confirmação da nova senha não confere.');
    if(password===current)throw new Error('A nova senha deve ser diferente da senha atual.');
  }
  // Só libera o perfil depois de o Firebase confirmar a troca da senha.
  // O checkpoint permite repetir apenas a gravação do perfil em caso de falha de rede.
  async function changePassword({auth,db,user,credential,current,password,confirmation,checkpoint={}}){
    const checkSession=()=>{if(!user||auth.currentUser?.uid!==user.uid)throw new Error('Seu acesso mudou. Entre novamente.');};
    checkSession();
    if(!checkpoint.changed){
      validatePasswords(current,password,confirmation);
      await user.reauthenticateWithCredential(credential(user.email,current));checkSession();
      await user.updatePassword(password);checkSession();
      checkpoint.changed=true;checkpoint.changedAt=new Date().toISOString();
    }
    if(user.getIdToken)await user.getIdToken(true);checkSession();
    const update={mustChangePassword:false,senhaAlteradaEm:checkpoint.changedAt};
    await db.ref('usuarios/'+user.uid).update(update);checkSession();
    return update;
  }
  async function sendRecovery(auth,email){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim()))throw new Error('Informe seu e-mail de acesso para receber o link de recuperação.');
    auth.languageCode='pt-BR';
    try{await auth.sendPasswordResetEmail(email.trim());}
    catch(error){if(error.code!=='auth/user-not-found')throw error;}
    return 'Escola Máximu’s: se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.';
  }
  const api={needsChange,validatePasswords,changePassword,sendRecovery};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  root.MaximusAccount=api;
  const $=id=>document.getElementById(id);
  let deps=null,pendingGate=null,sessionUser=null,checkpoint={},busy=false,operationVersion=0;
  const message=(id,text,type='')=>{const el=$(id);if(el){el.textContent=text;el.className='message '+type;}};
  const fields=prefix=>['Current','New','Confirm'].map(key=>$(prefix+key));
  function resetForm(prefix){
    $(prefix+'Form')?.reset();fields(prefix).forEach(el=>{if(el)el.disabled=false;});
    $(prefix+'Fields').hidden=false;$(prefix+'Save').textContent='Salvar nova senha';message(prefix+'Msg','');
  }
  function reset(){
    operationVersion++;busy=false;
    const resolve=pendingGate;pendingGate=null;resolve?.(null);sessionUser=null;checkpoint={};
    $('passwordGateView')?.classList.add('hidden');$('accountDialog')?.close();
    resetForm('gate');resetForm('account');
  }
  function requireChange(user,profile){
    if(!needsChange(profile))return Promise.resolve(profile);
    reset();sessionUser=user;
    ['loginView','adminLoginView','appView','adminAppView'].forEach(id=>$(id)?.classList.add('hidden'));
    $('passwordGateView').classList.remove('hidden');$('gateEmail').textContent=user.email;
    $('gateCurrent').focus();
    return new Promise(resolve=>{pendingGate=resolve;});
  }
  async function submit(prefix,event){
    event.preventDefault();if(busy||!sessionUser)return;
    busy=true;const user=sessionUser,attempt=checkpoint,version=operationVersion,button=$(prefix+'Save');button.disabled=true;
    message(prefix+'Msg',attempt.changed?'Concluindo a liberação do acesso…':'Alterando sua senha…');
    try{
      const [current,password,confirmation]=fields(prefix).map(el=>el.value);
      const update=await changePassword({...deps,user,current,password,confirmation,checkpoint:attempt});
      if(version!==operationVersion||sessionUser?.uid!==user.uid)return;
      resetForm(prefix);checkpoint={};
      if(prefix==='gate'){
        const resolve=pendingGate;pendingGate=null;$('passwordGateView').classList.add('hidden');
        resolve?.({...deps.profile(),...update});
      }else message('accountMsg','Sua senha foi alterada com sucesso.','ok');
      deps.onChanged?.(update);
    }catch(error){
      if(version!==operationVersion||sessionUser?.uid!==user.uid)return;
      if(attempt.changed){
        fields(prefix).forEach(el=>{el.value='';el.disabled=true;});$(prefix+'Fields').hidden=true;
        button.textContent='Concluir atualização';
        message(prefix+'Msg','Sua senha foi alterada. Não foi possível atualizar o perfil: '+deps.errorMessage(error)+' Toque em Concluir atualização para tentar novamente.','error');
      }else message(prefix+'Msg',deps.errorMessage(error),'error');
    }finally{if(version===operationVersion){busy=false;button.disabled=false;}}
  }
  function init(config){
    deps=config;deps.auth.languageCode='pt-BR';
    ['gate','account'].forEach(prefix=>$(prefix+'Form').addEventListener('submit',event=>submit(prefix,event)));
    $('gateSignOut').addEventListener('click',()=>deps.auth.signOut());
    $('gateRecovery').addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{message('gateMsg',await sendRecovery(deps.auth,sessionUser?.email),'ok');}catch(error){message('gateMsg',deps.errorMessage(error),'error');}
      finally{button.disabled=false;}
    });
    document.querySelectorAll('[data-account-settings]').forEach(button=>button.addEventListener('click',()=>{
      const user=deps.auth.currentUser;if(!user||needsChange(deps.profile()))return;
      sessionUser=user;checkpoint={};resetForm('account');$('accountEmail').textContent=user.email;
      $('accountDialog').showModal();
    }));
    $('closeAccount').addEventListener('click',()=>{if(!busy){$('accountDialog').close();resetForm('account');}});
    $('accountDialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();else resetForm('account');});
  }
  Object.assign(api,{init,reset,requireChange});
})(typeof window==='undefined'?globalThis:window);
