# Provas adaptadas — Escola Máximu's

Sistema de avaliações, atividades e resumos. A interface funciona em GitHub Pages; contas, alunos, turmas e banco de questões continuam no Firebase original.

**Site:** https://perabru.github.io/sistema-provas-adp/

## Uso rápido

1. Entre como professor, escolha a turma e o aluno e informe disciplina e data.
2. Cole uma prova no editor ou preencha **Conteúdo da aula** e clique em **Criar questões do conteúdo**.
3. Gere a prévia e confira as adaptações e os apoios indicados no painel **Adaptações**.
4. Marque a revisão do professor e exporte Word, PDF individual ou a turma em ZIP.

As opções menos usadas ficam em **Opções de questões e exportação**. Há recuperação de senha pelo e-mail cadastrado. O Firebase precisa estar acessível e com o provedor de e-mail/senha habilitado; a entrega dos e-mails depende da configuração do projeto.

## Resumo do conteúdo

Acesse **Resumo do conteúdo** na área do professor ou **Resumo de conteúdo · sem login** na entrada. Cole o material ou importe o conteúdo da avaliação, escolha curto, médio ou detalhado e gere o resumo. Edite livremente antes de copiar ou baixar PDF, DOCX ou TXT.

O resumo é **extrativo**: seleciona frases presentes no material, identifica termos recorrentes e separa fórmulas/dados. Não consulta uma IA externa nem completa lacunas com fatos inventados. Textos curtos podem aparecer quase integralmente; o detalhamento controla a quantidade máxima de ideias. A revisão do professor continua necessária.

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

- A coordenação mantém a importação de planilhas com mapeamento de colunas e prévia das alterações.
- Matrículas e identificadores existentes são preservados; não há migração destrutiva do banco.
- PDF com texto selecionável, DOCX, TXT, HTML e imagens são aceitos no editor. PDFs digitalizados precisam de OCR externo; o sistema explica essa limitação.
- Não há envio do conteúdo a serviços de IA. Contas e registros salvos continuam usando o Firebase original.
- Não inclua nomes de alunos, diagnósticos, planilhas reais, senhas ou backups no repositório público. O QR usa apenas metadados de emissão, sem diagnóstico ou nome do aluno.

## Manutenção e testes

Sem npm ou compilação para publicar. Mantenha juntos `index.html`, `styles.css`, `app.js`, `pedagogia.js` e `resumo.js`. As bibliotecas de documentos e os modelos originais estão incorporados em `app.js`, com seus avisos de licença.

```sh
node --check app.js
node --check pedagogia.js
node --check resumo.js
node --test tests/pedagogia.test.cjs
```

Os testes cobrem regras, negações, redução com preservação do gabarito, resumos fiéis ao texto, geração local e identidade de alunos na importação. A verificação de interface usa dados fictícios, sem gravar no Firebase de produção.

### Publicação

O repositório já usa GitHub Pages na branch `main`, pasta raiz. Um push nessa branch dispara a publicação existente. O workflow de verificação executa os testes separadamente, sem modificar dados do Firebase. Contas reais, permissões do banco e entrega de e-mails devem ser verificadas pela coordenação no projeto Firebase; não são alteradas pelo código publicado.
