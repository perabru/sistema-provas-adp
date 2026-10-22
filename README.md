# Provas adaptadas — Escola Máximu's

Sistema de avaliações, atividades e resumos. A interface funciona em GitHub Pages; contas, alunos, turmas e banco de questões continuam no Firebase original.

**Site:** https://perabru.github.io/sistema-provas-adp/

## Uso rápido

1. Entre como professor, escolha a turma e o aluno e informe disciplina e data.
2. Cole uma prova no editor ou preencha **Conteúdo da aula** e clique em **Criar questões do conteúdo**.
3. Gere a prévia e confira as adaptações e os apoios indicados no painel **Adaptações**.
4. Marque a revisão do professor e exporte Word, PDF individual ou a turma em ZIP.

As opções menos usadas ficam em **Opções de questões e exportação**. Há recuperação de senha pelo e-mail cadastrado. O Firebase precisa estar acessível e com o provedor de e-mail/senha habilitado; a entrega dos e-mails depende da configuração do projeto.

## Acesso, primeiro login e senha

Contas criadas pela coordenação recebem `mustChangePassword: true`. No primeiro acesso, o painel e as consultas de alunos ficam suspensos até a pessoa confirmar a senha atual, escolher outra com pelo menos oito caracteres e salvar. A conta autentica novamente no Firebase antes de trocar a senha. O perfil só é liberado após a confirmação da troca e a gravação do marcador; se essa gravação falhar, o botão permite concluir sem trocar a senha novamente.

No menu de professor ou coordenação, **Minha conta · alterar senha** permite trocar a senha depois. **Esqueci minha senha** envia a recuperação pelo Firebase em português, com confirmação na interface sem revelar se o e-mail existe. O recebimento exige que a caixa de e-mail exista e que o projeto permita o envio. Uma recuperação pela página padrão do Firebase não remove sozinha um marcador de primeiro acesso ainda pendente.

O marcador é uma exigência do fluxo do aplicativo; as permissões efetivas do banco continuam sendo controladas pelas regras do Firebase. As regras devem permitir que cada usuário atualize apenas seus campos de senha (`mustChangePassword` e `senhaAlteradaEm`), preservando a proteção de papéis, turmas e demais registros. Não substitua as regras existentes por acesso público. Sua conferência e eventual implantação exigem acesso administrativo ao projeto.

### Provisionamento administrativo

`scripts/provisionar-acessos.cjs` prepara os perfis institucionais `admin@maximus.com.br` e `coordenação@maximus.com.br`. O primeiro recebe `nivelAcesso: administrador`; ambos usam o papel de gestão `coordenacao`, compatível com o sistema atual, e exigem troca de senha. O script preserva a senha de uma conta que já exista e atualiza somente os campos necessários do perfil.

Execute-o apenas em um ambiente administrativo autenticado no projeto `siteoficial-2279a`, com o pacote oficial `firebase-admin` instalado. A entrada padrão recebe um JSON contendo `projectId`, `temporaryPassword` e, se necessário, `coordEmail`; a senha não tem valor padrão, não é gravada no repositório e não aparece na saída. O script não foi executado sem credenciais administrativas. Se o Firebase recusar o endereço com acentos, confirme com a escola um endereço válido antes de configurar outro e-mail; ele não é substituído automaticamente.

## Resumo do conteúdo

Acesse **Resumo do conteúdo** na área do professor ou **Resumo de conteúdo · sem login** na entrada. Cole o material ou importe o conteúdo da avaliação, escolha curto, médio ou detalhado e gere o resumo. Edite livremente antes de copiar ou baixar PDF, DOCX ou TXT.

O resumo é **extrativo**: seleciona frases presentes no material, identifica termos recorrentes e separa fórmulas/dados. Não consulta uma IA externa nem completa lacunas com fatos inventados. Textos curtos podem aparecer quase integralmente; o detalhamento controla a quantidade máxima de ideias. A revisão do professor continua necessária.

## Celular e aplicativo Android

A interface prioriza celulares, com navegação inferior, menu lateral, campos legíveis, botões maiores e editor ajustado à tela. A prévia permite alternar entre **Ajustar à tela** e **Ver em tamanho real**, preservando as dimensões de impressão nos arquivos.

1. No Android, abra o [sistema](https://perabru.github.io/sistema-provas-adp/) no Chrome com internet.
2. Toque em **Instalar aplicativo** e confirme a instalação na janela do navegador.
3. Se a janela não aparecer, use o menu **⋮ → Instalar aplicativo** ou **Adicionar à tela inicial**. Dentro de WhatsApp ou Instagram, escolha antes **Abrir no navegador**.
4. Abra **Provas Máximu’s** pela tela inicial. O botão desaparece quando o sistema detecta a instalação.

A confirmação da instalação depende do usuário e da disponibilidade do navegador. Não é necessário baixar APK ou ativar o modo desenvolvedor. Em iPhone/iPad, toque em **Instalar no iPhone/iPad** para ver o guia: **Safari → Compartilhar → Adicionar à Tela de Início → Abrir como App da Web → Adicionar**. Conforme a versão do iOS, Compartilhar pode ficar no Menu da Página. O sistema reconhece também iPads que se identificam como Mac e usa um ícone Apple de 180 × 180 pixels. A instalação exige esses toques no aparelho; o site não instala automaticamente.

Após o primeiro carregamento completo com internet, o aplicativo mantém os arquivos públicos em cache. O resumo e suas exportações funcionam sem conexão; login, alunos, turmas, banco de questões e sincronização exigem internet. O cache não guarda respostas do Firebase nem dados de alunos. Não desinstale nem limpe os dados do navegador enquanto houver conteúdo não exportado.

Uma nova versão é oferecida no botão **Atualizar**. O aplicativo pede confirmação se houver edição em andamento e mantém o HTML e os scripts na mesma versão até a atualização.

## Adaptações

As regras usam as orientações registradas, o tipo de prova e o complemento do professor. Um diagnóstico isolado não determina adaptações. Valores SIM/NÃO e instruções negativas são respeitados por recurso.

| Orientação | Resultado |
| --- | --- |
| Fonte ampliada / Fonte: 18 | Fonte aplicada à prévia, PDF e Word |
| Caixa alta / letra bastão | Texto em maiúsculas; código e fórmulas são preservados |
| Espaçamento ampliado / duplo | Aumenta o espaçamento entre linhas |
| Mais linhas / 8 linhas | Amplia a área de resposta discursiva |
| Comandos em destaque | Destaca os verbos de comando |
| Dica / leitura por etapas | Acrescenta orientação de leitura sem informar a resposta |
| Linguagem simples | Substituições conservadoras de expressões; não remove fórmulas nem negações |
| Reduzir alternativas / 2 alternativas | Remove distratores preservando o gabarito informado |
| Reduzir para 4 questões | Mantém as primeiras quatro questões; conferir cobertura e pontuação |
| Redução de 50% / reduzir questões | Aplica o percentual informado; sem percentual, reduz 30% |
| Uma questão por página | Quebras de página na impressão, PDF e Word |
| Tempo adicional / ledor | Orientação no documento e confirmação pelo professor |
| Imagens, material tátil, conversão em objetiva e orientações não reconhecidas | Lista explícita para ajuste e confirmação manual |

**Redução de alternativas:** as questões geradas possuem gabarito interno, que não aparece no documento do aluno. Para provas coladas, abra **Gabarito e redução de alternativas**, carregue as questões e indique a correta. Sem essa indicação, a redução é bloqueada. Qualquer edição do conteúdo invalida o gabarito anterior e a revisão.

Para estruturar questões coladas, use:

```text
Orientações gerais que devem ser preservadas.

? Qual componente guarda dados temporários?
A) RAM
B) ROM
C) SSD
D) HD

? Explique a diferença entre RAM e armazenamento.
@linhas 6
@dica Compare a permanência dos dados quando a energia é desligada.
```

Conteúdo livre mantém imagens e tabelas. Reduções de quantidade e de alternativas exigem questões estruturadas; quando isso não é possível, o painel informa o ajuste manual necessário. As regras não certificam automaticamente a adequação pedagógica individual.

Na exportação da turma, todos os documentos passam por conferência antes do download. O ZIP inclui um relatório das adaptações e dos ajustes manuais por aluno. Os apoios em sala precisam ser providenciados pelo professor.

## Questões locais

O gerador cria exercícios de completar frases e perguntas discursivas com base no conteúdo fornecido. O nível escolhido modifica os comandos das discursivas. A opção de usar o banco acrescenta somente material compatível com disciplina/tema. O limite é de 25 questões; material sem explicações suficientes recebe uma orientação para complementação.

Não é um modelo de linguagem generativo. O professor deve conferir o gabarito, a qualidade dos distratores, a dificuldade, a cobertura dos assuntos e o valor da avaliação, especialmente quando houver redução de questões.

## Importação e dados

- Em **Coordenação → Turmas → Selecionar planilha** (ou **Importar planilhas**), envie XLSX, XLS, XLSM, XLSB, ODS, CSV ou TSV, até 25 MB. Não é necessário usar um modelo fixo.
- O assistente reconhece listas contendo apenas turmas, alunos com coluna de turma, ano/série separado da letra, uma turma por aba e listas de alunos distribuídas em colunas com os nomes das turmas no cabeçalho. Também tenta reconhecer listas sem cabeçalho e títulos antes da tabela. Células vazias podem repetir a última turma preenchida.
- Confira as abas, as turmas/alunos reconhecidos e os totais antes de salvar. Em formatos ambíguos, escolha o tipo da aba e ajuste cabeçalho, colunas ou turma padrão. Abas não reconhecidas ficam desmarcadas para revisão; não são adivinhadas como cadastros. Planilhas protegidas por senha, digitalizações e tabelas sem nomes/turmas legíveis precisam de ajuste ou exportação pelo responsável.
- A importação inclui turmas sem duplicação e inclui/atualiza alunos; preserva os alunos ausentes do arquivo, os vínculos de professores e seus complementos. A gravação de dados e metadados é atômica no Realtime Database e exige coordenação ativa com senha já alterada. O histórico fica em `configuracao/importacoes`, coberto pela permissão de configuração da coordenação.
- O processamento da planilha ocorre no navegador, com limites de 20.000 linhas e 200 colunas por aba. Nada é salvo antes da confirmação.
- Matrículas e identificadores existentes são preservados; não há migração destrutiva do banco.
- PDF com texto selecionável, DOCX, TXT, HTML e imagens são aceitos no editor. PDFs digitalizados precisam de OCR externo; o sistema explica essa limitação.
- Não há envio do conteúdo a serviços de IA. Contas e registros salvos continuam usando o Firebase original.
- Não inclua nomes de alunos, diagnósticos, planilhas reais, senhas ou backups no repositório público. O QR usa apenas metadados de emissão, sem diagnóstico ou nome do aluno.

## Manutenção e testes

Sem npm ou compilação para publicar. Mantenha juntos `index.html`, `styles.css`, `mobile.css`, `app.js`, `conta.js`, `planilhas.js`, `pedagogia.js`, `resumo.js`, `mobile.js`, `pwa.js`, `sw.js`, `manifest.webmanifest` e a pasta `icons/`. As bibliotecas de documentos e os modelos originais estão incorporados em `app.js`, com seus avisos de licença. Ao publicar outra versão, atualize os identificadores dos arquivos no HTML e no cache de `sw.js`, além de `VERSION`.

```sh
node --check app.js
node --check planilhas.js
node --check pedagogia.js
node --check resumo.js
node --check conta.js
node --check mobile.js
node --check pwa.js
node --check sw.js
node --test tests/*.test.cjs
```

Os testes cobrem regras, negações, redução com preservação do gabarito, resumos fiéis ao texto, geração local, identidade de alunos na importação, instalação por gesto do usuário, cache offline, isolamento entre sites e atualização sem misturar versões. A verificação de interface usa dados fictícios, sem gravar no Firebase de produção.

### Publicação

O repositório já usa GitHub Pages na branch `main`, pasta raiz. Um push nessa branch dispara a publicação existente. O workflow de verificação executa os testes separadamente, sem modificar dados do Firebase. Contas reais, permissões do banco e entrega de e-mails devem ser verificadas pela coordenação no projeto Firebase; não são alteradas pelo código publicado.
