/* Importação local de turmas e alunos. Os arquivos só são gravados após conferência. */
(function(root){
  'use strict';
  const text=v=>String(v??'').trim();
  const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const aliases={
    nome:['nome','nome completo','nome do aluno','nome aluno','aluno','aluno a','alunos','estudante','educando','discente','student name','student','name'],
    turma:['turma','turmas','nome da turma','codigo da turma','classe','classes','sala','grupo','class','class name'],
    serie:['serie','ano','ano escolar','serie ano','ano serie','grade']
  };
  const ignored=v=>/^(total|subtotal|totais|observac(?:ao|oes)|legenda|assinatura|pagina|relacao de|lista de|escola|colegio|responsavel|data de emissao)(\b|$)/.test(norm(v));
  const classLike=v=>{
    const s=text(v),n=norm(s);
    return !!s&&s.length<=80&&!ignored(s)&&!/^\d{4}$/.test(n)&&(
      /^(?:turma\s*[:\-]?\s*)?\d{1,2}\s*[º°ªo]?\s*(?:(?:ano|serie|periodo|modulo)\s*)?[a-z]{1,4}(?:\s|$)/i.test(s)||
      /^(?:\d{1,2}\s*[º°ª]?\s*(?:ano|serie|série)|maternal|bercario|berçário|infantil|jardim|pre\b|pré\b|tecnico|técnico|eja\b)/i.test(s));
  };
  const classValue=v=>!!text(v)&&text(v).length<=80&&!ignored(v)&&!Object.values(aliases).flat().includes(norm(v));
  const person=v=>{
    const n=norm(v);
    return n.length>1&&/[a-z]/.test(n)&&!ignored(v)&&!classLike(v)&&!Object.values(aliases).flat().includes(n)&&!/^\d+$/.test(n);
  };
  function contextClass(raw,name,header){
    for(const row of raw.slice(0,Math.max(0,header))){
      for(let i=0;i<row.length;i++){
        const value=text(row[i]),match=value.match(/^(?:turma|classe|sala)\s*[:=\-]\s*(.+)$/i);
        if(match&&classValue(match[1]))return text(match[1]);
        if(aliases.turma.includes(norm(value))&&classValue(row[i+1]))return text(row[i+1]);
        if(row.filter(v=>text(v)).length===1&&classLike(value))return value;
      }
    }
    return classLike(name)?text(name):'';
  }
  function parse(raw,header,headerLines,C){
    if(headerLines)return C.parseSheet(raw,header,headerLines);
    const parsed=C.parseSheet([[],...raw.slice(header)],0,1);
    parsed.rows.forEach(r=>r.line=r.line+header-1);
    return parsed;
  }
  function analyze(raw,name,C){
    let best={index:0,score:0};
    raw.slice(0,100).forEach((row,index)=>{
      const cells=row.map(norm);
      const known=C.fields.filter(f=>cells.some(c=>f.aliases.includes(c))).length;
      const score=(cells.some(c=>aliases.nome.includes(c))?160:0)+(cells.some(c=>aliases.turma.includes(c))?130:0)+(cells.some(c=>aliases.serie.includes(c))?75:0)+known*12;
      if(score>best.score)best={index,score};
    });
    let header=best.index,headerLines=best.score?1:0;
    if(headerLines&&raw[header+1]?.some(v=>/^(do aluno|do estudante|completo|completa|necessarias|necessarios|pedagogicas|de chamada|da turma)$/.test(norm(v))))headerLines=2;
    if(!best.score)header=Math.max(0,raw.findIndex(r=>r.some(v=>text(v)&&!ignored(v))));
    let parsed=parse(raw,header,headerLines,C),mapping=C.autoMap(parsed.columns);
    const exact=keys=>parsed.columns.find(c=>keys.includes(norm(c.original)))?.id||'';
    mapping.nome=exact(aliases.nome)||mapping.nome;
    mapping.turma=exact(aliases.turma)||mapping.turma;
    mapping.serie=exact(aliases.serie)||'';
    if(mapping.serie===mapping.turma)mapping.turma='';
    let mode=mapping.nome?'students':mapping.turma||mapping.serie?'classes':'pending',classColumns=[];
    if(!best.score){
      const candidates=raw.map((r,index)=>({index,cols:r.map((v,i)=>classLike(v)?i:-1).filter(i=>i>=0)}));
      const matrix=candidates.slice(0,100).find(r=>r.cols.length>=2&&r.cols.filter(c=>raw.slice(r.index+1,r.index+12).some(row=>person(row[c]))).length>=2);
      if(matrix){
        header=matrix.index;headerLines=1;parsed=parse(raw,header,1,C);mapping=C.autoMap(parsed.columns);
        classColumns=matrix.cols.map(i=>'c'+i);mode='matrix';
      }else{
        const sample=parsed.rows.slice(0,30),ratio=(i,fn)=>{const v=sample.map(r=>r.values[i]).filter(Boolean);return v.length?v.filter(fn).length/v.length:0;};
        const classCol=parsed.columns.find(c=>ratio(c.index,classLike)>=.65);
        const nameCol=parsed.columns.find(c=>ratio(c.index,v=>person(v)&&norm(v).split(' ').length>=2)>=.65);
        if(nameCol){mapping.nome=nameCol.id;mapping.turma=classCol?.id||'';mode='students';}
        else if(classCol){mapping.turma=classCol.id;mode='classes';}
      }
    }
    const fallback=contextClass(raw,name,header);
    return {name,raw,header,headerLines,parsed,mapping,mode,classColumns,fallback,carry:true,include:mode!=='pending'&&parsed.rows.length>0};
  }
  function collect(s,C,filename=''){
    const records=[],classes=[],skipped=[],errors=[];
    const columns=new Map(s.parsed.columns.map(c=>[c.id,c]));
    const read=(row,id)=>text(row.values[columns.get(id)?.index]);
    const addClass=value=>{if(!classValue(value))return false;classes.push(text(value));return true;};
    const record=(row,nome,turma)=>{
      const result={};
      for(const f of C.fields){const ids=(f.multi?s.mapping[f.key]||[]:[s.mapping[f.key]]).filter(id=>columns.has(id));if(ids.length)result[f.key]=ids.filter(id=>read(row,id)).map(id=>f.multi?columns.get(id).original+': '+read(row,id):read(row,id)).join('\n');}
      Object.assign(result,{nome,turma,abaOrigem:s.name,origemImportacao:{arquivo:filename,aba:s.name,linha:row.line},camposOriginais:s.parsed.columns.map(c=>({cabecalho:c.original,coluna:c.index+1,valor:row.values[c.index]||''})),dadosCompletos:Object.fromEntries(s.parsed.columns.map(c=>[C.safeKey(c.label),row.values[c.index]||'']))});
      records.push(result);addClass(turma);
    };
    if(s.mode==='pending')return {records,classes,skipped,errors:[`Aba ${s.name}: escolha como ler os dados e indique as colunas.`]};
    if(s.mode==='matrix'){
      if(!s.classColumns.length)errors.push(`Aba ${s.name}: selecione as colunas das turmas.`);
      for(const id of s.classColumns){
        const column=columns.get(id);if(!column)continue;
        if(!addClass(column.original)){errors.push(`Aba ${s.name}: indique os nomes das turmas no cabeçalho.`);continue;}
        for(const row of s.parsed.rows)if(person(read(row,id)))record(row,read(row,id),column.original);else if(read(row,id))skipped.push(row.line);
      }
      return {records,classes,skipped,errors};
    }
    if(s.mode==='students'&&!s.mapping.nome)errors.push(`Aba ${s.name}: indique a coluna do nome do aluno.`);
    if(s.mode==='classes'&&!s.mapping.turma&&!s.mapping.serie&&!s.fallback)errors.push(`Aba ${s.name}: indique a coluna da turma ou uma turma padrão.`);
    if(errors.length)return {records,classes,skipped,errors};
    let last=s.fallback,lastGrade='';
    for(const row of s.parsed.rows){
      const name=read(row,s.mapping.nome),rawClass=read(row,s.mapping.turma),grade=read(row,s.mapping.serie);
      if(aliases.nome.includes(norm(name))||aliases.turma.includes(norm(rawClass))||aliases.serie.includes(norm(grade))){skipped.push(row.line);continue;}
      if(ignored(name)||ignored(rawClass)||ignored(grade)){skipped.push(row.line);continue;}
      let value=rawClass;
      if(grade&&s.carry)lastGrade=grade;
      const year=grade||(s.carry?lastGrade:'');
      if(year&&(!value||/^[a-z]{1,3}$/i.test(value)))value=[year,value].filter(Boolean).join(' ');
      if(value)last=value;
      const turma=value||(s.carry?last:s.fallback);
      if(s.mode==='classes'){
        if(!value){skipped.push(row.line);continue;}
        if(!addClass(value))errors.push(`Aba ${s.name}, linha ${row.line}: nome de turma inválido (até 80 caracteres).`);
      }else{
        const group=name.match(/^(?:turma|classe|sala)\s*[:=\-]\s*(.+)$/i);
        if(group&&!rawClass){last=text(group[1]);skipped.push(row.line);continue;}
        if(!name||!person(name)){skipped.push(row.line);continue;}
        if(!classValue(turma)){errors.push(`Aba ${s.name}, linha ${row.line}: informe a turma de ${name} ou uma turma padrão.`);continue;}
        record(row,name,turma);
      }
    }
    return {records,classes:[...new Map(classes.map(v=>[C.classKey(v),v])).values()],skipped,errors};
  }
  function decodeText(bytes){
    const b=new Uint8Array(bytes);
    if(b[0]===255&&b[1]===254)return new TextDecoder('utf-16le').decode(bytes);
    if(b[0]===254&&b[1]===255)return new TextDecoder('utf-16be').decode(bytes);
    const utf=new TextDecoder('utf-8').decode(bytes);
    return utf.includes('\uFFFD')?new TextDecoder('windows-1252').decode(bytes):utf;
  }
  async function readFile(file,XLSX,C){
    if(file.size>25*1024*1024)throw new Error('O arquivo excede 25 MB. Divida a planilha em arquivos menores.');
    if(!/\.(xlsx|xls|xlsm|xlsb|ods|csv|tsv)$/i.test(file.name))throw new Error('Escolha uma planilha XLSX, XLS, XLSM, XLSB, ODS, CSV ou TSV.');
    const bytes=await file.arrayBuffer(),csv=/\.(csv|tsv)$/i.test(file.name);
    const book=XLSX.read(csv?decodeText(bytes):bytes,{type:csv?'string':'array',cellDates:true,raw:csv});
    const sheets=book.SheetNames.map(name=>{
      const sheet=book.Sheets[name],range=sheet['!ref']?XLSX.utils.decode_range(sheet['!ref']):null;
      if(range&&(range.e.r>20000||range.e.c>199))throw new Error(`Aba ${name}: limite de 20.000 linhas e 200 colunas. Remova as linhas ou colunas excedentes.`);
      const raw=range?XLSX.utils.sheet_to_json(sheet,{header:1,range:0,defval:'',blankrows:true,raw:false,dateNF:'dd/mm/yyyy'}):[];
      return analyze(raw,name,C);
    }).filter(s=>s.raw.some(r=>r.some(v=>text(v))));
    if(!sheets.length)throw new Error('A planilha está vazia ou não contém uma tabela legível.');
    return sheets;
  }
  const api={analyze,collect,parse,readFile,decodeText,classLike};
  root.MaximusSheets=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root.document)return;

  const $=id=>document.getElementById(id),C=()=>root.MaximusCore;
  let state=null,generation=0;
  const modes={pending:'Escolher formato',students:'Alunos com turma',classes:'Lista de turmas',matrix:'Uma turma por coluna'};
  function createDialog(){
    if($('importWizard'))return;
    const dialog=document.createElement('dialog');dialog.id='importWizard';dialog.className='import-wizard';dialog.setAttribute('aria-labelledby','wizardTitle');
    dialog.innerHTML=`<header class="wizard-top"><div><span class="eyebrow">COORDENAÇÃO · PLANILHAS</span><h2 id="wizardTitle">Importar turmas e alunos</h2><p id="wizardFile" class="muted"></p></div><button id="wizardClose" type="button" class="btn light">Fechar</button></header>
      <div class="wizard-layout"><aside><h3>Abas do arquivo</h3><div id="wizardSheets"></div><p class="muted small">Selecione as abas que deseja importar. As turmas existentes são reconhecidas sem duplicar.</p></aside>
      <div class="wizard-main"><p id="wizardDetection" class="report compact"></p><details id="wizardAdvanced"><summary>Conferir ou ajustar identificação</summary><p class="muted small">As abas e colunas são identificadas automaticamente. Ajuste aqui quando necessário.</p><div class="form-grid"><label for="wizardMode">Formato da aba<select id="wizardMode">${Object.entries(modes).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>
      <label for="wizardHeader">Primeira linha da tabela<input id="wizardHeader" type="number" min="1"></label><label for="wizardHeaderLines">Cabeçalho<select id="wizardHeaderLines"><option value="0">Sem cabeçalho</option><option value="1">Uma linha</option><option value="2">Duas linhas</option><option value="3">Três linhas</option></select></label><label for="wizardClass">Turma padrão (se não estiver na tabela)<input id="wizardClass" maxlength="80" placeholder="Ex.: 1º A"></label><label class="check"><input id="wizardCarryClass" type="checkbox">Repetir a turma nas células vazias</label></div>
      <h3>Colunas da planilha</h3><div id="wizardMapping" class="mapping-grid"></div></details>
      <h3>Dados reconhecidos</h3><div class="table-wrap"><table id="wizardPreview"></table></div><details><summary>Ver dados originais</summary><div class="table-wrap"><table id="wizardRaw"></table></div></details></div></div>
      <div id="wizardReport" class="report" role="status" aria-live="polite"></div><div id="wizardSummary" class="import-summary hidden"></div><footer class="wizard-actions"><button id="wizardCheck" type="button" class="btn secondary">Conferir importação</button><button id="wizardSave" type="button" class="btn primary" disabled>Salvar turmas e alunos</button></footer>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('cancel',e=>{if(state?.saving)e.preventDefault();});
    dialog.addEventListener('close',()=>{if(!state?.saving){generation++;state=null;dialog.remove();}});
    $('wizardClose').addEventListener('click',()=>dialog.close());
    ['wizardHeader','wizardHeaderLines'].forEach(id=>$(id).addEventListener('change',()=>{
      const s=state.sheets[state.current];s.header=Math.min(s.raw.length-1,Math.max(0,Number($('wizardHeader').value)-1));s.headerLines=Number($('wizardHeaderLines').value);s.parsed=parse(s.raw,s.header,s.headerLines,C());s.mapping=C().autoMap(s.parsed.columns);s.mapping.serie=s.parsed.columns.find(c=>aliases.serie.includes(norm(c.original)))?.id||'';dirty();renderCurrent();check();
    }));
    $('wizardMode').addEventListener('change',()=>{state.sheets[state.current].mode=$('wizardMode').value;dirty();renderSheets();renderCurrent();check();});
    $('wizardClass').addEventListener('input',()=>{state.sheets[state.current].fallback=$('wizardClass').value;dirty();renderPreview();});
    $('wizardCarryClass').addEventListener('change',()=>{state.sheets[state.current].carry=$('wizardCarryClass').checked;dirty();renderPreview();});
    $('wizardCheck').addEventListener('click',check);$('wizardSave').addEventListener('click',save);
  }
  function dirty(){state.plan=null;$('wizardSave').disabled=true;$('wizardSummary').classList.add('hidden');$('wizardReport').textContent='Confira a importação após ajustar os dados.';}
  function renderSheets(){
    $('wizardSheets').innerHTML=state.sheets.map((s,i)=>`<div class="sheet-choice ${i===state.current?'selected':''}"><label class="check"><input type="checkbox" data-include="${i}" ${s.include?'checked':''} aria-label="Importar aba ${C().escape(s.name)}"></label><button type="button" data-sheet="${i}">${C().escape(s.name)}<small>${modes[s.mode]} · ${s.parsed.rows.length} linhas</small></button></div>`).join('');
    $('wizardSheets').querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>{state.current=Number(b.dataset.sheet);renderSheets();renderCurrent();}));
    $('wizardSheets').querySelectorAll('[data-include]').forEach(b=>b.addEventListener('change',()=>{state.sheets[Number(b.dataset.include)].include=b.checked;dirty();check();}));
  }
  function renderCurrent(){
    const s=state.sheets[state.current],escape=C().escape;
    $('wizardHeader').value=s.header+1;$('wizardHeader').max=Math.max(1,s.raw.length);$('wizardHeaderLines').value=s.headerLines;$('wizardClass').value=s.fallback;$('wizardCarryClass').checked=s.carry;$('wizardMode').value=s.mode;
    $('wizardDetection').textContent=s.mode==='pending'?'Não foi possível identificar o formato desta aba. Escolha o formato e as colunas para incluí-la.':`Identificado: ${modes[s.mode].toLowerCase()}.${s.fallback?' Turma padrão: '+s.fallback+'.':''}`;
    const fields=s.mode==='classes'?[{key:'turma',label:'Nome da turma'},{key:'serie',label:'Ano/série (complemento opcional)'}]:[...C().fields,{key:'serie',label:'Ano/série (complemento opcional)'}];
    $('wizardMapping').innerHTML=s.mode==='matrix'?`<fieldset><legend>Colunas com listas de alunos por turma</legend>${s.parsed.columns.map(c=>`<label class="check"><input type="checkbox" data-matrix value="${c.id}" ${s.classColumns.includes(c.id)?'checked':''}>${escape(c.label)}</label>`).join('')}</fieldset>`:fields.map(f=>f.multi?`<fieldset><legend>${escape(f.label)}</legend><div class="column-checks">${s.parsed.columns.map(c=>`<label class="check"><input type="checkbox" data-role="${f.key}" value="${c.id}" ${(s.mapping[f.key]||[]).includes(c.id)?'checked':''}>${escape(c.label)}</label>`).join('')}</div></fieldset>`:`<label>${escape(f.label)}<select data-role="${f.key}"><option value="">Não informado</option>${s.parsed.columns.map(c=>`<option value="${c.id}" ${s.mapping[f.key]===c.id?'selected':''}>${escape(c.label)}</option>`).join('')}</select></label>`).join('');
    $('wizardMapping').querySelectorAll('[data-role]').forEach(el=>el.addEventListener('change',()=>{const f=fields.find(f=>f.key===el.dataset.role);s.mapping[f.key]=f.multi?[...$('wizardMapping').querySelectorAll(`input[data-role="${f.key}"]:checked`)].map(el=>el.value):el.value;dirty();renderPreview();}));
    $('wizardMapping').querySelectorAll('[data-matrix]').forEach(el=>el.addEventListener('change',()=>{s.classColumns=[...$('wizardMapping').querySelectorAll('[data-matrix]:checked')].map(el=>el.value);dirty();renderPreview();}));
    $('wizardAdvanced').open=s.mode==='pending'||(s.mode==='students'&&!s.mapping.nome)||(!s.mapping.turma&&!s.mapping.serie&&!s.fallback&&s.mode!=='matrix');
    $('wizardRaw').innerHTML=`<thead><tr><th>Linha</th>${s.parsed.columns.map(c=>`<th>${escape(c.label)}</th>`).join('')}</tr></thead><tbody>${s.parsed.rows.slice(0,5).map(r=>`<tr><td>${r.line}</td>${r.values.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    renderPreview();
  }
  function renderPreview(){
    const s=state.sheets[state.current],result=collect(s,C(),state.file.name),escape=C().escape;
    $('wizardPreview').innerHTML=s.mode==='classes'?`<thead><tr><th>Turma</th></tr></thead><tbody>${result.classes.slice(0,10).map(t=>`<tr><td>${escape(t)}</td></tr>`).join('')}</tbody>`:`<thead><tr><th>Aluno</th><th>Turma</th><th>Matrícula</th></tr></thead><tbody>${result.records.slice(0,8).map(r=>`<tr><td>${escape(r.nome)}</td><td>${escape(r.turma)}</td><td>${escape(r.matricula)}</td></tr>`).join('')}</tbody>`;
  }
  function calculate(){
    const records=[],classes=[],errors=[],skipped=[],schemas=[];
    for(const s of state.sheets.filter(s=>s.include)){
      const result=collect(s,C(),state.file.name);records.push(...result.records);classes.push(...result.classes);errors.push(...result.errors);skipped.push(...result.skipped.map(line=>`${s.name}: linha ${line}`));
      schemas.push({aba:s.name,formato:s.mode,cabecalho:s.header+1,linhasCabecalho:s.headerLines,mapeamento:s.mapping,colunasTurmas:s.classColumns,turmaPadrao:s.fallback,repetirTurma:s.carry});
    }
    const unique=[...new Map(classes.map(t=>[C().classKey(t),t])).values()];
    if(!unique.length&&!records.length)errors.push('Nenhuma turma ou aluno reconhecido. Selecione uma aba e confira as colunas.');
    const plan=C().importPlan(records,state.hooks.existing(),false,state.at);
    const known=new Set((state.hooks.classes?.()||[]).map(C().classKey));
    Object.assign(plan,{incoming:records,classes:unique,classesAdded:unique.filter(t=>!known.has(C().classKey(t))).length,schemas,skipped});plan.errors.push(...errors);
    return plan;
  }
  function check(){
    try{
      state.plan=calculate();const p=state.plan;
      $('wizardSummary').classList.remove('hidden');$('wizardSummary').innerHTML=`<div><strong>${p.classesAdded}</strong><span>Novas turmas</span></div><div><strong>${p.added}</strong><span>Novos alunos</span></div><div><strong>${p.changed}</strong><span>Alunos atualizados</span></div><div><strong>${p.unchanged}</strong><span>Sem alteração</span></div>`;
      const excluded=state.sheets.filter(s=>!s.include).length;
      $('wizardReport').textContent=p.errors.length?p.errors.slice(0,15).join('\n'):`${p.classes.length} turma(s) e ${p.records.length} aluno(s) reconhecidos. ${p.duplicates.length} registro(s) repetido(s) sem duplicação. ${p.skipped.length} linha(s) de cabeçalho, totais ou sem dados ignorada(s).${excluded?' '+excluded+' aba(s) não incluída(s); confira a seleção.':''} Confira a prévia e salve. Os alunos ausentes no arquivo são mantidos.`;
      $('wizardSave').disabled=!!p.errors.length;$('wizardSave').textContent=p.records.length?'Salvar turmas e alunos':'Salvar turmas';
      return p;
    }catch(e){$('wizardReport').textContent=e.message;$('wizardSave').disabled=true;return null;}
  }
  async function save(){
    const session=state;if(!session||session.saving||!session.plan||session.plan.errors.length)return;
    const current=calculate();if(JSON.stringify(current.updates)!==JSON.stringify(session.plan.updates)){check();$('wizardReport').textContent='Os dados foram atualizados durante a conferência. Revise os novos totais e salve novamente.';return;}
    session.saving=true;$('importWizard').querySelectorAll('input,select,button').forEach(el=>el.disabled=true);
    try{
      $('wizardReport').textContent='Salvando. Aguarde a confirmação...';
      await session.hooks.confirm(current,{arquivo:session.file.name,substituir:false});
      if(state===session){session.saving=false;$('importWizard')?.close();}
    }catch(e){if(state===session){$('wizardReport').textContent='Não foi possível concluir a importação.\n'+e.message;$('importWizard').querySelectorAll('input,select,button').forEach(el=>el.disabled=false);}}
    finally{session.saving=false;if(state===session&&session.cancelled)clear();}
  }
  async function open(file,hooks){
    if(state?.saving)throw new Error('Aguarde a importação atual terminar.');
    if(!root.XLSX)throw new Error('O leitor de planilhas não carregou. Recarregue a página.');
    const token=++generation,sheets=await readFile(file,root.XLSX,C());
    if(token!==generation)return;
    if($('importWizard')){$('importWizard').remove();}
    state={file,hooks,sheets,current:Math.max(0,sheets.findIndex(s=>s.include)),at:new Date().toISOString(),plan:null,saving:false};createDialog();
    $('wizardFile').textContent=`${file.name} · ${sheets.length} aba(s) · conferência antes de salvar`;
    renderSheets();renderCurrent();check();$('importWizard').showModal();
  }
  function clear(){
    generation++;
    if(state?.saving){state.cancelled=true;$('importWizard')?.close();$('importWizard')?.querySelectorAll('tbody,#wizardReport,#wizardSummary,#wizardFile').forEach(el=>el.replaceChildren());return;}
    state=null;const dialog=$('importWizard');dialog?.close();dialog?.remove();
  }
  root.MaximusImporter={open,clear};
})(typeof window!=='undefined'?window:globalThis);
