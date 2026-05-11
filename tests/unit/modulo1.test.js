// @ts-check
/**
 * Testes do Módulo 1 — Reajuste anual de plano individual/familiar segundo a ANS.
 *
 * Cada teste corresponde a uma situação real ou plausível que o sistema
 * precisa classificar corretamente entre `abusivo`, `regular` ou
 * `inconclusivo`. Os valores numéricos foram calculados manualmente com
 * base na tabela oficial de tetos ANS (src/data/indices-ans.json).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { calcularReajusteAnualAns } from "../../src/calc/modulo1-reajuste-anual.js";

describe("Módulo 1 — Reajuste anual ANS", () => {
  // ───────────────────────────────────────────────────────────────────
  // Caso 1: reajuste aplicado exatamente no teto ANS — REGULAR
  // ───────────────────────────────────────────────────────────────────
  it("classifica como regular reajuste exato no teto do ciclo 2024/25 (6,91%)", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-07-22",
      mesAniversarioReajuste: "2024-07",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1069.1, // 1000 * 1.0691
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("regular");
    expect(r.resultado.excesso).toBe("0.00");
    expect(r.resultado.percentual_teto).toBe(6.91);
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 2: reajuste acima do teto ANS — ABUSIVO
  // ───────────────────────────────────────────────────────────────────
  it("identifica como abusivo reajuste de 10% no ciclo 2024/25 (teto 6,91%)", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-07-22",
      mesAniversarioReajuste: "2024-07",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1100.0, // +10%
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.excesso).toBe("30.90"); // 1100 - 1069.10
    expect(r.resultado.restituicao_cdc).toBe("61.80"); // 2 * 30.90
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 3: reajuste abaixo do teto — REGULAR
  // ───────────────────────────────────────────────────────────────────
  it("considera regular reajuste abaixo do teto (operadora pode aplicar menor)", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-07-22",
      mesAniversarioReajuste: "2024-07",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1050.0, // +5%
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("regular");
    expect(r.resultado.excesso).toBe("0.00");
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 4: ciclo 2021/22 com redutor -8,19% — operadora NÃO aplicou — ABUSIVO
  // ───────────────────────────────────────────────────────────────────
  it("classifica como abusivo NÃO aplicar o redutor -8,19% do ciclo 2021/22", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-08-10",
      mesAniversarioReajuste: "2021-08",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1000.0, // operadora manteve — devia reduzir
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.percentual_teto).toBe(-8.19);
    // valor esperado: 1000 * (1 - 0.0819) = 918.10
    // excesso: 1000.00 - 918.10 = 81.90
    expect(r.resultado.excesso).toBe("81.90");
    expect(r.resultado.restituicao_cdc).toBe("163.80");
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 5: ciclo 2021/22 com redutor aplicado corretamente — REGULAR
  // ───────────────────────────────────────────────────────────────────
  it("classifica como regular operadora que aplicou o redutor corretamente", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-08-10",
      mesAniversarioReajuste: "2021-08",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 918.1, // 1000 * (1 - 0.0819)
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("regular");
    expect(r.resultado.excesso).toBe("0.00");
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 6: aniversário fora do MVP (antes de 05/2018) — INCONCLUSIVO
  // ───────────────────────────────────────────────────────────────────
  it("retorna inconclusivo para aniversário antes de 05/2018 (fora do MVP)", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2010-03-15",
      mesAniversarioReajuste: "2015-03",
      mensalidadeAnterior: 800.0,
      mensalidadeAplicada: 900.0,
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("inconclusivo");
    expect(r.alertas.length).toBeGreaterThan(0);
    expect(r.alertas[0].mensagem).toMatch(/escopo|MVP|fora/i);
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 7: ciclo 2020/21 — aniversário em setembro/2020 com suspensão da ANS
  // ───────────────────────────────────────────────────────────────────
  it("registra alerta para aniversário entre 09/2020 e 12/2020 (suspensão ANS)", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-09-15",
      mesAniversarioReajuste: "2020-10",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1081.4, // teto 8.14%
      tipoContrato: "individual",
    });
    // o cálculo continua sendo feito, mas alerta sobre RN 4538/2020
    expect(["regular", "abusivo"]).toContain(r.veredito);
    const temAlertaSuspensao = r.alertas.some((a) =>
      /suspens|4538|setembro|2020/i.test(a.mensagem),
    );
    expect(temAlertaSuspensao).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 8: ciclo 2025/26 vigente — limite 6,06%
  // ───────────────────────────────────────────────────────────────────
  it("aplica o teto vigente de 6,06% para aniversário em julho/2025", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2020-07-01",
      mesAniversarioReajuste: "2025-07",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1060.6,
      tipoContrato: "individual",
    });
    expect(r.veredito).toBe("regular");
    expect(r.resultado.percentual_teto).toBe(6.06);
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 9: float trap — 333,33 * 6,06% deve manter 2 casas exatas
  // ───────────────────────────────────────────────────────────────────
  it("preserva precisão decimal exata em valor com centavos quebrados", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2020-07-01",
      mesAniversarioReajuste: "2025-07",
      mensalidadeAnterior: 333.33,
      mensalidadeAplicada: 353.53, // 333.33 * 1.0606 = 353.531 → 353.53
      tipoContrato: "individual",
    });
    // não deve haver excesso de centavos fantasmas
    expect(r.veredito).toBe("regular");
    expect(r.resultado.excesso).toBe("0.00");
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 10: tipoContrato "coletivo_*" — erro de domínio
  // ───────────────────────────────────────────────────────────────────
  it("recusa cálculo direto para contrato coletivo (sugere Módulo 3 primeiro)", () => {
    expect(() =>
      calcularReajusteAnualAns({
        dataAssinaturaContrato: "2018-07-22",
        mesAniversarioReajuste: "2024-07",
        mensalidadeAnterior: 1000.0,
        mensalidadeAplicada: 1100.0,
        // @ts-expect-error — testando rejeição de tipo inválido
        tipoContrato: "coletivo_empresarial",
      }),
    ).toThrow(/coletivo|Módulo 3|individual|familiar/i);
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 11: restituição CDC art. 42 § único — exatamente o dobro
  // ───────────────────────────────────────────────────────────────────
  it("calcula restituição CDC como o dobro do excesso", () => {
    const r = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-07-22",
      mesAniversarioReajuste: "2024-07",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1100.0,
      tipoContrato: "individual",
    });
    // excesso = 30.90; dobro = 61.80
    expect(r.resultado.excesso).toBe("30.90");
    expect(r.resultado.restituicao_cdc).toBe("61.80");
  });

  // ───────────────────────────────────────────────────────────────────
  // Caso 12: contrato celebrado APÓS o aniversário (impossível) — erro
  // ───────────────────────────────────────────────────────────────────
  it("rejeita aniversário anterior à data de assinatura do contrato", () => {
    expect(() =>
      calcularReajusteAnualAns({
        dataAssinaturaContrato: "2024-07-22",
        mesAniversarioReajuste: "2020-07",
        mensalidadeAnterior: 1000.0,
        mensalidadeAplicada: 1100.0,
        tipoContrato: "individual",
      }),
    ).toThrow(/anterior|assinatura/i);
  });
});

describe("Módulo 1 — estrutura do retorno ResultadoCalculo", () => {
  /** @type {ReturnType<typeof calcularReajusteAnualAns>} */
  let resultado;

  beforeAll(() => {
    resultado = calcularReajusteAnualAns({
      dataAssinaturaContrato: "2018-07-22",
      mesAniversarioReajuste: "2024-07",
      mensalidadeAnterior: 1000.0,
      mensalidadeAplicada: 1100.0,
      tipoContrato: "individual",
    });
  });

  it("traz pelo menos 6 passos didáticos", () => {
    expect(resultado.passos.length).toBeGreaterThanOrEqual(6);
    for (const p of resultado.passos) {
      expect(p.titulo).toBeTruthy();
      expect(p.descricao).toBeTruthy();
    }
  });

  it("cita Lei 9.656/98, ato normativo do ciclo e CDC art. 42", () => {
    const normas = resultado.fundamentacao_legal.map((f) => f.norma).join(" | ");
    expect(normas).toMatch(/9\.?656/);
    expect(normas).toMatch(/Comunicado.*ANS/i);
    expect(normas).toMatch(/CDC|8\.?078|art\.?\s*42/i);
  });

  it("traz resumo para leigo curto e resumo técnico de 1 parágrafo", () => {
    expect(resultado.resumo_leigo.length).toBeGreaterThan(20);
    expect(resultado.resumo_leigo.length).toBeLessThan(500);
    expect(resultado.resumo_tecnico.length).toBeGreaterThan(50);
  });
});
