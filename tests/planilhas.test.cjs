const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../planilhas.js');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('/* Importação e regras pedagógicas.'),source.indexOf('/* Cabeçalhos dos modelos')),ctx);
const C=ctx.MaximusCore;
const sheetjs=source.slice(source.indexOf('/*! xlsx.js'),source.indexOf('\n\n;',source.indexOf('if(typeof window!=="undefined"&&!window.XLSX)')));
const xctx={TextDecoder,TextEncoder,Uint8Array,ArrayBuffer};vm.createContext(xctx);vm.runInContext(sheetjs,xctx);
const X=xctx.XLSX;
const collect=(raw,name='Planilha1')=>{const s=P.analyze(raw,name,C);return {sheet:s,...P.collect(s,C,'teste.xlsx')};};

test('lista só com turmas, títulos e totais: deduplica sem criar alunos',()=>{
 const out=collect([['Escola de teste'],['Relação de turmas'],['Turma','Turno'],['1º A','Manhã'],['2º B','Tarde'],['1º A','Manhã'],['Total','3']]);
 assert.equal(out.sheet.mode,'classes');assert.deepEqual(out.classes,['1º A','2º B']);assert.equal(out.records.length,0);assert.equal(out.errors.length,0);
});
test('lista de turmas sem cabeçalho mantém a primeira turma',()=>{
 const out=collect([['1A'],['2B'],['3IA']]);assert.equal(out.sheet.headerLines,0);assert.deepEqual(out.classes,['1A','2B','3IA']);
});
test('monta turma com série e letra, inclusive série mesclada',()=>{
 const out=collect([['Série','Turma'],['1º ano','A'],['','B'],['2º ano','A']]);assert.deepEqual(out.classes,['1º ano A','1º ano B','2º ano A']);
});
test('roster reconhece título, matrícula com zeros, turma mesclada e cabeçalho repetido',()=>{
 const out=collect([['Escola de teste'],['Lista de alunos'],['Nome completo','Classe','RA','Fonte ampliada'],['Ana Silva','1A','001','SIM'],['Bia Souza','','002','NÃO'],['Nome completo','Classe','RA','Fonte ampliada'],['Caio Lima','2B','003','SIM'],['Total','3']]);
 assert.equal(out.sheet.mode,'students');assert.equal(out.records.length,3);assert.deepEqual(out.records.map(r=>r.turma),['1A','1A','2B']);assert.equal(out.records[0].matricula,'001');assert.match(out.records[0].orientacoes,/Fonte ampliada: SIM/);assert.equal(out.records[0].origemImportacao.linha,4);assert.equal(out.records[0].camposOriginais.length,4);
});
test('turma no título e no nome da aba: não usa Planilha1 como turma',()=>{
 const title=collect([['Turma: 3º B'],['Nome'],['Ana Silva'],['Bia Souza']]);assert.deepEqual(title.classes,['3º B']);
 const named=collect([['Aluno'],['Ana Silva']],'2FA');assert.equal(named.records[0].turma,'2FA');
 const generic=collect([['Aluno'],['Ana Silva']]);assert.equal(generic.records.length,0);assert.match(generic.errors[0],/informe a turma/);
});
test('turma muda em seções dentro de uma tabela',()=>{
 const out=collect([['Aluno','Turma'],['Turma: 1A'],['Ana Silva'],['Classe: 2B'],['Bia Souza']]);assert.deepEqual(out.records.map(r=>r.turma),['1A','2B']);
});
test('nomes sem cabeçalho com turma em outra coluna são reconhecidos',()=>{
 const out=collect([['Ana Silva','1A'],['Bia Souza','2B']]);assert.equal(out.sheet.headerLines,0);assert.equal(out.records.length,2);assert.equal(out.records[0].nome,'Ana Silva');
});
test('identifica cabeçalho dividido em duas linhas sem importar seu complemento como aluno',()=>{
 const out=collect([['Nome','Turma','Adaptações'],['do aluno','','necessárias'],['Ana Silva','1A','Fonte ampliada']]);
 assert.equal(out.sheet.headerLines,2);assert.equal(out.records.length,1);assert.equal(out.records[0].nome,'Ana Silva');assert.match(out.records[0].adaptacao,/Fonte ampliada/);
});
test('uma turma por coluna importa os alunos e ignora totais',()=>{
 const out=collect([['1A','2B'],['Ana Silva','Bia Souza'],['Caio Lima',''],['Total','Total']]);assert.equal(out.sheet.mode,'matrix');assert.equal(out.records.length,3);assert.deepEqual([...new Set(out.classes)],['1A','2B']);assert.equal(out.records[1].turma,'1A');
});
test('planilha ambígua exige revisão em vez de criar turma a partir de uma nota',()=>{
 const out=collect([['Conteúdo','Valor'],['Atividade','9,5'],['Prova','7,0']]);assert.equal(out.sheet.mode,'pending');assert.equal(out.sheet.include,false);assert.equal(out.records.length,0);assert.equal(out.classes.length,0);assert.ok(out.errors.length);
});
test('atualizar alunos mantém complemento, IDs e alunos fora do arquivo',()=>{
 const out=collect([['Aluno','Turma','RA'],['Ana Silva','1A','001']]);
 const existing=[{id:'ana',nome:'Ana Silva',turma:'1A',matricula:'001',diagnostico:'Necessidade existente',adaptacao:'Fonte 18',orientacoes:'Mais tempo',dadosCompletos:{'Observação antiga':'Preservar'},complementoProfessor:'Manter apoio',criadoEm:'2026-01-01'}, {id:'outro',nome:'Outro Aluno',turma:'2B'}];
 const plan=C.importPlan(out.records,existing,false);assert.equal(plan.records[0].id,'ana');assert.equal(plan.records[0].complementoProfessor,'Manter apoio');assert.equal(plan.removed,0);assert.equal(plan.updates['alunos/outro'],undefined);
 const again=C.importPlan(out.records,plan.records,false);assert.equal(again.added,0);assert.equal(again.unchanged,1);
 assert.equal(plan.records[0].diagnostico,'Necessidade existente');assert.equal(plan.records[0].adaptacao,'Fonte 18');assert.equal(plan.records[0].orientacoes,'Mais tempo');assert.equal(plan.records[0].dadosCompletos['Observação antiga'],'Preservar');
 const concurrent=C.importPlan(out.records,[{...existing[0],complementoProfessor:'Orientação mais recente'}],false);assert.equal(concurrent.records[0].complementoProfessor,'Orientação mais recente');
});

async function bookFile(type,sheets){
 const book=X.utils.book_new();
 for(const [name,rows] of Object.entries(sheets))X.utils.book_append_sheet(book,X.utils.aoa_to_sheet(rows),name);
 const bytes=X.write(book,{type:'array',bookType:type});
 return {name:'teste.'+type,size:bytes.byteLength,arrayBuffer:async()=>bytes};
}
for(const type of ['xlsx','xls','xlsm','xlsb','ods'])test('lê arquivo real '+type+' com múltiplas abas',async()=>{
 const file=await bookFile(type,{'1A':[['Aluno','Matrícula'],['Ana Silva','001']],'Turmas':[['Turma'],['2B']]});
 const sheets=await P.readFile(file,X,C);assert.equal(sheets.length,2);assert.equal(P.collect(sheets[0],C).records[0].matricula,'001');assert.deepEqual(P.collect(sheets[1],C).classes,['2B']);
});
test('CSV com ponto e vírgula e TSV preservam textos e zeros iniciais',async()=>{
 for(const [extension,separator] of [['csv',';'],['tsv','\t']]){
  const bytes=new TextEncoder().encode(`Aluno${separator}Turma${separator}RA\r\nJoão Silva${separator}1A${separator}001\r\n`);
  const sheets=await P.readFile({name:'teste.'+extension,size:bytes.length,arrayBuffer:async()=>bytes.buffer},X,C);
  const out=P.collect(sheets[0],C);assert.equal(out.records[0].nome,'João Silva');assert.equal(out.records[0].matricula,'001');
 }
});
test('decodifica CSV legado Windows-1252 e UTF-16 com BOM',()=>{
 assert.equal(P.decodeText(Uint8Array.from([74,111,227,111]).buffer),'João');
 const utf=Buffer.from('\ufeffAluno;Turma\r\nJoão;1A','utf16le');assert.match(P.decodeText(utf.buffer.slice(utf.byteOffset,utf.byteOffset+utf.byteLength)),/João/);
});
test('recusa arquivos grandes e extensões sem suporte antes de ler',async()=>{
 await assert.rejects(P.readFile({name:'teste.xlsx',size:26*1024*1024},X,C),/25 MB/);
 await assert.rejects(P.readFile({name:'teste.pdf',size:100},X,C),/Escolha uma planilha/);
});
