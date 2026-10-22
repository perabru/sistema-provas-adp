/* Executar somente em ambiente administrativo autenticado no projeto Firebase. */
'use strict';
const PROJECT='siteoficial-2279a';
const DATABASE='https://siteoficial-2279a-default-rtdb.firebaseio.com';
async function provision({auth,db,temporaryPassword,coordEmail='coordenação@maximus.com.br'}){
  if(typeof temporaryPassword!=='string'||temporaryPassword.length<6)throw new Error('Informe a senha temporária por entrada padrão.');
  const accounts=[{email:'admin@maximus.com.br',nome:'Administrador Máximu’s',nivelAcesso:'administrador'},
    {email:coordEmail,nome:'Coordenação Máximu’s',nivelAcesso:'coordenacao'}];
  const result=[];
  for(const account of accounts){
    let user,created=false;
    try{user=await auth.getUserByEmail(account.email);}
    catch(error){
      if(error.code!=='auth/user-not-found')throw error;
      user=await auth.createUser({email:account.email,password:temporaryPassword,displayName:account.nome,emailVerified:false,disabled:false});created=true;
    }
    // Preserva a senha de contas existentes, os dados adicionais e os alunos.
    await db.ref('usuarios/'+user.uid).update({...account,role:'coordenacao',ativo:true,mustChangePassword:true,atualizadoEm:new Date().toISOString()});
    result.push({email:account.email,uid:user.uid,created,mustChangePassword:true});
  }
  return result;
}
async function main(){
  let input='';for await(const chunk of process.stdin)input+=chunk;
  const config=JSON.parse(input);
  if(config.projectId!==PROJECT)throw new Error('Confirme o identificador do projeto solicitado.');
  const {initializeApp,applicationDefault}=require('firebase-admin/app');
  const {getAuth}=require('firebase-admin/auth');const {getDatabase}=require('firebase-admin/database');
  const app=initializeApp({credential:applicationDefault(),projectId:PROJECT,databaseURL:DATABASE});
  console.log(JSON.stringify(await provision({auth:getAuth(app),db:getDatabase(app),temporaryPassword:config.temporaryPassword,coordEmail:config.coordEmail}),null,2));
}
module.exports={provision};
if(require.main===module)main().catch(error=>{console.error('Não foi possível concluir o provisionamento. Código:',/^[a-zA-Z0-9_/-]+$/.test(error.code||'')?error.code:'configuracao-ou-acesso');process.exitCode=1;});
