// @ts-check
/**
 * Módulo 1 — Reajuste anual de plano de saúde individual ou familiar
 * conforme metodologia da ANS.
 *
 * Compara o reajuste aplicado pela operadora com o **teto máximo** divulgado
 * anualmente pela ANS para planos individuais/familiares e classifica:
 *
 *   - "regular":     aplicado ≤ teto, ou ciclo positivo com aumento dentro do limite.
 *   - "abusivo":     aplicado > teto, OU operadora não aplicou redutor obrigatório.
 *   - "inconclusivo":aniversário fora da janela temporal coberta pela ferramenta.
 *
 * Para cada caso, retorna o objeto ResultadoCalculo (contrato unificado),
 * que UI, PDF, DOCX e XLSX consomem da mesma fonte.
 */
import {
  validarDataIso,
  validarMesIso,
  encontrarCicloAns,
  mesEstaNoCiclo,
} from "./date-utils.js";
import {
  aplicarPercentual,
  excesso,
  dobroCdc,
  formatarBRL,
  paraDecimal,
} from "./money.js";
import indicesAns from "../data/indices-ans.json" with { type: "json" };

/**
 * @typedef {Object} Passo
 * @property {string} titulo
 * @property {string} descricao
 * @property {string} [formula]
 * @property {Record<string, string | number>} [valores]
 */

/**
 * @typedef {Object} FundamentacaoLegal
 * @property {string} norma
 * @property {string} ementa
 * @property {string} [link]
 * @property {string} aplicacao_ao_caso
 */

/**
 * @typedef {Object} Alerta
 * @property {"info" | "atencao" | "critico"} severidade
 * @property {string} mensagem
 */

/**
 * @typedef {Object} ResultadoCalculo
 * @property {"abusivo" | "regular" | "inconclusivo"} veredito
 * @property {Record<string, string | number | object | null>} resultado
 * @property {Passo[]} passos
 * @property {FundamentacaoLegal[]} fundamentacao_legal
 * @property {Alerta[]} alertas
 * @property {string} resumo_leigo
 * @property {string} resumo_tecnico
 */

/**
 * @typedef {Object} EntradaModulo1
 * @property {string} dataAssinaturaContrato
 * @property {string} mesAniversarioReajuste
 * @property {number} mensalidadeAnterior
 * @property {number} mensalidadeAplicada
 * @property {"individual" | "familiar"} tipoContrato
 */

/**
 * @param {EntradaModulo1} entrada
 * @returns {ResultadoCalculo}
 */
export function calcularReajusteAnualAns(entrada) {
  // 1. Validação básica
  validarDataIso(entrada.dataAssinaturaContrato);
  validarMesIso(entrada.mesAniversarioReajuste);

  if (
    entrada.tipoContrato !== "individual" &&
    entrada.tipoContrato !== "familiar"
  ) {
    throw new TypeError(
      `Tipo de contrato "${entrada.tipoContrato}" não é tratado pelo Módulo 1. ` +
        `Para planos coletivos (empresarial ou por adesão), execute primeiro o Módulo 3 ` +
        `(falso coletivo): se equiparável a individual, o cálculo retorna a este módulo.`,
    );
  }

  const mesAssinatura = entrada.dataAssinaturaContrato.slice(0, 7);
  if (entrada.mesAniversarioReajuste < mesAssinatura) {
    throw new RangeError(
      `Mês do reajuste (${entrada.mesAniversarioReajuste}) é anterior à assinatura do contrato (${mesAssinatura}).`,
    );
  }

  // 2. Localiza o ciclo ANS correspondente ao aniversário
  const ciclo = encontrarCicloAns(
    entrada.mesAniversarioReajuste,
    indicesAns.ciclos,
  );

  /** @type {Alerta[]} */
  const alertas = [];

  if (!ciclo) {
    return montarInconclusivo(entrada, alertas);
  }

  // 3. Cálculos monetários
  const tetoLegal = aplicarPercentual(
    entrada.mensalidadeAnterior,
    ciclo.percentual,
  );
  const valorExcesso = excesso(entrada.mensalidadeAplicada, tetoLegal);
  const restituicao = dobroCdc(valorExcesso);

  // Percentual efetivamente aplicado pela operadora (para fins didáticos)
  const percentualAplicado = paraDecimal(entrada.mensalidadeAplicada)
    .div(entrada.mensalidadeAnterior)
    .minus(1)
    .times(100)
    .toDecimalPlaces(4)
    .toNumber();

  // 4. Alertas contextuais
  if (mesEstaNoCiclo(entrada.mesAniversarioReajuste, "2020-09", "2020-12")) {
    alertas.push({
      severidade: "atencao",
      mensagem:
        "Aplicação do reajuste suspensa entre setembro e dezembro de 2020 por força da Resolução Normativa ANS nº 4.538/2020. " +
        "Verifique se a operadora respeitou a suspensão e a posterior cobrança retroativa autorizada em 2021.",
    });
  }
  if (ciclo.observacao) {
    alertas.push({ severidade: "info", mensagem: ciclo.observacao });
  }

  // 5. Veredito
  // Atenção: decimal.js considera 0 como "positive" — usamos comparação estrita.
  const ehAbusivo = paraDecimal(valorExcesso).greaterThan(0);
  const veredito = ehAbusivo ? "abusivo" : "regular";

  // 6. Passos didáticos
  const passos = montarPassos({
    entrada,
    ciclo,
    tetoLegal,
    valorExcesso,
    restituicao,
    percentualAplicado,
    ehAbusivo,
  });

  // 7. Fundamentação legal
  const fundamentacao = montarFundamentacao({ ciclo, ehAbusivo });

  // 8. Resumos
  const resumoLeigo = montarResumoLeigo({
    ehAbusivo,
    excesso: valorExcesso,
    restituicao,
    ciclo,
    percentualAplicado,
  });
  const resumoTecnico = montarResumoTecnico({
    ehAbusivo,
    entrada,
    ciclo,
    tetoLegal,
    valorExcesso,
    restituicao,
    percentualAplicado,
  });

  return {
    veredito,
    resultado: {
      aplicado: paraDecimal(entrada.mensalidadeAplicada).toFixed(2),
      anterior: paraDecimal(entrada.mensalidadeAnterior).toFixed(2),
      teto_legal: tetoLegal,
      excesso: valorExcesso,
      restituicao_cdc: restituicao,
      percentual_aplicado: percentualAplicado,
      percentual_teto: ciclo.percentual,
      ciclo_ans: {
        inicio: ciclo.inicio,
        fim: ciclo.fim,
        percentual: ciclo.percentual,
        ato_normativo: ciclo.ato_normativo,
      },
    },
    passos,
    fundamentacao_legal: fundamentacao,
    alertas,
    resumo_leigo: resumoLeigo,
    resumo_tecnico: resumoTecnico,
  };
}

/**
 * @param {EntradaModulo1} entrada
 * @param {Alerta[]} alertas
 * @returns {ResultadoCalculo}
 */
function montarInconclusivo(entrada, alertas) {
  alertas.push({
    severidade: "atencao",
    mensagem:
      `Aniversário do contrato em ${entrada.mesAniversarioReajuste} está fora do escopo coberto pela ferramenta ` +
      `(MVP atual: ciclos ANS de maio/2018 em diante). Para reajustes anteriores, ` +
      `é necessário consultar diretamente os comunicados ANS do período.`,
  });
  return {
    veredito: "inconclusivo",
    resultado: {
      aplicado: paraDecimal(entrada.mensalidadeAplicada).toFixed(2),
      anterior: paraDecimal(entrada.mensalidadeAnterior).toFixed(2),
      teto_legal: null,
      excesso: null,
      restituicao_cdc: null,
      percentual_aplicado: null,
      percentual_teto: null,
      ciclo_ans: null,
    },
    passos: [
      {
        titulo: "Identificação do ciclo ANS",
        descricao:
          `Nenhum ciclo ANS coberto pela ferramenta inclui o mês de aniversário informado ` +
          `(${entrada.mesAniversarioReajuste}). A análise deste reajuste exige consulta manual aos ` +
          `comunicados ANS do período correspondente.`,
      },
    ],
    fundamentacao_legal: [
      {
        norma: "Lei nº 9.656/1998, art. 35-E",
        ementa:
          "Reajuste de mensalidade em planos individuais sujeito a autorização prévia da ANS.",
        aplicacao_ao_caso:
          "Mesmo fora do escopo desta ferramenta, qualquer reajuste de plano individual depende de ato autorizativo da ANS para ser legítimo.",
      },
    ],
    alertas,
    resumo_leigo:
      "O período do seu reajuste está fora da faixa coberta por esta ferramenta. Recomendamos consultar advogado(a) com acesso ao histórico completo de comunicados da ANS.",
    resumo_tecnico:
      "Análise inconclusiva por ausência de tabela ANS para o ciclo correspondente ao mês de aniversário informado. Cobertura atual do MVP: maio/2018 em diante.",
  };
}

/**
 * @param {{
 *   entrada: EntradaModulo1,
 *   ciclo: import("./date-utils.js").CicloAns,
 *   tetoLegal: string,
 *   valorExcesso: string,
 *   restituicao: string,
 *   percentualAplicado: number,
 *   ehAbusivo: boolean
 * }} ctx
 * @returns {Passo[]}
 */
function montarPassos(ctx) {
  const { entrada, ciclo, tetoLegal, valorExcesso, restituicao, percentualAplicado, ehAbusivo } = ctx;
  return [
    {
      titulo: "1. Identificação do ciclo de reajuste ANS",
      descricao:
        `O contrato foi celebrado em ${entrada.dataAssinaturaContrato}. Conforme metodologia da ANS, ` +
        `o reajuste anual incide no mês de aniversário do contrato. No aniversário de ${entrada.mesAniversarioReajuste}, ` +
        `aplica-se o ciclo ANS de ${ciclo.inicio} a ${ciclo.fim} (${ciclo.ato_normativo}).`,
      valores: {
        data_contrato: entrada.dataAssinaturaContrato,
        mes_aniversario: entrada.mesAniversarioReajuste,
        ciclo: `${ciclo.inicio} a ${ciclo.fim}`,
        ato_normativo: ciclo.ato_normativo,
      },
    },
    {
      titulo: "2. Percentual máximo autorizado pela ANS",
      descricao:
        `Para esse ciclo, a ANS autorizou o percentual máximo de ${ciclo.percentual.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%. ` +
        `Nenhuma operadora pode aplicar percentual superior a esse limite em planos individuais ou familiares.`,
      valores: { percentual_teto: `${ciclo.percentual}%` },
    },
    {
      titulo: "3. Cálculo do valor máximo permitido",
      descricao:
        `Aplicando o percentual autorizado sobre a mensalidade anterior (${formatarBRL(entrada.mensalidadeAnterior)}), ` +
        `obtém-se o valor máximo legalmente cobrável: ${formatarBRL(tetoLegal)}.`,
      formula: `Valor máximo = mensalidade anterior × (1 + percentual ANS ÷ 100)`,
      valores: {
        mensalidade_anterior: formatarBRL(entrada.mensalidadeAnterior),
        teto_legal: formatarBRL(tetoLegal),
      },
    },
    {
      titulo: "4. Percentual efetivamente aplicado pela operadora",
      descricao:
        `A operadora cobrou ${formatarBRL(entrada.mensalidadeAplicada)} no novo período, ` +
        `o que representa um reajuste de ${percentualAplicado.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}% sobre a mensalidade anterior.`,
      formula: `Percentual aplicado = (mensalidade aplicada ÷ mensalidade anterior − 1) × 100`,
      valores: {
        mensalidade_aplicada: formatarBRL(entrada.mensalidadeAplicada),
        percentual_aplicado: `${percentualAplicado}%`,
      },
    },
    {
      titulo: "5. Comparação aplicado vs. teto ANS",
      descricao: ehAbusivo
        ? `O valor cobrado (${formatarBRL(entrada.mensalidadeAplicada)}) supera o limite legal (${formatarBRL(tetoLegal)}) ` +
          `em ${formatarBRL(valorExcesso)}. Caracteriza-se reajuste abusivo, em desconformidade com a metodologia ANS e a Lei 9.656/98.`
        : `O valor cobrado (${formatarBRL(entrada.mensalidadeAplicada)}) está dentro do limite legal (${formatarBRL(tetoLegal)}). ` +
          `Não há, neste módulo, indício de reajuste abusivo.`,
      valores: {
        aplicado: formatarBRL(entrada.mensalidadeAplicada),
        teto_legal: formatarBRL(tetoLegal),
        excesso: formatarBRL(valorExcesso),
      },
    },
    {
      titulo: "6. Projeção de restituição (CDC art. 42, § único)",
      descricao: ehAbusivo
        ? `Havendo cobrança a maior, o consumidor faz jus à repetição do indébito em dobro, conforme o art. 42, ` +
          `parágrafo único, do Código de Defesa do Consumidor: ${formatarBRL(restituicao)} por mensalidade, ` +
          `acrescidos de correção monetária e juros legais.`
        : `Não há excesso a restituir, pois o reajuste está dentro do teto legal.`,
      formula: `Restituição = excesso × 2`,
      valores: {
        excesso_mensal: formatarBRL(valorExcesso),
        restituicao_mensal: formatarBRL(restituicao),
      },
    },
  ];
}

/**
 * @param {{ ciclo: import("./date-utils.js").CicloAns, ehAbusivo: boolean }} ctx
 * @returns {FundamentacaoLegal[]}
 */
function montarFundamentacao(ctx) {
  const { ciclo, ehAbusivo } = ctx;
  /** @type {FundamentacaoLegal[]} */
  const base = [
    {
      norma: "Lei nº 9.656/1998, art. 35-E",
      ementa:
        "Estabelece que o reajuste de mensalidade em planos individuais ou familiares depende de prévia autorização da ANS.",
      link: "https://www.planalto.gov.br/ccivil_03/leis/l9656.htm",
      aplicacao_ao_caso:
        "A autorização da ANS para o ciclo apurado limita o percentual máximo que a operadora pode aplicar. Reajuste acima desse limite ofende a Lei 9.656/98 e a regulação setorial.",
    },
    {
      norma: ciclo.ato_normativo,
      ementa: `Estabelece o índice máximo de reajuste para o ciclo ${ciclo.inicio} a ${ciclo.fim} (${ciclo.percentual}%).`,
      aplicacao_ao_caso:
        "Trata-se do ato normativo da ANS aplicável diretamente ao mês de aniversário do contrato analisado.",
    },
  ];
  if (ehAbusivo) {
    base.push({
      norma: "CDC (Lei nº 8.078/1990), art. 42, parágrafo único",
      ementa:
        "O consumidor cobrado em quantia indevida tem direito à repetição do indébito, por valor igual ao dobro do que pagou em excesso.",
      link: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm",
      aplicacao_ao_caso:
        "Caracterizado o reajuste acima do teto ANS, configura-se cobrança em quantia indevida e nasce o direito à restituição em dobro dos valores excedentes.",
    });
    base.push({
      norma: "CDC (Lei nº 8.078/1990), art. 51, IV",
      ementa:
        "São nulas as cláusulas que estabeleçam obrigações iníquas, abusivas ou coloquem o consumidor em desvantagem exagerada.",
      aplicacao_ao_caso:
        "Reajuste anual em planos individuais que excede o teto ANS é cláusula abusiva, nula de pleno direito.",
    });
    base.push({
      norma: "Súmula Normativa nº 3, de 02/02/2001 — ANS",
      ementa:
        "A cláusula de reajuste deve estar redigida de forma clara e expressa.",
      aplicacao_ao_caso:
        "Cláusula que permita à operadora aplicar percentual acima do autorizado pela ANS é nula por violar a transparência obrigatória.",
    });
  }
  return base;
}

/**
 * @param {{
 *   ehAbusivo: boolean,
 *   excesso: string,
 *   restituicao: string,
 *   ciclo: import("./date-utils.js").CicloAns,
 *   percentualAplicado: number
 * }} ctx
 * @returns {string}
 */
function montarResumoLeigo(ctx) {
  const { ehAbusivo, excesso, restituicao, ciclo, percentualAplicado } = ctx;
  if (ehAbusivo) {
    return (
      `Indício de cobrança a maior: a ANS autorizou apenas ${ciclo.percentual}% para esse período, ` +
      `mas o seu reajuste foi de ${percentualAplicado.toFixed(2)}%. ` +
      `Você pode estar pagando ${formatarBRL(excesso)} por mês a mais do que o permitido — ` +
      `e o Código de Defesa do Consumidor permite pedir a devolução em dobro (${formatarBRL(restituicao)}). ` +
      `Procure um(a) advogado(a) para confirmar e ajuizar a ação.`
    );
  }
  return (
    `O reajuste aplicado (${percentualAplicado.toFixed(2)}%) está dentro do teto autorizado pela ANS ` +
    `(${ciclo.percentual}%) para o seu mês de aniversário. ` +
    `Nesta análise específica não há indício de cobrança abusiva.`
  );
}

/**
 * @param {{
 *   ehAbusivo: boolean,
 *   entrada: EntradaModulo1,
 *   ciclo: import("./date-utils.js").CicloAns,
 *   tetoLegal: string,
 *   valorExcesso: string,
 *   restituicao: string,
 *   percentualAplicado: number
 * }} ctx
 * @returns {string}
 */
function montarResumoTecnico(ctx) {
  const { ehAbusivo, entrada, ciclo, tetoLegal, valorExcesso, restituicao, percentualAplicado } = ctx;
  if (ehAbusivo) {
    return (
      `Reajuste aplicado de ${percentualAplicado.toFixed(4)}% (${formatarBRL(entrada.mensalidadeAplicada)}) ` +
      `supera o teto de ${ciclo.percentual}% autorizado pela ANS no ciclo ${ciclo.inicio}/${ciclo.fim} ` +
      `(${ciclo.ato_normativo}). Excesso mensal: ${formatarBRL(valorExcesso)}; teto legal correto: ${formatarBRL(tetoLegal)}. ` +
      `Cabe restituição em dobro nos termos do art. 42, § único, do CDC, no valor de ${formatarBRL(restituicao)} ` +
      `por mensalidade cobrada a maior, acrescida de correção monetária e juros legais.`
    );
  }
  return (
    `Reajuste de ${percentualAplicado.toFixed(4)}% aplicado a contrato ${entrada.tipoContrato} dentro do limite ` +
    `de ${ciclo.percentual}% autorizado pela ANS (${ciclo.ato_normativo}) para o ciclo ${ciclo.inicio}/${ciclo.fim}. ` +
    `Sem indício de abusividade neste módulo. Análise complementar pelos Módulos 2, 3 e 4 pode ser pertinente.`
  );
}
