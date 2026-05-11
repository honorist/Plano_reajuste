// @ts-check
/**
 * Testes das máscaras de formatação para campos brasileiros.
 */
import { describe, it, expect } from "vitest";
import {
  mascaraCpf,
  mascaraCnpj,
  mascaraCep,
  mascaraAns,
  mascaraMoeda,
  desformatarMoeda,
} from "../../src/ui/mascaras.js";

describe("mascaraCpf — 000.000.000-00", () => {
  it("formata CPF completo digitado puro", () => {
    expect(mascaraCpf("12345678900")).toBe("123.456.789-00");
  });

  it("formata parcialmente enquanto o usuário digita", () => {
    expect(mascaraCpf("123")).toBe("123");
    expect(mascaraCpf("1234")).toBe("123.4");
    expect(mascaraCpf("1234567")).toBe("123.456.7");
    expect(mascaraCpf("123456789")).toBe("123.456.789");
    expect(mascaraCpf("1234567890")).toBe("123.456.789-0");
  });

  it("trunca em 11 dígitos", () => {
    expect(mascaraCpf("12345678900999")).toBe("123.456.789-00");
  });

  it("ignora caracteres não numéricos colados pelo usuário", () => {
    expect(mascaraCpf("123abc456.789-00")).toBe("123.456.789-00");
  });
});

describe("mascaraCnpj — 00.000.000/0000-00", () => {
  it("formata CNPJ completo", () => {
    expect(mascaraCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("formatação parcial em estágios", () => {
    expect(mascaraCnpj("12")).toBe("12");
    expect(mascaraCnpj("123")).toBe("12.3");
    expect(mascaraCnpj("123456")).toBe("12.345.6");
    expect(mascaraCnpj("12345678")).toBe("12.345.678");
    expect(mascaraCnpj("123456780001")).toBe("12.345.678/0001");
  });

  it("trunca em 14 dígitos", () => {
    expect(mascaraCnpj("12345678000190999")).toBe("12.345.678/0001-90");
  });
});

describe("mascaraCep — 00000-000", () => {
  it("formata CEP completo", () => {
    expect(mascaraCep("01310100")).toBe("01310-100");
  });

  it("formatação parcial", () => {
    expect(mascaraCep("01")).toBe("01");
    expect(mascaraCep("01310")).toBe("01310");
    expect(mascaraCep("013101")).toBe("01310-1");
  });

  it("trunca em 8 dígitos", () => {
    expect(mascaraCep("013101009999")).toBe("01310-100");
  });

  it("aceita CEP já formatado", () => {
    expect(mascaraCep("01310-100")).toBe("01310-100");
  });
});

describe("mascaraAns — 000000-0", () => {
  it("formata registro ANS completo", () => {
    expect(mascaraAns("4159123")).toBe("415912-3");
  });

  it("não formata enquanto faltam dígitos", () => {
    expect(mascaraAns("415")).toBe("415");
    expect(mascaraAns("415912")).toBe("415912");
  });

  it("trunca em 7 dígitos", () => {
    expect(mascaraAns("41591239999")).toBe("415912-3");
  });
});

describe("mascaraMoeda — R$ 000.000,00", () => {
  it("interpreta dígitos como centavos e formata BRL", () => {
    expect(mascaraMoeda("1")).toBe("R$ 0,01");
    expect(mascaraMoeda("10")).toBe("R$ 0,10");
    expect(mascaraMoeda("100")).toBe("R$ 1,00");
    expect(mascaraMoeda("1234")).toBe("R$ 12,34");
    expect(mascaraMoeda("12345")).toBe("R$ 123,45");
    expect(mascaraMoeda("123456")).toBe("R$ 1.234,56");
    expect(mascaraMoeda("1234567")).toBe("R$ 12.345,67");
    expect(mascaraMoeda("123456789")).toBe("R$ 1.234.567,89");
  });

  it("ignora caracteres não numéricos", () => {
    expect(mascaraMoeda("R$ 1.234,56")).toBe("R$ 1.234,56");
    expect(mascaraMoeda("abc850def")).toBe("R$ 8,50");
  });

  it("retorna string vazia se não houver dígitos", () => {
    expect(mascaraMoeda("")).toBe("");
    expect(mascaraMoeda("R$ ")).toBe("");
  });
});

describe("desformatarMoeda — string BRL para number", () => {
  it("converte string formatada", () => {
    expect(desformatarMoeda("R$ 1.234,56")).toBe(1234.56);
    expect(desformatarMoeda("R$ 0,10")).toBe(0.1);
    expect(desformatarMoeda("R$ 12,34")).toBe(12.34);
  });

  it("aceita números sem formatação", () => {
    expect(desformatarMoeda("1234.56")).toBe(1234.56);
    expect(desformatarMoeda("850")).toBe(850);
  });

  it("retorna 0 para entrada vazia ou nula", () => {
    expect(desformatarMoeda("")).toBe(0);
    expect(desformatarMoeda(null)).toBe(0);
    expect(desformatarMoeda(undefined)).toBe(0);
  });

  it("aceita pontos como separador de milhar e vírgula como decimal", () => {
    expect(desformatarMoeda("R$ 1.234.567,89")).toBe(1234567.89);
  });
});
