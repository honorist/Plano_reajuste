# Juliana Ramos Advocacia — Análise de Reajuste de Plano de Saúde

Ferramenta gratuita para análise de **reajuste abusivo** de plano de saúde conforme metodologia da **ANS (Agência Nacional de Saúde Suplementar)** e jurisprudência consolidada do STJ e STF.

Desenvolvida por **Juliana Ramos Advocacia & Consultoria Jurídica** como serviço de utilidade pública para beneficiários de plano de saúde.

> ⚖️ **Disclaimer legal**: Esta ferramenta **NÃO substitui** consultoria jurídica. Os indícios técnicos identificados estão sujeitos a análise por advogado(a) habilitado(a). Os cálculos seguem a metodologia oficial da ANS e a interpretação jurisprudencial atual, mas casos concretos podem exigir avaliação individualizada.

## O que a ferramenta faz

Para um beneficiário de plano de saúde (consumidor) ou advogado(a), o sistema avalia se o reajuste aplicado pela operadora respeita os limites legais, em quatro cenários:

1. **Reajuste anual de plano individual/familiar** — compara o percentual aplicado com o teto autorizado pela ANS no mês de aniversário do contrato.
2. **Reajuste por mudança de faixa etária** — valida as regras da Resolução Normativa ANS nº 63/2003 (limite de 6×, variação acumulada das faixas 7–10 e vedação pós-60 anos do Estatuto do Idoso).
3. **Falso coletivo** — identifica planos coletivos empresariais ou por adesão que, na prática, devem ser equiparados a individuais (Tema 952 e 1016 do STJ).
4. **Reajuste por sinistralidade** — analisa a razoabilidade do reajuste em planos coletivos (RN 389/2015).

A ferramenta gera quatro documentos prontos para uso:

- 📄 **Resumo executivo (PDF, 1 página)** — para o cliente/beneficiário.
- ⚖️ **Minuta de petição inicial (DOCX)** — para o(a) advogado(a).
- 📊 **Planilha pericial (XLSX)** — todos os cálculos com fórmulas visíveis.
- 📚 **Relatório técnico (DOCX)** — fundamentação jurídica completa.

## Princípios técnicos

- **100% client-side**: os dados informados não saem do navegador. Conformidade LGPD por design.
- **Determinístico**: mesma entrada → mesma saída. Importante para perícia.
- **Auditável**: cada cálculo apresenta os passos e cita as normas que sustentam o resultado.
- **Versionado**: a tabela de índices ANS e a fundamentação legal estão em JSON com referência ao ato normativo de origem.
- **TDD**: testes exaustivos garantem que mudanças não quebrem cálculos consolidados em juízo.

## Base legal e jurisprudencial

- Lei nº 9.656/1998 — Lei dos Planos de Saúde
- Lei nº 10.741/2003 — Estatuto da Pessoa Idosa
- Lei nº 8.078/1990 — Código de Defesa do Consumidor
- Resolução Normativa ANS nº 63/2003 — Faixas etárias
- Resolução Normativa ANS nº 389/2015 — Coletivos
- Súmula nº 3/2001 da ANS
- Tema 952 do STJ — REsp 1.568.244
- Tema 1016 do STJ
- IRDR nº 11 do TJSP — Variação acumulada
- Decisão do STF de 2025 — Reajuste pós-60 anos

## Desenvolvimento

```bash
npm install
npm test              # roda todos os testes
npm run test:watch    # modo TDD
npm run test:coverage # com relatório de cobertura
npm run typecheck     # verificação estática JSDoc
npm run build         # bundle para produção (esbuild)
npm run dev           # servidor local
```

## Status

✅ **MVP funcional**. Quatro módulos de cálculo + quatro geradores de documento + UI completa em wizard. Cobertura 99,66% linhas / 91,83% branches em 119 testes automatizados.

🌐 **App público**: https://honorist.github.io/Plano_reajuste/ (após ativação do GitHub Pages)

### Próximas evoluções (não bloqueantes)

- Cobrir ciclos ANS anteriores a 05/2018
- Refinar linguagem da minuta de petição com revisão jurídica externa
- Adicionar mais fixtures jurisprudenciais (REsps específicos)
- Tradução para outros idiomas (priorizar espanhol — sistema ANS no Brasil é único, mas a estrutura serve para análises similares)

## Licença

[MIT](./LICENSE) © 2026 Juliana Ramos Advocacia & Consultoria Jurídica
