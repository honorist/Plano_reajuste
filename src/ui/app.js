// @ts-check
/**
 * Orquestrador da UI — análise de reajuste de plano de saúde.
 * 100% client-side. Nenhum dado sai do navegador.
 */
import { calcularReajusteAnualAns } from "../calc/modulo1-reajuste-anual.js";
import { calcularReajusteFaixaEtaria } from "../calc/modulo2-faixa-etaria.js";
import { avaliarFalsoColetivo } from "../calc/modulo3-falso-coletivo.js";
import { avaliarSinistralidade } from "../calc/modulo4-sinistralidade.js";
import { formatarBRL } from "../calc/money.js";
import { gerarResumoPdf } from "../docs/gerar-resumo-pdf.js";
import { gerarPeticaoDocx } from "../docs/gerar-peticao-docx.js";
import { gerarRelatorioDocx } from "../docs/gerar-relatorio-docx.js";
import { gerarPlanilhaXlsx } from "../docs/gerar-planilha-xlsx.js";
import {
  aplicarMascara,
  mascaraCpf,
  mascaraCnpj,
  mascaraCep,
  mascaraAns,
  mascaraMoeda,
  desformatarMoeda,
} from "./mascaras.js";
import { ligarBuscaPorCep } from "./cep.js";

// ================================================================
// ELEMENTOS
// ================================================================

const form = /** @type {HTMLFormElement} */ (document.getElementById("form-analise"));
const resultadosEl = /** @type {HTMLElement} */ (document.getElementById("resultados"));

if (!form || !resultadosEl) throw new Error("Elementos essenciais não encontrados");

// ================================================================
// #3 LOCALSTORAGE
// ================================================================

const LS_KEY = "plano-reajuste-v1";

function salvarForm() {
  try {
    const data = new FormData(form);
    /** @type {Record<string, string>} */
    const obj = {};
    for (const [k, v] of data.entries()) {
      obj[/** @type {string} */ (k)] = String(v);
    }
    // Checkboxes não marcados não aparecem no FormData
    form.querySelectorAll("input[type=checkbox]").forEach((/** @type {Element} */ el) => {
      const cb = /** @type {HTMLInputElement} */ (el);
      if (!obj[cb.name]) obj[cb.name] = "off";
    });
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {
    // localStorage pode estar desabilitado
  }
}

function restaurarForm() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const obj = /** @type {Record<string, string>} */ (JSON.parse(raw));
    for (const [k, v] of Object.entries(obj)) {
      const el = /** @type {HTMLInputElement | null} */ (form.elements.namedItem(k));
      if (!el) continue;
      if (el.type === "checkbox") {
        el.checked = v === "on";
      } else {
        el.value = v;
      }
    }
  } catch {
    // JSON corrompido — ignora
  }
}

// Salvar a cada mudança de campo
form.addEventListener("input", salvarForm);
form.addEventListener("change", salvarForm);

// ================================================================
// #1 WIZARD
// ================================================================

const TOTAL_PASSOS = 3;
let passoAtual = 1;

/**
 * @param {number} n
 */
function mostrarPasso(n) {
  // Oculta todos os passos
  form.querySelectorAll(".wizard-passo").forEach((el) => {
    /** @type {HTMLElement} */ (el).hidden = true;
  });

  // Mostra o passo alvo
  const passo = form.querySelector(`.wizard-passo[data-step="${n}"]`);
  if (passo) /** @type {HTMLElement} */ (passo).hidden = false;

  // Atualiza progress bar
  document.querySelectorAll(".wp-item").forEach((el) => {
    const htmlEl = /** @type {HTMLElement} */ (el);
    const s = Number(htmlEl.dataset.step);
    htmlEl.classList.toggle("wp-ativa", s === n);
    htmlEl.classList.toggle("wp-concluida", s < n);
    htmlEl.setAttribute("aria-current", s === n ? "step" : "false");
  });
  // Linhas separadoras
  document.querySelectorAll(".wp-sep").forEach((el, i) => {
    el.classList.toggle("concluido", i < n - 1);
  });

  // Botões de navegação
  const btnAnterior = /** @type {HTMLButtonElement | null} */ (document.getElementById("btn-anterior"));
  const btnProximo  = /** @type {HTMLButtonElement | null} */ (document.getElementById("btn-proximo"));
  const btnAnalisar = /** @type {HTMLButtonElement | null} */ (document.getElementById("btn-analisar"));
  if (btnAnterior) btnAnterior.hidden = n === 1;
  if (btnProximo)  btnProximo.hidden  = n === TOTAL_PASSOS;
  if (btnAnalisar) btnAnalisar.hidden = n !== TOTAL_PASSOS;

  passoAtual = n;

  // Ao chegar no passo 3, atualiza módulos visíveis
  if (n === TOTAL_PASSOS) atualizarModulosVisiveis();

  // Scroll suave para o topo do formulário
  document.getElementById("conteudo-principal")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function irProximo() {
  if (!validarPasso(passoAtual)) return;
  salvarForm();
  if (passoAtual < TOTAL_PASSOS) mostrarPasso(passoAtual + 1);
}

function irAnterior() {
  if (passoAtual > 1) mostrarPasso(passoAtual - 1);
}

document.getElementById("btn-proximo")?.addEventListener("click", irProximo);
document.getElementById("btn-anterior")?.addEventListener("click", irAnterior);

// ================================================================
// #5 VALIDAÇÃO INLINE
// ================================================================

/**
 * @param {HTMLInputElement | HTMLSelectElement} input
 */
function validarCampo(input) {
  if (input.type === "checkbox" || !input.name) return;
  if (input.validity.valid) {
    limparErroCampo(input);
  } else {
    const msg = input.validity.valueMissing
      ? "Campo obrigatório"
      : input.validity.typeMismatch
      ? "Valor inválido"
      : input.validationMessage || "Valor inválido";
    mostrarErroCampo(input, msg);
  }
}

/**
 * @param {HTMLInputElement | HTMLSelectElement} input
 * @param {string} msg
 */
function mostrarErroCampo(input, msg) {
  limparErroCampo(input);
  const span = document.createElement("span");
  span.className = "erro-campo";
  const id = `erro-${input.name || input.id}`;
  span.id = id;
  span.textContent = msg;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", id);
  input.after(span);
}

/**
 * @param {HTMLInputElement | HTMLSelectElement} input
 */
function limparErroCampo(input) {
  const existing = input.parentElement?.querySelector(`.erro-campo`);
  if (existing) existing.remove();
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
}

function configurarValidacaoInline() {
  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("blur", () => {
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
        if (/** @type {HTMLInputElement} */ (el).required) validarCampo(el);
      }
    });
    el.addEventListener("input", () => {
      if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.getAttribute("aria-invalid") === "true") {
        validarCampo(el);
      }
    });
  });
}

/**
 * @param {number} n
 * @returns {boolean}
 */
function validarPasso(n) {
  const passo = form.querySelector(`.wizard-passo[data-step="${n}"]`);
  if (!passo) return true;
  let valido = true;
  passo.querySelectorAll("input[required], select[required]").forEach((el) => {
    if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && !el.checkValidity()) {
      validarCampo(el);
      valido = false;
    }
  });
  if (!valido) {
    const first = /** @type {HTMLElement | null} */ (passo.querySelector(":invalid"));
    first?.focus();
  }
  return valido;
}

// ================================================================
// #2 MÓDULOS CONDICIONAIS (por tipo de contrato)
// ================================================================

function atualizarModulosVisiveis() {
  const tipoEl = /** @type {HTMLSelectElement | null} */ (document.getElementById("tipo-contrato"));
  if (!tipoEl) return;
  const tipo = tipoEl.value;
  const isColetivo = tipo === "coletivo_empresarial" || tipo === "coletivo_adesao";

  const m1 = document.getElementById("bloco-modulo1");
  const m3 = document.getElementById("bloco-modulo3");
  const m4 = document.getElementById("bloco-modulo4");

  if (m1) {
    m1.hidden = isColetivo;
    if (isColetivo) {
      const cb = /** @type {HTMLInputElement | null} */ (form.elements.namedItem("analisarModulo1"));
      if (cb) { cb.checked = false; atualizarEstadoModulo("analisarModulo1", false); }
    }
  }
  if (m3) {
    m3.hidden = !isColetivo;
    if (!isColetivo) {
      const cb = /** @type {HTMLInputElement | null} */ (form.elements.namedItem("analisarModulo3"));
      if (cb) { cb.checked = false; atualizarEstadoModulo("analisarModulo3", false); }
    }
  }
  if (m4) {
    m4.hidden = !isColetivo;
    if (!isColetivo) {
      const cb = /** @type {HTMLInputElement | null} */ (form.elements.namedItem("analisarModulo4"));
      if (cb) { cb.checked = false; atualizarEstadoModulo("analisarModulo4", false); }
    }
  }
}

document.getElementById("tipo-contrato")?.addEventListener("change", () => {
  if (passoAtual === TOTAL_PASSOS) atualizarModulosVisiveis();
});

// ================================================================
// #8 ATIVAR/DESATIVAR CAMPOS DO MÓDULO
// ================================================================

/**
 * @param {string} nomeCheckbox
 * @param {boolean} ativo
 */
function atualizarEstadoModulo(nomeCheckbox, ativo) {
  const checkbox = /** @type {HTMLInputElement | null} */ (form.elements.namedItem(nomeCheckbox));
  if (!checkbox) return;
  const fieldset = checkbox.closest("fieldset");
  if (!fieldset) return;

  fieldset.classList.toggle("modulo-desativado", !ativo);
  // #17 aria-disabled
  fieldset.setAttribute("aria-disabled", String(!ativo));

  fieldset.querySelectorAll("input, select").forEach((el) => {
    const htmlEl = /** @type {HTMLInputElement} */ (el);
    if (htmlEl === checkbox) return; // O próprio checkbox de controle não é bloqueado
    if (ativo) htmlEl.removeAttribute("disabled");
    else htmlEl.setAttribute("disabled", "");
  });
}

// Configura listeners para os checkboxes de cada módulo
["analisarModulo1", "analisarModulo2", "analisarModulo3", "analisarModulo4"].forEach((nome) => {
  const cb = /** @type {HTMLInputElement | null} */ (form.elements.namedItem(nome));
  if (!cb) return;
  cb.addEventListener("change", () => {
    atualizarEstadoModulo(nome, cb.checked);
  });
});

// ================================================================
// #6 TOOLTIPS DE AJUDA
// ================================================================

function configurarTooltips() {
  document.querySelectorAll(".help-btn").forEach((btn) => {
    const targetId = btn.getAttribute("aria-controls");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isHidden = target.hidden;
      target.hidden = !isHidden;
      btn.setAttribute("aria-expanded", String(isHidden));
    });
  });
}

// ================================================================
// #19 TOAST
// ================================================================

/**
 * @param {string} mensagem
 * @param {"sucesso" | "info" | "erro"} [tipo]
 */
function mostrarToast(mensagem, tipo = "sucesso") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("toast-saindo"), 2600);
  setTimeout(() => toast.remove(), 3100);
}

// ================================================================
// MÁSCARAS + CEP
// ================================================================

aplicarMascara(/** @type {HTMLInputElement} */ (document.getElementById("cpf")), mascaraCpf);
aplicarMascara(/** @type {HTMLInputElement} */ (document.getElementById("cnpj")), mascaraCnpj);
aplicarMascara(/** @type {HTMLInputElement} */ (document.getElementById("cep")), mascaraCep);
aplicarMascara(/** @type {HTMLInputElement} */ (document.getElementById("ans")), mascaraAns);

for (const id of [
  "mensalidadeAnterior",
  "mensalidadeAplicada",
  "valorFaixa1",
  "valorFaixa7",
  "valorFaixa10",
]) {
  aplicarMascara(
    /** @type {HTMLInputElement | null} */ (document.getElementById(id)),
    mascaraMoeda,
  );
}

const ufEl = /** @type {HTMLInputElement | null} */ (document.getElementById("uf"));
if (ufEl) {
  ufEl.addEventListener("input", () => {
    ufEl.value = ufEl.value.toUpperCase().slice(0, 2);
  });
}

const cepEl = /** @type {HTMLInputElement | null} */ (document.getElementById("cep"));
if (cepEl) {
  ligarBuscaPorCep({
    inputCep: cepEl,
    inputLogradouro: /** @type {HTMLInputElement | null} */ (document.getElementById("logradouro")) || undefined,
    inputBairro:    /** @type {HTMLInputElement | null} */ (document.getElementById("bairro"))    || undefined,
    inputCidade:    /** @type {HTMLInputElement | null} */ (document.getElementById("cidade"))    || undefined,
    inputUf:        /** @type {HTMLInputElement | null} */ (document.getElementById("uf"))       || undefined,
    statusEl:       /** @type {HTMLElement | null} */ (document.getElementById("status-cep"))    || undefined,
  });
}

// ================================================================
// INICIALIZAÇÃO
// ================================================================

configurarValidacaoInline();
configurarTooltips();
restaurarForm();
mostrarPasso(1);

// Reset limpa localStorage e volta ao passo 1
form.addEventListener("reset", () => {
  localStorage.removeItem(LS_KEY);
  // Limpa erros de validação
  form.querySelectorAll(".erro-campo").forEach((e) => e.remove());
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  resultadosEl.hidden = true;
  setTimeout(() => mostrarPasso(1), 0);
});

// ================================================================
// SUBMIT
// ================================================================

form.addEventListener("submit", onSubmit);

/** @param {SubmitEvent} ev */
async function onSubmit(ev) {
  ev.preventDefault();
  if (!validarPasso(passoAtual)) return;

  // #16 Spinner de loading
  resultadosEl.hidden = false;
  resultadosEl.classList.remove("animando");
  resultadosEl.innerHTML = `
    <div class="loading-spinner" role="status" aria-live="polite">
      <div class="spinner"></div>
      <p>Analisando seu caso…</p>
    </div>
  `;
  resultadosEl.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const data = new FormData(form);
    const dadosCaso = montarDadosCaso(data);
    const tipoContrato = String(data.get("tipoContrato"));

    /** @type {Record<string, any>} */
    const resultados = {};

    if (data.get("analisarModulo1") === "on") {
      if (tipoContrato !== "individual" && tipoContrato !== "familiar") {
        throw new Error(
          "O Módulo 1 só se aplica a contratos individuais ou familiares. " +
            "Para coletivos, marque o Módulo 3 — se equiparável a individual, reaplique o Módulo 1.",
        );
      }
      resultados.modulo1 = calcularReajusteAnualAns({
        dataAssinaturaContrato: String(data.get("dataAssinatura")),
        mesAniversarioReajuste: String(data.get("mesAniversario")),
        mensalidadeAnterior: desformatarMoeda(String(data.get("mensalidadeAnterior"))),
        mensalidadeAplicada: desformatarMoeda(String(data.get("mensalidadeAplicada"))),
        tipoContrato: /** @type {"individual" | "familiar"} */ (tipoContrato),
      });
    }

    if (data.get("analisarModulo2") === "on") {
      resultados.modulo2 = calcularReajusteFaixaEtaria({
        dataAssinaturaContrato: String(data.get("dataAssinatura")),
        dataNascimentoBeneficiario: String(data.get("dataNascimento")),
        dataReferencia: new Date().toISOString().slice(0, 10),
        valorFaixa1: desformatarMoeda(String(data.get("valorFaixa1"))),
        valorFaixa7: data.get("valorFaixa7")
          ? desformatarMoeda(String(data.get("valorFaixa7")))
          : undefined,
        valorFaixa10: data.get("valorFaixa10")
          ? desformatarMoeda(String(data.get("valorFaixa10")))
          : undefined,
        anosNoPlano: data.get("anosNoPlano") ? Number(data.get("anosNoPlano")) : undefined,
        houveReajustePorFaixaPosSessenta: data.get("houveReajusteApos60") === "on",
      });
    }

    if (data.get("analisarModulo3") === "on") {
      if (tipoContrato !== "coletivo_empresarial" && tipoContrato !== "coletivo_adesao") {
        throw new Error("O Módulo 3 só se aplica a contratos coletivos (empresarial ou por adesão).");
      }
      resultados.modulo3 = avaliarFalsoColetivo({
        tipoDeclarado: /** @type {"coletivo_empresarial" | "coletivo_adesao"} */ (tipoContrato),
        numeroVidas: Number(data.get("numeroVidas")),
        todosBeneficiariosSaoParentes: data.get("todosParentes") === "on",
        haVinculoEmpresarialReal: data.get("vinculoEmpresarialReal") === "on",
        estipulanteEhPjDaFamilia: data.get("estipulantePjFamilia") === "on",
      });
    }

    if (data.get("analisarModulo4") === "on") {
      /** @type {Array<{ano: number, sinistralidade: number}>} */
      const historico = [];
      const sinA = data.get("sinistralidadeAnoA");
      const sinB = data.get("sinistralidadeAnoB");
      const anoAtual = new Date().getFullYear();
      if (sinA) historico.push({ ano: anoAtual - 1, sinistralidade: Number(sinA) });
      if (sinB) historico.push({ ano: anoAtual, sinistralidade: Number(sinB) });

      resultados.modulo4 = avaliarSinistralidade({
        historicoSinistralidade: historico,
        percentualAplicado: Number(data.get("percentualSinistralidade")),
        documentacaoFornecidaPelaOperadora: data.get("documentacaoFornecida") === "on",
        contratoExplicitaFormulaSinistralidade: data.get("formulaExplicita") === "on",
        numeroVidas: Number(data.get("numeroVidas")) || 30,
      });
    }

    if (Object.keys(resultados).length === 0) {
      throw new Error("Marque pelo menos um módulo para analisar.");
    }

    renderResultados({ resultados, dadosCaso });

    // #10 Animação de entrada
    void resultadosEl.offsetWidth;
    resultadosEl.classList.add("animando");

    resultadosEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    resultadosEl.innerHTML = `<div class="erro-validacao">⚠ ${escapeHtml(mensagem)}</div>`;
  }
}

// ================================================================
// RENDER
// ================================================================

/**
 * @param {{
 *   resultados: Record<string, any>,
 *   dadosCaso: import("../../tests/fixtures/caso-exemplo.js").DadosCaso
 * }} ctx
 */
function renderResultados(ctx) {
  const { resultados, dadosCaso } = ctx;

  const titulos = {
    modulo1: "Módulo 1 — Reajuste anual ANS",
    modulo2: "Módulo 2 — Faixa etária (RN 63/2003)",
    modulo3: "Módulo 3 — Falso coletivo (Tema 952/1016 STJ)",
    modulo4: "Módulo 4 — Sinistralidade",
  };

  // Ícones SVG por veredito
  const ICONE_VEREDITO = {
    abusivo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`,
    regular: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    inconclusivo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  };

  const previewDownloads = gerarPreviewDownloads(resultados);

  // #20 Scorecard consolidado
  let html = renderScorecard(resultados, titulos);

  // Cards individuais por módulo
  for (const [chave, res] of Object.entries(resultados)) {
    const titulo = titulos[/** @type {keyof typeof titulos} */ (chave)] ?? chave;
    const veredito = res.veredito ?? "inconclusivo";
    const icone = ICONE_VEREDITO[/** @type {keyof typeof ICONE_VEREDITO} */ (veredito)] ?? ICONE_VEREDITO.inconclusivo;

    html += `<article class="resultado-card">
      <div class="veredito-topo veredito-topo-${escapeHtml(veredito)}">
        ${icone}
        <span class="veredito-topo-label">${escapeHtml(veredito)}</span>
      </div>
      <div class="resultado-card-corpo">
        <h3>${escapeHtml(titulo)}</h3>
        <p class="resumo-leigo">${escapeHtml(res.resumo_leigo ?? "")}</p>`;

    if (res.resultado?.excesso) {
      html += `<p><strong>Excesso mensal:</strong> ${formatarBRL(res.resultado.excesso)}
        — <strong>Restituição em dobro (CDC art. 42):</strong> ${formatarBRL(res.resultado.restituicao_cdc ?? "0")}</p>`;
    }

    if (res.passos?.length) {
      html += '<div class="passos"><h4>Passos do cálculo</h4>';
      for (const p of res.passos) {
        html += `<details>
          <summary>${escapeHtml(p.titulo)}</summary>
          <div class="descricao">${escapeHtml(p.descricao)}</div>`;
        if (p.formula) {
          html += `<div class="formula">${escapeHtml(p.formula)}</div>`;
        }
        html += `</details>`;
      }
      html += "</div>";
    }

    if (res.alertas?.length) {
      html += '<div class="alertas">';
      for (const a of res.alertas) {
        html += `<div class="alerta alerta-${escapeHtml(a.severidade)}">${escapeHtml(a.mensagem)}</div>`;
      }
      html += "</div>";
    }

    html += `</div></article>`;
  }

  // Seção de downloads
  const SVG_PDF = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
  const SVG_PETICAO = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`;
  const SVG_RELATORIO = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/></svg>`;
  const SVG_PLANILHA = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`;

  html += `<section class="resultado-card">
    <div class="resultado-card-corpo">
      <h3 style="margin-top:0">Baixe os documentos</h3>
      <p>Gerados diretamente no seu navegador. Nenhum dado trafega por servidores.</p>
      <div class="downloads">
        <button class="botao-download" id="dl-pdf" type="button">
          ${SVG_PDF}<span>Resumo (PDF)</span>
          <small>1 página para o cliente</small>
          <span class="dl-preview">${escapeHtml(previewDownloads)}</span>
        </button>
        <button class="botao-download" id="dl-peticao" type="button">
          ${SVG_PETICAO}<span>Petição (DOCX)</span>
          <small>Minuta para advogado(a)</small>
          <span class="dl-preview">${escapeHtml(previewDownloads)}</span>
        </button>
        <button class="botao-download" id="dl-relatorio" type="button">
          ${SVG_RELATORIO}<span>Relatório técnico (DOCX)</span>
          <small>Fundamentação completa</small>
          <span class="dl-preview">${escapeHtml(previewDownloads)}</span>
        </button>
        <button class="botao-download" id="dl-xlsx" type="button">
          ${SVG_PLANILHA}<span>Planilha pericial (XLSX)</span>
          <small>Cálculos auditáveis</small>
          <span class="dl-preview">${escapeHtml(previewDownloads)}</span>
        </button>
      </div>
    </div>
  </section>`;

  // #4 Botão "Nova análise"
  html += `<div class="btn-nova-analise-wrap">
    <button type="button" class="secundario" id="btn-nova-analise">← Nova análise</button>
  </div>`;

  resultadosEl.innerHTML = html;

  // Wire downloads com toast #19
  ligarDownload("dl-pdf", "resumo-executivo.pdf", "application/pdf", () =>
    gerarResumoPdf({ dadosCaso, ...resultados }),
  );
  ligarDownload(
    "dl-peticao",
    "peticao-inicial.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    () => gerarPeticaoDocx({ dadosCaso, ...resultados }),
  );
  ligarDownload(
    "dl-relatorio",
    "relatorio-tecnico.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    () => gerarRelatorioDocx({ dadosCaso, ...resultados }),
  );
  ligarDownload(
    "dl-xlsx",
    "planilha-pericial.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    () => gerarPlanilhaXlsx({ dadosCaso, ...resultados }),
  );

  // #4 Nova análise
  document.getElementById("btn-nova-analise")?.addEventListener("click", () => {
    form.reset(); // dispara o listener de reset acima
  });
}

/**
 * #20 Scorecard consolidado no topo dos resultados
 * @param {Record<string, any>} resultados
 * @param {Record<string, string>} titulos
 * @returns {string}
 */
function renderScorecard(resultados, titulos) {
  const titulosCurtos = {
    modulo1: "Reajuste anual",
    modulo2: "Faixa etária",
    modulo3: "Falso coletivo",
    modulo4: "Sinistralidade",
  };

  const items = Object.entries(resultados)
    .map(([chave, res]) => {
      const titulo = titulosCurtos[/** @type {keyof typeof titulosCurtos} */ (chave)] ?? chave;
      const veredito = res.veredito ?? "inconclusivo";
      return `<div class="scorecard-item veredito-${escapeHtml(veredito)}">
        <span class="scorecard-modulo">${escapeHtml(titulo)}</span>
        <span class="scorecard-veredito">${escapeHtml(veredito.toUpperCase())}</span>
      </div>`;
    })
    .join("");

  return `<div class="scorecard">
    <h2 class="scorecard-titulo">Resultado da análise</h2>
    <div class="scorecard-grid">${items}</div>
  </div>`;
}

/**
 * #18 Texto de preview para botões de download
 * @param {Record<string, any>} resultados
 * @returns {string}
 */
function gerarPreviewDownloads(resultados) {
  const nomes = {
    modulo1: "M1",
    modulo2: "M2",
    modulo3: "M3",
    modulo4: "M4",
  };
  const modulosStr = Object.keys(resultados)
    .map((k) => nomes[/** @type {keyof typeof nomes} */ (k)] ?? k)
    .join(", ");
  const temAbusivo = Object.values(resultados).some((r) => r.veredito === "abusivo");
  const label = temAbusivo ? "abusividade detectada" : "dentro do limite";
  return `${modulosStr} · ${label}`;
}

// ================================================================
// DOWNLOAD
// ================================================================

/**
 * @param {string} id
 * @param {string} nomeArquivo
 * @param {string} mime
 * @param {() => Promise<Buffer | Uint8Array>} gerador
 */
function ligarDownload(id, nomeArquivo, mime, gerador) {
  const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById(id));
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    const original = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:0.9rem;font-weight:400;text-transform:none">Gerando…</span>';
    try {
      const buf = await gerador();
      const blob = new Blob([/** @type {BlobPart} */ (/** @type {unknown} */ (buf))], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // #19 Toast de sucesso
      mostrarToast("Arquivo gerado com sucesso!", "sucesso");
    } catch (err) {
      console.error(err);
      mostrarToast("Erro ao gerar o arquivo. Tente novamente.", "erro");
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.innerHTML = original;
    }
  });
}

// ================================================================
// HELPERS
// ================================================================

/**
 * @param {FormData} data
 * @returns {import("../../tests/fixtures/caso-exemplo.js").DadosCaso}
 */
function montarDadosCaso(data) {
  const partes = [
    [data.get("logradouro"), data.get("numero")].filter(Boolean).join(", "),
    data.get("bairro"),
    [data.get("cidade"), data.get("uf")].filter(Boolean).join("/"),
    data.get("cep") ? `CEP ${data.get("cep")}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const cidade = String(data.get("cidade") ?? "—");
  const uf = String(data.get("uf") ?? "");

  return {
    beneficiario: {
      nome: String(data.get("nome") ?? ""),
      cpf: String(data.get("cpf") ?? ""),
      endereco: partes || "—",
      dataNascimento: String(data.get("dataNascimento") ?? ""),
    },
    operadora: {
      razaoSocial: String(data.get("operadoraNome") ?? ""),
      cnpj: String(data.get("operadoraCnpj") ?? ""),
      numeroAns: String(data.get("operadoraAns") ?? ""),
    },
    contrato: {
      numero: String(data.get("contratoNumero") ?? "—"),
      dataAssinatura: String(data.get("dataAssinatura") ?? ""),
      tipo: /** @type {"individual" | "familiar"} */ (String(data.get("tipoContrato"))),
    },
    comarca: cidade && uf ? `${cidade}/${uf}` : cidade || "—",
    foro: cidade && uf ? `Foro da Comarca de ${cidade}/${uf}` : "—",
  };
}

/**
 * @param {unknown} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
