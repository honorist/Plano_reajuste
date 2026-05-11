// @ts-check
/**
 * Testes de `src/calc/date-utils.js` — manipulação de datas em formato ISO
 * (YYYY-MM e YYYY-MM-DD) SEM uso de `new Date()` para aritmética.
 *
 * Motivo: `new Date("2024-05")` em fuso BRT é interpretado como UTC e cai em
 * abril/2024 ao converter para o fuso local — o que classificaria o reajuste
 * no ciclo ANS errado em juízo.
 *
 * Toda manipulação aritmética de data é feita por funções determinísticas
 * deste módulo.
 */
import { describe, it, expect } from "vitest";
import {
  mesEstaNoCiclo,
  somarMeses,
  idadeEm,
  aniversarioContratoEm,
  encontrarCicloAns,
  validarMesIso,
  validarDataIso,
} from "../../src/calc/date-utils.js";
import indicesAns from "../../src/data/indices-ans.json" with { type: "json" };

describe("mesEstaNoCiclo — verifica se YYYY-MM cai em [inicio, fim] inclusivo", () => {
  it("inclui a borda inferior (mês inicial do ciclo)", () => {
    expect(mesEstaNoCiclo("2024-05", "2024-05", "2025-04")).toBe(true);
  });

  it("inclui a borda superior (último mês do ciclo)", () => {
    expect(mesEstaNoCiclo("2025-04", "2024-05", "2025-04")).toBe(true);
  });

  it("retorna false para mês imediatamente anterior ao ciclo", () => {
    expect(mesEstaNoCiclo("2024-04", "2024-05", "2025-04")).toBe(false);
  });

  it("retorna false para mês imediatamente posterior ao ciclo", () => {
    expect(mesEstaNoCiclo("2025-05", "2024-05", "2025-04")).toBe(false);
  });

  it("aceita meses no meio do ciclo, atravessando virada de ano", () => {
    expect(mesEstaNoCiclo("2024-12", "2024-05", "2025-04")).toBe(true);
    expect(mesEstaNoCiclo("2025-01", "2024-05", "2025-04")).toBe(true);
  });
});

describe("somarMeses — aritmética de YYYY-MM sem Date", () => {
  it("soma número de meses que atravessa um ano", () => {
    expect(somarMeses("2024-01", 13)).toBe("2025-02");
  });

  it("avança um mês no fim do ano para o ano seguinte", () => {
    expect(somarMeses("2024-12", 1)).toBe("2025-01");
  });

  it("aceita valores negativos para retroceder meses", () => {
    expect(somarMeses("2024-06", -8)).toBe("2023-10");
  });

  it("não altera o mês quando n=0", () => {
    expect(somarMeses("2024-06", 0)).toBe("2024-06");
  });
});

describe("idadeEm — idade em anos completos entre datas YYYY-MM-DD", () => {
  it("retorna a idade antes do dia de aniversário no ano de referência", () => {
    expect(idadeEm("1960-03-15", "2024-03-14")).toBe(63);
  });

  it("incrementa a idade no próprio dia do aniversário", () => {
    expect(idadeEm("1960-03-15", "2024-03-15")).toBe(64);
  });

  it("trata nascimento em 29/Fev em ano não bissexto: aniversário só em 01/Mar", () => {
    expect(idadeEm("1960-02-29", "2024-02-28")).toBe(63);
    expect(idadeEm("1960-02-29", "2024-03-01")).toBe(64);
  });

  it("aceita data de referência anterior ao nascimento como 0 (ou erro)", () => {
    expect(() => idadeEm("2024-01-01", "2020-01-01")).toThrow();
  });
});

describe("aniversarioContratoEm — devolve YYYY-MM do aniversário do contrato no ano", () => {
  it("preserva o mês do contrato no ano alvo", () => {
    expect(aniversarioContratoEm("2018-07-22", 2024)).toBe("2024-07");
  });

  it("funciona para contrato celebrado em 29/Fev", () => {
    expect(aniversarioContratoEm("2020-02-29", 2023)).toBe("2023-02");
  });
});

describe("encontrarCicloAns — busca ciclo correspondente ao mês informado", () => {
  it("encontra o ciclo vigente 2025/26 para um aniversário em julho/2025", () => {
    const ciclo = encontrarCicloAns("2025-07", indicesAns.ciclos);
    expect(ciclo).toBeDefined();
    expect(ciclo?.percentual).toBe(6.06);
    expect(ciclo?.inicio).toBe("2025-05");
  });

  it("encontra o ciclo 2021/22 (redutor) para um aniversário em agosto/2021", () => {
    const ciclo = encontrarCicloAns("2021-08", indicesAns.ciclos);
    expect(ciclo?.percentual).toBe(-8.19);
  });

  it("retorna null quando o mês está fora do escopo da tabela (antes de 05/2018)", () => {
    expect(encontrarCicloAns("2015-03", indicesAns.ciclos)).toBeNull();
  });

  it("retorna null quando o mês está depois do último ciclo conhecido", () => {
    expect(encontrarCicloAns("2030-01", indicesAns.ciclos)).toBeNull();
  });
});

describe("validações de formato", () => {
  it("validarMesIso aceita YYYY-MM válido", () => {
    expect(() => validarMesIso("2024-05")).not.toThrow();
  });

  it("validarMesIso rejeita formatos errados", () => {
    expect(() => validarMesIso("2024-13")).toThrow();
    expect(() => validarMesIso("24-05")).toThrow();
    expect(() => validarMesIso("2024/05")).toThrow();
    expect(() => validarMesIso("")).toThrow();
  });

  it("validarDataIso aceita YYYY-MM-DD válido e rejeita inválido", () => {
    expect(() => validarDataIso("2024-02-29")).not.toThrow(); // bissexto válido
    expect(() => validarDataIso("2023-02-29")).toThrow(); // 2023 não é bissexto
    expect(() => validarDataIso("2024-13-01")).toThrow();
    expect(() => validarDataIso("2024-05-32")).toThrow();
  });

  it("validarDataIso rejeita tipos não-string", () => {
    // funções de validação recebem `unknown` por design — passamos qualquer valor
    expect(() => validarDataIso(20240501)).toThrow(TypeError);
    expect(() => validarDataIso(null)).toThrow(TypeError);
    expect(() => validarDataIso(undefined)).toThrow(TypeError);
  });

  it("somarMeses rejeita valor não inteiro", () => {
    expect(() => somarMeses("2024-01", 1.5)).toThrow(TypeError);
    expect(() => somarMeses("2024-01", Number.NaN)).toThrow(TypeError);
  });

  it("aniversarioContratoEm rejeita anos fora do intervalo razoável", () => {
    expect(() => aniversarioContratoEm("2018-07-22", 1800)).toThrow(RangeError);
    expect(() => aniversarioContratoEm("2018-07-22", 2300)).toThrow(RangeError);
    expect(() => aniversarioContratoEm("2018-07-22", 2024.5)).toThrow(RangeError);
  });
});
