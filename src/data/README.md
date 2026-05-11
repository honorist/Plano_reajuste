# Dados de referência

Esta pasta contém os dados de referência que sustentam os cálculos do sistema. Cada arquivo cita o **ato normativo de origem** e a **última atualização**, de modo a permitir auditoria e rastreabilidade pericial.

## Arquivos

- **`indices-ans.json`** — Tabela histórica dos percentuais máximos de reajuste autorizados pela ANS para planos individuais/familiares. Cada ciclo (maio→abril) traz `inicio`, `fim`, `percentual` e `ato_normativo`.
- **`faixas-etarias-rn63.json`** — As 10 faixas etárias da Resolução Normativa ANS nº 63/2003 e suas regras de variação.
- **`fundamentacao-legal.json`** — Textos-fonte das normas e ementas de jurisprudência citadas pelos módulos de cálculo.

## Atualização

Os percentuais ANS são divulgados anualmente, em geral entre março e maio. Ao publicar um novo ciclo:

1. Adicionar entrada no array `ciclos` de `indices-ans.json`.
2. Atualizar o campo `ultima_atualizacao`.
3. Conferir o `ato_normativo` (Comunicado, Resolução Normativa ou Nota Técnica) e o link oficial.
4. Rodar `npm test` — testes de fixture validam a integridade do JSON.
5. Versionar (semver: bump de patch quando adiciona ciclo).

## Fonte oficial

ANS — Reajuste de planos individuais/familiares:
https://www.gov.br/ans/pt-br/assuntos/consumidor/reajuste-variacao-de-mensalidade/reajuste-anual-de-planos-individuais-familiares-1/metodologia-de-calculo
