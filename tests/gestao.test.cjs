const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const M=require('../gestao.js');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8'),ctx={};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('/* Importação e regras pedagógicas.'),source.indexOf('/* Cabeçalhos dos modelos')),ctx);
const key=ctx.MaximusCore.classKey;
const classes=['1A','2B'].map(nome=>({nome,key:key(nome)}));
const teacher={id:'prof-1',role:'professor',ativo:true,nome:'Teste',turmas:['1A'],mustChangePassword:true};
test('associação atualiza lista e permissões juntas, sem tocar em conta ou alunos',()=>{
 const p=M.associationPlan(teacher,classes,[key('2B'),key('2B')],[key('1A')],key);
 assert.deepEqual(p.names,['2B']);assert.deepEqual(p.updates,{'usuarios/prof-1/turmas':['2B'],'usuarios/prof-1/turmasAcesso':{[key('2B')]:true}});
});
test('retirar todos os vínculos esvazia as permissões',()=>{
 const p=M.associationPlan(teacher,classes,[],[key('1A')],key);assert.deepEqual(p.names,[]);assert.deepEqual(p.updates['usuarios/prof-1/turmasAcesso'],{});
});
test('professor sem turma pode receber o primeiro vínculo',()=>{
 const p=M.associationPlan({...teacher,turmas:undefined},classes,[key('1A')],[],key);assert.deepEqual(p.names,['1A']);
});
test('não associa professor removido, coordenação ou UID inválido',()=>{
 for(const value of [null,{...teacher,ativo:false},{...teacher,role:'coordenacao'},{...teacher,id:'outro/caminho'}])assert.throws(()=>M.associationPlan(value,classes,[],[key('1A')],key));
});
test('impede sobrescrever vínculos alterados por outra coordenação',()=>{
 assert.throws(()=>M.associationPlan({...teacher,turmas:['1A','2B']},classes,[key('1A')],[key('1A')],key),/mudaram/);
 assert.doesNotThrow(()=>M.associationPlan({...teacher,turmas:['2B','1A']},classes,[key('1A')],[key('1A'),key('2B')],key));
});
test('turma removida impede concessão de acesso',()=>{
 assert.throws(()=>M.associationPlan(teacher,[classes[0]],[key('2B')],[key('1A')],key),/removida/);
});
