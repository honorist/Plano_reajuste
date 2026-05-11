// @ts-check
/**
 * Testes do Módulo 4 — Reajuste por sinistralidade em planos coletivos.
 *
 * O reajuste por sinistralidade é uma cláusula típica de planos coletivos
 * (empresariais e por adesão). Para ser legítimo, deve atender a três
 * requisitos cumulativos:
 *
 *  1. Previsão contratual expressa com fórmula clara (RN 389/2015 art. 14;
 *     Súmula 3 ANS);
 *  2. Documentação atuarial demonstrando o aumento efetivo de custos;
 *  3. Razoabilidade do percentual aplicado em relação ao histórico real
 *     de sinistralidade.
 *
 * Reajustes acima de cerca de 20% sem justificativa robusta tendem a ser
 * considerados abusivos pela jurisprudência.
 */
import { describe, it, expect } from "vitest";
import { avaliarSinistralidade } from "../../src/calc/modulo4-sinistralidade.js";

describe("Módulo 4 — Sinistralidade", () => {
  it("classifica como abusivo reajuste de 30% sem documentação", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [
        { ano: 2022, sinistralidade: 75 },
        { ano: 2023, sinistralidade: 80 },
      ],
      percentualAplicado: 30,
      documentacaoFornecidaPelaOperadora: false,
      contratoExplicitaFormulaSinistralidade: true,
      numeroVidas: 100,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.motivos).toContain("sem_documentacao");
  });

  it("classifica como regular com ressalva reajuste de 12% com doc e sinistralidade 85%", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [
        { ano: 2022, sinistralidade: 80 },
        { ano: 2023, sinistralidade: 85 },
      ],
      percentualAplicado: 12,
      documentacaoFornecidaPelaOperadora: true,
      contratoExplicitaFormulaSinistralidade: true,
      numeroVidas: 100,
    });
    expect(r.veredito).toBe("regular");
    expect(
      r.alertas.some((a) => /perícia|peri[cç]ia|ressalva|ass[íi]stencial/i.test(a.mensagem)),
    ).toBe(true);
  });

  it("classifica como abusivo reajuste de 50% mesmo com documentação", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [
        { ano: 2022, sinistralidade: 95 },
        { ano: 2023, sinistralidade: 110 },
      ],
      percentualAplicado: 50,
      documentacaoFornecidaPelaOperadora: true,
      contratoExplicitaFormulaSinistralidade: true,
      numeroVidas: 100,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.motivos).toContain("percentual_excessivo");
  });

  it("classifica como abusivo contrato sem fórmula explícita de sinistralidade", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [{ ano: 2023, sinistralidade: 80 }],
      percentualAplicado: 15,
      documentacaoFornecidaPelaOperadora: true,
      contratoExplicitaFormulaSinistralidade: false,
      numeroVidas: 100,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.motivos).toContain("clausula_sem_formula");
  });

  it("identifica contradição: sinistralidade decrescente com reajuste positivo alto", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [
        { ano: 2022, sinistralidade: 90 },
        { ano: 2023, sinistralidade: 70 },
        { ano: 2024, sinistralidade: 60 },
      ],
      percentualAplicado: 18,
      documentacaoFornecidaPelaOperadora: true,
      contratoExplicitaFormulaSinistralidade: true,
      numeroVidas: 100,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.motivos).toContain("contradicao_sinistralidade");
  });

  it("sugere Módulo 3 (falso coletivo) quando há menos de 30 vidas", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [{ ano: 2023, sinistralidade: 80 }],
      percentualAplicado: 15,
      documentacaoFornecidaPelaOperadora: true,
      contratoExplicitaFormulaSinistralidade: true,
      numeroVidas: 12,
    });
    expect(r.alertas.some((a) => /M[óo]dulo 3|falso coletivo/i.test(a.mensagem))).toBe(
      true,
    );
  });

  it("gera quesitos de perícia para a fase de instrução", () => {
    const r = avaliarSinistralidade({
      historicoSinistralidade: [{ ano: 2023, sinistralidade: 80 }],
      percentualAplicado: 15,
      documentacaoFornecidaPelaOperadora: true,
      contratoExplicitaFormulaSinistralidade: true,
      numeroVidas: 100,
    });
    expect(Array.isArray(r.resultado.quesitos_pericia)).toBe(true);
    expect(/** @type {string[]} */ (r.resultado.quesitos_pericia).length).toBeGreaterThanOrEqual(3);
  });
});
