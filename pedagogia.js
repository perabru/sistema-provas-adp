/* Motor pedagógico local. Não envia conteúdo ou perfis a serviços de IA. */
(function(root){
  'use strict';
  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rules=[
    {id:'linguagem',title:'Linguagem direta',terms:'linguagem simples;enunciados simples;enunciado curto;simplificar linguagem;comandos simples',action:'simplify'},
    {id:'alternativas',title:'Redução de alternativas',terms:'reduzir alternativas;reducao de alternativas;menos alternativas;alternativas reduzidas',action:'alternatives',value:3},
    {id:'quantidade',title:'Redução de questões',terms:'reduzir questoes;reducao de questoes;menos questoes;questoes reduzidas',action:'quantity'},
    {id:'contraste',title:'Alto contraste',terms:'alto contraste;contraste ampliado;preto e branco',action:'contrast'},
    {id:'imagem',title:'Apoio visual',terms:'colocar imagens;incluir imagens;apoio visual;pictogramas',action:'manual'},
    {id:'objetiva',title:'Conversão para questões objetivas',terms:'multipla escolha;prova objetiva;questoes objetivas',action:'objective'},
    {id:'pagina',title:'Uma questão por página',terms:'uma questao por pagina;1 questao por pagina',action:'page'}
  ];
  function resolve(aluno={},extra='',config=[]){
    const source=[aluno.adaptacao,aluno.orientacoes,aluno.tipoProva,extra].filter(Boolean).join('\n');
    const clauses=source.split(/[\n;|]+|,(?=\s*[A-Za-zÀ-ÿ])/).map(clean).filter(Boolean);
    const positive=clauses.filter(c=>!/(?:^|[:\s])(?:nao|não|sem|dispensar|dispensa|desativar)\b|:\s*(?:n|no|false|0)\s*$/i.test(c));
    const all=[...config.filter(r=>r.action!=='review'),...rules.filter(r=>!config.some(c=>c.id===r.id))];
    // A regra antiga de revisão agrupava adaptações diferentes sem executá-las.
    const knownReview=/linguagem simples|enunciados simples|enunciado curto|reducao de questoes|reduzir alternativas|multipla escolha|prova objetiva|completamente adaptada/;
    config.filter(r=>r.action==='review'&&!knownReview.test(norm(r.terms))).forEach(r=>all.push({...r,action:'manual'}));
    const active=[];
    for(const r of all){
      if(r.enabled===false||active.some(a=>a.id===r.id))continue;
      if(clean(r.terms).split(';').filter(Boolean).some(t=>positive.some(c=>norm(c).includes(norm(t)))))active.push({...r});
    }
    const raw=positive.join('; '),n=norm(raw);
    const add=(action,title,value)=>{const old=active.find(r=>r.action===action);if(old){old.value=value;old.title=title;}else active.push({id:action+'-valor',action,title,value});};
    const font=n.match(/(?:fonte|letra(?: tamanho)?|tamanho da letra)\s*(?:de|:|=)?\s*(\d{1,2})\b/);
    if(font)add('font',`Fonte ${Math.min(36,Math.max(12,+font[1]))} pt`,Math.min(36,Math.max(12,+font[1])));
    const lines=n.match(/(?:mais\s+)?(\d{1,2})\s+linhas|linhas(?: de resposta| para resposta)?\s*[:=]?\s*(\d{1,2})/);
    if(lines)add('lines',`${Math.min(20,Math.max(1,+(lines[1]||lines[2])))} linhas de resposta`,Math.min(20,Math.max(1,+(lines[1]||lines[2]))));
    if(/espacamento|espaco maior|mais espaco/.test(n))add('spacing','Espaçamento ampliado',/2(?:[.,]0)?\s*(?:entre linhas|de espacamento)|duplo/.test(n)?2:1.7);
    if(/letra bastao|caixa alta|maiuscul/.test(n))add('uppercase','Letra maiúscula');
    const alternatives=n.match(/(?:apenas\s+|somente\s+)?([2-5])\s+alternativas|alternativas\s*[:=]?\s*([2-5])/);
    if(alternatives)add('alternatives',`${alternatives[1]||alternatives[2]} alternativas`,+(alternatives[1]||alternatives[2]));
    const count=n.match(/(?:apenas|somente|limitar a|reduzir para|total de)\s*(\d{1,2})\s*(?:questoes|perguntas)|questoes\s*[:=]\s*(\d{1,2})/);
    if(count)add('quantity',`Limite de ${count[1]||count[2]} questões`,+(count[1]||count[2]));
    const pct=n.match(/(?:reduzir|reducao)(?:\s+de)?\s+(\d{1,2})\s*%/);
    if(pct)add('quantity',`Redução de ${pct[1]}% das questões`,null);
    const matched=c=>all.some(r=>clean(r.terms).split(';').filter(Boolean).some(t=>norm(c).includes(norm(t))))||/fonte|letra|linhas|espacamento|caixa alta|alternativas|questoes|tipo de prova|avaliacao|atividade|normal|adaptada|comum/.test(norm(c));
    const unknown=positive.filter(c=>!matched(c));
    if(/\bcompletamente adaptada\b/.test(n)){add('font','Fonte ampliada',16);add('spacing','Espaçamento ampliado',1.7);add('lines','Mais linhas para resposta',5);add('simplify','Linguagem direta');add('hint','Orientação de leitura');}
    if(/\badaptada\b/.test(n)&&!active.length){add('font','Fonte ampliada',16);add('spacing','Espaçamento ampliado',1.7);unknown.push('Confirme com a coordenação as orientações específicas desta prova adaptada.');}
    const manual=active.filter(r=>['manual','objective'].includes(r.action)).map(r=>r.title).concat(unknown,active.filter(r=>['time','reader'].includes(r.action)).map(r=>r.title+' durante a aplicação'));
    active.forEach(r=>{r.status=['time','reader'].includes(r.action)?'em sala':['manual','objective'].includes(r.action)?'revisar':'arquivo';r.what=r.status==='em sala'?'Providenciar durante a aplicação.':r.status==='revisar'?'Conferir e ajustar no editor.':'Aplicada ao gerar a prévia.';});
    return {source,rules:active,manual,font:Math.max(12,...active.filter(r=>r.action==='font').map(r=>+r.value||16)),lineHeight:Math.max(1.35,...active.filter(r=>r.action==='spacing').map(r=>+r.value||1.7)),upper:active.some(r=>r.action==='uppercase'),lines:Math.max(3,...active.filter(r=>r.action==='lines').map(r=>+r.value||5)),bold:active.some(r=>r.action==='bold'),hint:active.some(r=>r.action==='hint'),simplify:active.some(r=>r.action==='simplify'),alternatives:active.find(r=>r.action==='alternatives')?.value||0,quantity:active.find(r=>r.action==='quantity')?.value||0,reduce:active.some(r=>r.action==='quantity'),reductionPercent:pct?+pct[1]:30,onePerPage:active.some(r=>r.action==='page'),review:manual.length>0};
  }
  function simplify(text){
    return String(text).replace(/\b(?:tendo em vista|levando em considera[çc][aã]o)\b/gi,'Considerando').replace(/\b(?:discorra sobre|disserte sobre)\b/gi,'Explique').replace(/\bidentifique e assinale\b/gi,'Marque').replace(/\bno que diz respeito (?:a|à)\b/gi,'sobre').replace(/\bcom o intuito de\b/gi,'para').replace(/\bpor interm[ée]dio de\b/gi,'por').replace(/\bposteriormente\b/gi,'depois').replace(/\bpreviamente\b/gi,'antes').replace(/\befetue o c[áa]lculo\b/gi,'Calcule');
  }
  function sentences(input){
    return clean(input).replace(/\r/g,'').split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ý])/u).map(s=>s.replace(/^\s*[-•▪]\s*/, '').trim()).filter(Boolean);
  }
  const stop=new Set('a o as os um uma de da do das dos em no na nos nas para por com e ou se que ao aos como mais muito sua seu suas seus este esta isso esse essa ser estar sao são foi entre sobre tema conteudo conteúdo topicos tópicos'.split(' '));
  function keywords(text,limit=10){
    const freq=new Map();
    (clean(text).match(/[\p{L}][\p{L}\p{N}-]{2,}/gu)||[]).forEach(w=>{const n=norm(w);if(!stop.has(n)&&!stop.has(w.toLowerCase())){const f=freq.get(n)||{word:w,count:0};f.count++;freq.set(n,f);}});
    return [...freq.values()].sort((a,b)=>b.count-a.count).slice(0,limit).map(x=>x.word);
  }
  function summary(input,{size='medio',title='Resumo de estudo'}={}){
    const text=clean(input);if(text.length<40)throw new Error('Cole pelo menos 40 caracteres de conteúdo para gerar o resumo.');
    if(text.length>150000)throw new Error('Use até 150.000 caracteres por resumo. Divida o material em partes.');
    const ss=sentences(text),terms=keywords(text,12),weights=new Set(terms.map(norm));
    const count=Math.min(ss.length,({curto:5,medio:10,detalhado:18}[size]||10));
    const ranked=ss.map((s,i)=>({s,i,score:(s.match(/[\p{L}]{3,}/gu)||[]).filter(w=>weights.has(norm(w))).length/Math.sqrt(s.length+1)+(i===0?.3:0)+(/[=Δ∑]|\b\d+[.,]?\d*\s*(?:%|km|cm|kg|m\/s)/i.test(s)?.3:0)}));
    const unique=new Set();const chosen=[];
    for(const item of ranked.sort((a,b)=>b.score-a.score)){const k=norm(item.s);if(unique.has(k))continue;unique.add(k);chosen.push(item);if(chosen.length===count)break;}
    chosen.sort((a,b)=>a.i-b.i);
    const formulas=[...new Set(ss.filter(s=>/[=Δ∑]|\b\d+\s*%/.test(s)))].slice(0,8);
    const points=chosen.map(x=>x.s),review=terms.slice(0,5).map(t=>`Explique “${t}” usando o material da aula.`);
    const plain=`${title}\n\nIDEIAS PRINCIPAIS\n${points.map(s=>'• '+s).join('\n')}\n\nTERMOS PARA REVISAR\n${terms.join(', ')}${formulas.length?'\n\nFÓRMULAS E DADOS DO MATERIAL\n'+formulas.join('\n'):''}\n\nROTEIRO DE REVISÃO\n${review.map((s,i)=>(i+1)+'. '+s).join('\n')}`;
    return {title,points,terms,formulas,review,plain,sourceLength:text.length,summaryLength:points.join(' ').length};
  }
  function generateQuestions(content,{qtd=6,qtdObjetivas=3,formato='misto',dificuldade='Média'}={}){
    const facts=sentences(content).filter(s=>s.length>25&&!/^(tema|topicos|objetivo|disciplina)\s*:/i.test(s));
    if(!facts.length)throw new Error('Inclua explicações no conteúdo. Uma lista de títulos não permite gerar questões com respostas verificáveis.');
    const limit=Math.min(25,Math.max(1,+qtd||6));
    const questions=[];
    for(let i=0;i<limit;i++){
      const fact=facts[i%facts.length],words=keywords(fact,12).filter(w=>w.length>=4);
      const term=words[Math.floor(i/facts.length)%Math.max(1,words.length)];
      const objective=formato==='multipla'||(formato==='misto'&&i<qtdObjetivas);
      const pattern=term?new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'):null;
      const distractors=[...new Set(keywords(content,100).filter(t=>norm(t)!==norm(term)&&!norm(fact).includes(norm(t))))].slice(i%3,i%3+3);
      if(objective&&(!term||distractors.length<2))throw new Error('O material é curto para criar alternativas consistentes. Acrescente explicações ou escolha questões discursivas.');
      if(objective){
        const options=[term,...distractors].slice(0,4);const shift=i%options.length;options.push(...options.splice(0,shift));
        questions.push({title:'Qual termo completa corretamente a frase do material?',body:[fact.replace(pattern,'__________')],options:options.map((t,j)=>String.fromCharCode(65+j)+') '+t),answer:options.indexOf(term),linhas:0});
      }else questions.push({title:norm(dificuldade).includes('facil')?`Descreva, com suas palavras, a ideia principal do trecho ${i+1}.`:norm(dificuldade).includes('dificil')?`Analise a ideia do trecho ${i+1}, relacione-a a outro conceito da aula e justifique sua resposta.`:`Explique a ideia apresentada no trecho ${i+1} e sua relação com o conteúdo da aula.`,body:[fact],options:[],answer:null,linhas:4});
    }
    return questions;
  }
  function reduceOptions(options,answer,limit){
    if(options.length<=limit)return {options,answer};
    if(!Number.isInteger(answer)||answer<0||answer>=options.length)throw new Error('Informe o gabarito de cada questão antes de reduzir alternativas.');
    const indexes=options.map((_,i)=>i).filter(i=>i!==answer).slice(0,limit-1).concat(answer).sort((a,b)=>a-b);
    return {options:indexes.map(i=>options[i]),answer:indexes.indexOf(answer),indexes};
  }
  function adaptHtml(html,profile,{answers={}}={}){
    const box=root.document.createElement('div');box.innerHTML=html;
    let cards=[...box.querySelectorAll('.ai-question-card,.question')].filter(c=>!c.classList.contains('free-content'));
    const pending=[...(profile.manual||[])],changes=[];
    if(profile.reduce){
      if(!cards.length)pending.push('Separe as questões com “? Enunciado” para reduzir a quantidade.');
      else {const total=profile.quantity||Math.max(1,Math.ceil(cards.length*(1-profile.reductionPercent/100)));cards.slice(total).forEach(c=>c.remove());cards=cards.slice(0,total);changes.push(`Quantidade ajustada para ${cards.length} questões.`);}
    }
    if(profile.alternatives){
      if(!cards.length)pending.push('Separe as questões e as alternativas para aplicar a redução.');
      cards.forEach((card,i)=>{
        const opts=[...card.querySelectorAll('.ai-options > li,.options > p')];
        const answer=answers[i];
        if(opts.length<=profile.alternatives)return;
        const reduced=reduceOptions(opts,answer,profile.alternatives);
        opts.forEach((el,j)=>{if(!reduced.indexes.includes(j))el.remove();});
        [...card.querySelectorAll('.options > p')].forEach((el,j)=>{const walker=root.document.createTreeWalker(el,4);const t=walker.nextNode();if(t)t.textContent=t.textContent.replace(/^\s*[A-H][).]\s*/i,String.fromCharCode(65+j)+') ');});
        changes.push(`Questão ${i+1}: ${profile.alternatives} alternativas, resposta correta preservada.`);
      });
    }
    if(profile.simplify){
      const walker=root.document.createTreeWalker(box,4);let t,changed=0;
      while((t=walker.nextNode())){if(t.parentElement.closest('code,pre,.options,.ai-options'))continue;const value=simplify(t.textContent);if(value!==t.textContent){t.textContent=value;changed++;}}
      changes.push(`${changed} trecho(s) com linguagem ajustada; termos técnicos preservados.`);
    }
    if(profile.onePerPage)cards.forEach((c,i)=>{if(i)c.dataset.newPage='true';});
    if(profile.rules?.some(r=>r.action==='objective')&&cards.length&&cards.every(c=>c.querySelector('.options,.ai-options'))){const idx=pending.indexOf('Conversão para questões objetivas');if(idx>=0)pending.splice(idx,1);}
    return {html:box.innerHTML,pending:[...new Set(pending)],changes};
  }
  const api={rules,resolve,simplify,sentences,keywords,summary,generateQuestions,reduceOptions,adaptHtml,esc};
  root.MaximusPedagogia=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
