const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const account=require('../conta.js');
const {provision}=require('../scripts/provisionar-acessos.cjs');
function fixture(){
  const calls=[],state={failWrite:false};
  const user={uid:'user-test',email:'conta@example.test',async reauthenticateWithCredential(){calls.push('reauth');},async updatePassword(){calls.push('password');},async getIdToken(){calls.push('token');}};
  const auth={currentUser:user},db={ref(location){return {async update(value){calls.push({location,value});if(state.failWrite)throw Error('offline');}};}};
  return {user,auth,db,calls,state,credential:()=>({}),current:'Senha anterior',password:'Nova senha segura',confirmation:'Nova senha segura',checkpoint:{}};
}
test('troca exige confirmação da senha atual, nova senha válida e diferente',()=>{
  for(const args of [['','abcdefgh','abcdefgh'],['mesma-senha','mesma-senha','mesma-senha'],['atual','123','123'],['atual','12345678','diferente']])assert.throws(()=>account.validatePasswords(...args));
  assert.equal(account.needsChange({mustChangePassword:true}),true);
  assert.equal(account.needsChange({role:'coordenacao'}),false);
});
test('só libera o perfil após reautenticar, trocar a senha e renovar o token',async()=>{
  const f=fixture();const update=await account.changePassword(f);
  assert.deepEqual(f.calls.slice(0,3),['reauth','password','token']);
  assert.equal(f.calls[3].location,'usuarios/user-test');assert.equal(update.mustChangePassword,false);
  assert.equal(JSON.stringify(f.calls).includes(f.password),false);
});
test('falha de senha atual não altera senha nem perfil',async()=>{
  const f=fixture();f.user.reauthenticateWithCredential=async()=>{throw Error('senha incorreta');};
  await assert.rejects(account.changePassword(f),/senha incorreta/);assert.deepEqual(f.calls,[]);
});
test('falha ao salvar perfil mantém o bloqueio e permite tentar somente a gravação',async()=>{
  const f=fixture();f.state.failWrite=true;await assert.rejects(account.changePassword(f),/offline/);
  assert.equal(f.checkpoint.changed,true);assert.equal(f.calls.filter(x=>x==='password').length,1);
  f.state.failWrite=false;const update=await account.changePassword(f);assert.equal(update.mustChangePassword,false);
  assert.equal(f.calls.filter(x=>x==='password').length,1);
});
test('troca interrompe quando a conta autenticada muda',async()=>{
  const f=fixture();f.user.reauthenticateWithCredential=async()=>{f.auth.currentUser={uid:'outro'};};
  await assert.rejects(account.changePassword(f),/acesso mudou/);assert.deepEqual(f.calls,[]);
});
test('recuperação usa Firebase em português sem revelar a existência da conta',async()=>{
  const auth={async sendPasswordResetEmail(email){assert.equal(email,'teste@example.test');const e=Error();e.code='auth/user-not-found';throw e;}};
  const result=await account.sendRecovery(auth,'teste@example.test');assert.equal(auth.languageCode,'pt-BR');assert.match(result,/se este e-mail estiver cadastrado/);
  await assert.rejects(account.sendRecovery(auth,'não é email'),/e-mail de acesso/);
});
test('painel e dados em tempo real aguardam a conclusão da troca obrigatória',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  const start=source.indexOf('  async function finishAuthentication('),end=source.indexOf('\n  let turmaRegistry',start);
  let resolveGate,reads=0;const user={uid:'test'},auth={currentUser:user};
  const context={getProfile:async()=>({role:'coordenacao',mustChangePassword:true}),authenticationVersion:1,currentUser:null,currentProfile:null,auth,
    window:{MaximusAccount:{needsChange:account.needsChange,requireChange:()=>new Promise(resolve=>resolveGate=resolve)}},showAdminApp(){reads++;},startAdminRealtime(){reads++;},watchSessionProfile(){},showProfApp(){reads++;},startProfessorRealtime(){reads++;}};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  const pending=context.finishAuthentication(user,1);await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,0);
  resolveGate({role:'coordenacao',mustChangePassword:false});await pending;assert.equal(reads,2);
});
test('provisionamento mantém contas existentes e não publica senhas',async()=>{
  const created=[],writes=[];
  const auth={async getUserByEmail(email){if(email.startsWith('admin'))return {uid:'existing'};const e=Error();e.code='auth/user-not-found';throw e;},async createUser(data){created.push(data);return {uid:'new'};}};
  const result=await provision({auth,db:{ref(location){return {async update(data){writes.push({location,data});}};}},temporaryPassword:'Senha temporária'});
  assert.equal(created.length,1);assert.equal(created[0].email,'coordenação@maximus.com.br');assert.equal(result[0].created,false);
  assert.equal(writes[0].data.nivelAcesso,'administrador');assert.equal(writes.every(w=>w.data.mustChangePassword===true),true);
  assert.equal(JSON.stringify({result,writes}).includes('Senha temporária'),false);
});
