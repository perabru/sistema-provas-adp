(function(){
  'use strict';
  const $=id=>document.getElementById(id),P=window.MaximusPedagogia;
  const message=(text,type='')=>{const el=$('summaryStatus');el.textContent=text;el.className='message '+type;};
  const result=()=>{const value=$('summaryResult').value.trim();if(!value)throw new Error('Gere ou escreva o resumo primeiro.');return value;};
  const download=(blob,extension)=>{const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='Resumo_de_estudo.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
  const safely=fn=>async()=>{try{await fn();}catch(e){message(e.message||'Não foi possível concluir. Tente novamente.','error');}};
  const useContent=()=>{const source=$('conteudoMinistrado')?.value.trim();if(!source)throw new Error('Preencha o conteúdo da avaliação ou cole o material diretamente acima.');$('summarySource').value=source;};
  document.querySelectorAll('[data-open-summary]').forEach(button=>button.addEventListener('click',()=>{$('summaryDialog').showModal();if(!$('summarySource').value&&$('conteudoMinistrado')?.value)useContent();}));
  $('closeSummary').addEventListener('click',()=>$('summaryDialog').close());
  $('useClassContent').addEventListener('click',safely(useContent));
  $('generateSummary').addEventListener('click',safely(()=>{const data=P.summary($('summarySource').value,{title:$('summaryTitle').value.trim()||'Resumo de estudo',size:$('summarySize').value});$('summaryResult').value=data.plain;message(`Resumo pronto: ${data.points.length} ideias principais. Revise o texto antes de compartilhar.`,'ok');}));
  $('copySummary').addEventListener('click',safely(async()=>{const text=result();try{await navigator.clipboard.writeText(text);message('Resumo copiado.','ok');}catch{$('summaryResult').focus();$('summaryResult').select();message('Selecione Copiar no seu dispositivo para copiar o texto.');}}));
  $('summaryTxt').addEventListener('click',safely(()=>download(new Blob([result()],{type:'text/plain;charset=utf-8'}),'txt')));
  $('summaryPdf').addEventListener('click',safely(()=>{
    if(!window.jspdf?.jsPDF)throw new Error('O exportador ainda está carregando. Tente novamente.');
    const doc=new window.jspdf.jsPDF({format:'a4'});doc.setFont('helvetica');doc.setFontSize(11);let y=20;
    const text=result().replace(/•/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
    for(const paragraph of text.split('\n')){
      const lines=doc.splitTextToSize(paragraph||' ',170);
      for(const line of lines){if(y>275){doc.addPage();y=20;}doc.text(line,20,y);y+=5.5;}
      y+=1.5;
    }
    const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);doc.setFontSize(8);doc.text(`Escola Máximu's - ${i}/${count}`,20,288);}
    doc.save('Resumo_de_estudo.pdf');message('PDF gerado.','ok');
  }));
  $('summaryDocx').addEventListener('click',safely(async()=>{
    if(!window.JSZip)throw new Error('O exportador ainda está carregando. Tente novamente.');
    const paragraphs=result().split('\n').map(line=>`<w:p><w:pPr><w:spacing w:after="100" w:line="320"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${P.esc(line)}</w:t></w:r></w:p>`).join('');
    const zip=new window.JSZip();
    zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`);
    download(await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'docx');message('Word gerado.','ok');
  }));
  // Apaga os dados do resumo ao encerrar uma sessão em dispositivo compartilhado.
  document.querySelectorAll('#profLogout,#adminLogout').forEach(btn=>btn.addEventListener('click',()=>{['summarySource','summaryResult'].forEach(id=>$(id).value='');message('');$('summaryDialog').close();}));
})();
