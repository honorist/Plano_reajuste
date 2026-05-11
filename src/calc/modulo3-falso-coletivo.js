// @ts-check
/**
 * Módulo 3 — Falso coletivo.
 *
 * Avalia se um plano contratado sob a forma coletiva (empresarial ou por
 * adesão) deve, por força da jurisprudência, ser equiparado a plano
 * individual/familiar para fins de aplicação dos tetos ANS.
 *
 * Fundamentos:
 *  - STJ, Tema 952 (REsp 1.568.244): reajustes em planos coletivos devem
 *    observar critérios objetivos, sem desarrazoabilidade contra o consumidor.
 *  - STJ, Tema 1016: o Tema 952 e o CDC aplicam-se aos coletivos, mesmo
 *    de pequena adesão.
 *  - ANS RN 309/2012 e RN 389/2015: agrupamento de contratos (pool de risco)
 *    obrigatório para coletivos com pequena adesão.
 *
 * Critérios para identificação:
 *  1. Número de vidas < 30 (ausência de pool de risco real)
 *  2. Todos os beneficiários são parentes (família travestida de empresa)
 *  3. Ausência de vínculo empresarial real (CNPJ ativo, atividade econômica)
 *  4. Estipulante é pessoa jurídica criada apenas para contratar plano (MEI fictício)
 *
 * Combinações desses critérios indicam falso coletivo. A função retorna:
 *  - "abusivo" + equiparavel_a_individual = true: forte indício de falso coletivo
 *  - "regular" + equiparavel_a_individual = false: coletivo legítimo
 *  - "inconclusivo": situação no limiar, exige análise caso-a-caso
 */
import { paraDecimal } from "./money.js";

/**
 * @typedef {import("./modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 * @typedef {import("./modulo1-reajuste-anual.js").FundamentacaoLegal} FundamentacaoLegal
 */

/**
 * @typedef {Object} EntradaModulo3
 * @property {"coletivo_empresarial" | "coletivo_adesao"} tipoDeclarado
 * @property {number} numeroVidas
 * @property {boolean} todosBeneficiariosSaoParentes
 * @property {boolean} haVinculoEmpresarialReal
 * @property {boolean} estipulanteEhPjDaFamilia
 */

/**
 * @param {EntradaModulo3} entrada
 * @returns {ResultadoCalculo}
 */
export function avaliarFalsoColetivo(entrada) {
  if (
    entrada.tipoDeclarado !== "coletivo_empresarial" &&
    entrada.tipoDeclarado !== "coletivo_adesao"
  ) {
    throw new TypeError(
      `Tipo "${entrada.tipoDeclarado}" não é tratado pelo Módulo 3. ` +
        "Para contratos individuais ou familiares, execute o Módulo 1 diretamente.",
    );
  }

  /** @type {string[]} */
  const indicios = [];
  if (entrada.numeroVidas < 30) indicios.push("menos_de_30_vidas");
  if (entrada.todosBeneficiariosSaoParentes) indicios.push("todos_parentes");
  if (!entrada.haVinculoEmpresarialReal) indicios.push("sem_vinculo_empresarial");
  if (entrada.estipulanteEhPjDaFamilia) indicios.push("estipulante_familiar");

  // Equiparação a individual: precisa de pelo menos dois indícios FORTES
  // (não basta ter <30 vidas em empresa real).
  const indiciosFortes = indicios.filter((i) => i !== "menos_de_30_vidas").length;
  const equiparavel =
    indicios.length >= 3 || (indicios.length >= 2 && indiciosFortes >= 1);

  /** @type {"abusivo" | "regular" | "inconclusivo"} */
  let veredito;
  /** @type {import("./modulo1-reajuste-anual.js").Alerta[]} */
  const alertas = [];

  if (equiparavel) {
    veredito = "abusivo";
  } else if (
    entrada.numeroVidas < 30 &&
    indiciosFortes === 0 &&
    entrada.haVinculoEmpresarialReal
  ) {
    // No limiar: <30 vidas mas empresa real sem laços familiares
    veredito = "inconclusivo";
    alertas.push({
      severidade: "atencao",
      mensagem:
        "Plano coletivo com menos de 30 vidas em empresa aparentemente real, sem laços familiares. " +
        "A doutrina e a jurisprudência exigem análise caso-a-caso do agrupamento de contratos (RN 309/2012) " +
        "e do efetivo pool de risco. Recomenda-se perícia atuarial.",
    });
  } else {
    veredito = "regular";
  }

  return {
    veredito,
    resultado: {
      tipo_declarado: entrada.tipoDeclarado,
      numero_vidas: entrada.numeroVidas,
      indicios,
      equiparavel_a_individual: equiparavel,
      proximo_passo: equiparavel
        ? "Reaplique o Módulo 1 (Reajuste anual ANS) sobre o histórico de mensalidades, usando os tetos ANS de plano individual/familiar. A jurisprudência (Tema 952/1016 STJ) autoriza essa equiparação."
        : "Coletivo legítimo. Verifique o Módulo 4 (sinistralidade) para apurar eventual abusividade do reajuste.",
    },
    passos: montarPassos(entrada, indicios, equiparavel),
    fundamentacao_legal: montarFundamentacao(equiparavel),
    alertas,
    resumo_leigo: montarResumoLeigo(veredito, equiparavel),
    resumo_tecnico: montarResumoTecnico(veredito, entrada, indicios),
  };
}

/**
 * @param {EntradaModulo3} entrada
 * @param {string[]} indicios
 * @param {boolean} equiparavel
 * @returns {import("./modulo1-reajuste-anual.js").Passo[]}
 */
function montarPassos(entrada, indicios, equiparavel) {
  return [
    {
      titulo: "1. Tipo declarado e número de vidas",
      descricao:
        `Contrato declarado como ${entrada.tipoDeclarado.replace("_", " ")}, com ${entrada.numeroVidas} vidas. ` +
        (entrada.numeroVidas < 30
          ? "Coletivos com pequena adesão (< 30 vidas) recebem proteção reforçada pela jurisprudência e pelo CDC."
          : "Número de vidas em escala compatível com agrupamento de risco genuíno."),
    },
    {
      titulo: "2. Verificação de vínculo empresarial real",
      descricao: entrada.haVinculoEmpresarialReal
        ? "Há indicação de empresa preexistente com atividade econômica genuína."
        : "Não foi identificado vínculo empresarial real (empresa pode ter sido constituída especificamente para contratar o plano).",
    },
    {
      titulo: "3. Vínculos familiares entre beneficiários",
      descricao: entrada.todosBeneficiariosSaoParentes
        ? "Todos os beneficiários são parentes, o que sugere arranjo familiar travestido de coletivo."
        : "Beneficiários não são todos parentes — perfil compatível com coletivo legítimo.",
    },
    {
      titulo: "4. Natureza do estipulante",
      descricao: entrada.estipulanteEhPjDaFamilia
        ? "O estipulante (pessoa jurídica contratante) aparenta ter sido criado apenas para viabilizar o plano (MEI/EIRELI fictícios), reforçando o indício de falso coletivo."
        : "Estipulante não é PJ familiar fictícia.",
    },
    {
      titulo: "5. Conclusão",
      descricao: equiparavel
        ? `Foram identificados ${indicios.length} indícios de falso coletivo (${indicios.join(", ")}). ` +
          "Por força do Tema 952 e 1016 do STJ, o contrato deve ser equiparado a individual/familiar " +
          "para fins de aplicação dos tetos ANS, com reaplicação retroativa dos limites autorizados."
        : "Contrato coletivo legítimo nesta análise. Não há base para equipará-lo a individual.",
    },
  ];
}

/**
 * @param {boolean} equiparavel
 * @returns {FundamentacaoLegal[]}
 */
function montarFundamentacao(equiparavel) {
  /** @type {FundamentacaoLegal[]} */
  const base = [
    {
      norma: "STJ — Tema Repetitivo 952 (REsp 1.568.244)",
      ementa:
        "Reajustes em planos de saúde devem observar critérios objetivos previstos em contrato, sem desarrazoabilidade contra o consumidor, e respeitar parâmetros da ANS.",
      aplicacao_ao_caso:
        "Aplicável aos planos individuais. A tese é estendida aos coletivos pelo Tema 1016.",
    },
    {
      norma: "STJ — Tema Repetitivo 1016",
      ementa:
        "O Tema 952 e o Código de Defesa do Consumidor aplicam-se aos contratos coletivos de plano de saúde, mesmo com pequena adesão, observadas suas peculiaridades.",
      aplicacao_ao_caso:
        "Funda a possibilidade de equiparação do coletivo de pequena adesão (falso coletivo) ao individual para limitação dos reajustes pelos tetos ANS.",
    },
    {
      norma: "Resolução Normativa ANS nº 309/2012",
      ementa:
        "Obriga as operadoras a manter agrupamento de contratos coletivos com menos de 30 beneficiários para diluição do risco.",
      aplicacao_ao_caso:
        "A ausência de pool de risco genuíno em coletivos de pequena adesão configura desnaturação do regime coletivo.",
    },
  ];
  if (equiparavel) {
    base.push({
      norma: "Súmula nº 608 do STJ",
      ementa:
        "Aplica-se o Código de Defesa do Consumidor aos contratos de plano de saúde, salvo os administrados por entidades de autogestão.",
      aplicacao_ao_caso:
        "A proteção consumerista incide plenamente, autorizando a revisão judicial das cláusulas de reajuste do falso coletivo.",
    });
  }
  return base;
}

/**
 * @param {"abusivo" | "regular" | "inconclusivo"} veredito
 * @param {boolean} equiparavel
 * @returns {string}
 */
function montarResumoLeigo(veredito, equiparavel) {
  if (equiparavel) {
    return (
      "Indício de FALSO COLETIVO. Embora seu contrato seja chamado de 'coletivo empresarial' " +
      "ou 'por adesão', a configuração real (poucas vidas, todos parentes ou empresa fictícia) " +
      "permite, pela jurisprudência do STJ, tratá-lo como plano individual. Isso significa que " +
      "a operadora só pode aplicar o reajuste máximo autorizado pela ANS para planos individuais. " +
      "Procure um(a) advogado(a) para questionar judicialmente."
    );
  }
  if (veredito === "inconclusivo") {
    return (
      "Seu plano coletivo está em situação intermediária: tem poucas vidas, mas empresa real e " +
      "sem laços familiares. A jurisprudência exige análise caso-a-caso. Recomenda-se consultar " +
      "advogado(a) com experiência em planos de saúde."
    );
  }
  return "Seu plano coletivo aparenta ser legítimo. A análise de eventual abusividade do reajuste deve seguir pelos critérios de sinistralidade (Módulo 4) ou aplicação geral do CDC.";
}

/**
 * @param {"abusivo" | "regular" | "inconclusivo"} veredito
 * @param {EntradaModulo3} entrada
 * @param {string[]} indicios
 * @returns {string}
 */
function montarResumoTecnico(veredito, entrada, indicios) {
  if (veredito === "abusivo") {
    return (
      `Identificados ${indicios.length} indícios de falso coletivo (${indicios.join(", ")}) em ` +
      `contrato declarado como ${entrada.tipoDeclarado} de ${entrada.numeroVidas} vida(s). ` +
      "Por aplicação do Tema 1016 do STJ, impõe-se a equiparação ao regime individual/familiar para fins de " +
      "incidência dos tetos máximos divulgados anualmente pela ANS, com reaplicação retroativa e " +
      "consequente cabimento de restituição em dobro dos valores pagos a maior (CDC art. 42, § único)."
    );
  }
  if (veredito === "inconclusivo") {
    return (
      `Coletivo de ${entrada.numeroVidas} vidas em estipulante aparentemente legítimo. ` +
      "Caso situado no limiar entre coletivo legítimo e falso coletivo. " +
      "Necessária análise documental complementar e, se necessário, perícia atuarial sobre o efetivo pool de risco."
    );
  }
  return `Contrato coletivo (${entrada.tipoDeclarado}) com ${entrada.numeroVidas} vidas em configuração compatível com regime coletivo genuíno. Sem indício de falso coletivo no presente módulo.`;
}
