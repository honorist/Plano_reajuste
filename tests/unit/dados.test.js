// @ts-check
/**
 * Testes de integridade dos JSONs de referência.
 *
 * Estes testes garantem que as tabelas oficiais (índices ANS, faixas etárias,
 * fundamentação legal) estão bem formadas, sem lacunas, e que os dados
 * passam validações básicas. Servem também como smoke test da Fase 0:
 * se rodam verde, a infraestrutura Vitest está OK.
 */
import { describe, it, expect } from "vitest";
import indicesAns from "../../src/data/indices-ans.json" with { type: "json" };
import faixasRn63 from "../../src/data/faixas-etarias-rn63.json" with { type: "json" };
import fundamentacao from "../../src/data/fundamentacao-legal.json" with { type: "json" };

describe("indices-ans.json — tabela de tetos ANS", () => {
  it("declara fonte oficial e metodologia", () => {
    expect(indicesAns.fonte_oficial).toMatch(/^https:\/\/www\.gov\.br\/ans/);
    expect(indicesAns.metodologia).toContain("IVDA");
    expect(indicesAns.metodologia).toContain("IPCA");
  });

  it("contém ao menos 1 ciclo por ano de 2018 a 2025", () => {
    const inicios = indicesAns.ciclos.map((c) => c.inicio);
    for (const ano of [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
      expect(inicios.some((m) => m.startsWith(`${ano}-`))).toBe(true);
    }
  });

  it("ciclos seguem o formato YYYY-MM e cobrem maio→abril sem sobreposição", () => {
    const ciclos = indicesAns.ciclos;
    for (const c of ciclos) {
      expect(c.inicio).toMatch(/^\d{4}-\d{2}$/);
      expect(c.fim).toMatch(/^\d{4}-\d{2}$/);
      expect(c.inicio < c.fim).toBe(true);
    }
    // verifica não-sobreposição entre ciclos consecutivos
    const ordenados = [...ciclos].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < ordenados.length; i++) {
      expect(ordenados[i].inicio > ordenados[i - 1].fim).toBe(true);
    }
  });

  it("ciclo 2021/22 traz redutor negativo de -8,19%", () => {
    const c = indicesAns.ciclos.find((x) => x.inicio === "2021-05");
    expect(c).toBeDefined();
    expect(c?.percentual).toBe(-8.19);
  });

  it("ciclo 2025/26 vigente registra 6,06%", () => {
    const c = indicesAns.ciclos.find((x) => x.inicio === "2025-05");
    expect(c).toBeDefined();
    expect(c?.percentual).toBe(6.06);
  });

  it("todo ciclo cita ato_normativo de origem", () => {
    for (const c of indicesAns.ciclos) {
      expect(c.ato_normativo).toBeTruthy();
      expect(c.ato_normativo.length).toBeGreaterThan(5);
    }
  });
});

describe("faixas-etarias-rn63.json — RN 63/2003", () => {
  it("contém exatamente 10 faixas", () => {
    expect(faixasRn63.faixas).toHaveLength(10);
  });

  it("faixa 1 cobre 0-18 e faixa 10 começa em 59", () => {
    expect(faixasRn63.faixas[0]).toMatchObject({ id: 1, min: 0, max: 18 });
    expect(faixasRn63.faixas[9]).toMatchObject({ id: 10, min: 59, max: null });
  });

  it("faixas são contínuas e não se sobrepõem", () => {
    for (let i = 1; i < faixasRn63.faixas.length; i++) {
      const anterior = faixasRn63.faixas[i - 1];
      const atual = faixasRn63.faixas[i];
      expect(atual.min).toBe((anterior.max ?? 0) + 1);
    }
  });

  it("traz as três regras-chave da norma", () => {
    const ids = faixasRn63.regras.map((r) => r.id);
    expect(ids).toContain("regra_6x");
    expect(ids).toContain("regra_variacao_acumulada");
    expect(ids).toContain("regra_idoso");
  });
});

describe("fundamentacao-legal.json — normas e jurisprudência", () => {
  it("cita Lei 9.656/98, Estatuto do Idoso, CDC, RN 63/2003 e RN 389/2015", () => {
    expect(fundamentacao.normas.lei_9656_98).toBeDefined();
    expect(fundamentacao.normas.lei_10741_03).toBeDefined();
    expect(fundamentacao.normas.cdc).toBeDefined();
    expect(fundamentacao.normas.rn_63_2003).toBeDefined();
    expect(fundamentacao.normas.rn_389_2015).toBeDefined();
  });

  it("inclui Temas 952 e 1016 do STJ e IRDR 11 do TJSP", () => {
    expect(fundamentacao.jurisprudencia.tema_952_stj).toBeDefined();
    expect(fundamentacao.jurisprudencia.tema_1016_stj).toBeDefined();
    expect(fundamentacao.jurisprudencia.irdr_11_tjsp).toBeDefined();
  });

  it("registra a decisão do STF de 2025 sobre reajuste pós-60 anos", () => {
    expect(fundamentacao.jurisprudencia.stf_2025_idoso).toBeDefined();
    expect(fundamentacao.jurisprudencia.stf_2025_idoso.data).toBe("2025-10-08");
  });
});
