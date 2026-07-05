// Painel Ecobarreira — busca os dados do Web App (Apps Script) e renderiza
// KPIs, gráficos e a tabela de coletas. Sem framework, sem build step.

const state = {
  dados: null,
  busca: ''
};

const els = {
  filtroAno: document.getElementById('filtro-ano'),
  filtroMes: document.getElementById('filtro-mes'),
  filtroReset: document.getElementById('filtro-reset'),
  busca: document.getElementById('busca-coleta'),
  kpiPesoTotal: document.getElementById('kpi-peso-total'),
  kpiQtdColetas: document.getElementById('kpi-qtd-coletas'),
  kpiQtdHint: document.getElementById('kpi-qtd-hint'),
  kpiPesoCategorizado: document.getElementById('kpi-peso-categorizado'),
  kpiPesoCategorizadoHint: document.getElementById('kpi-peso-categorizado-hint'),
  kpiMedia: document.getElementById('kpi-media'),
  chartCategorias: document.getElementById('chart-categorias'),
  chartMensal: document.getElementById('chart-mensal'),
  coletasList: document.getElementById('coletas-list'),
  tabelaSubtitle: document.getElementById('tabela-subtitle')
};

async function carregarDados(ano, mes) {
  const params = new URLSearchParams();
  if (ano) params.set('ano', ano);
  if (mes) params.set('mes', mes);
  const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Falha ao carregar dados (' + resp.status + ')');
  return resp.json();
}

function popularFiltroAno(anos, anoSelecionado) {
  const atual = els.filtroAno.value;
  els.filtroAno.innerHTML = '<option value="">Todos os anos</option>';
  anos.slice().sort((a, b) => b - a).forEach((ano) => {
    const opt = document.createElement('option');
    opt.value = ano;
    opt.textContent = ano;
    els.filtroAno.appendChild(opt);
  });
  els.filtroAno.value = anoSelecionado || atual || '';
}

function popularFiltroMes(mesSelecionado) {
  if (els.filtroMes.dataset.populado) {
    els.filtroMes.value = mesSelecionado || '';
    return;
  }
  MESES_PT.forEach((nome, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = nome;
    els.filtroMes.appendChild(opt);
  });
  els.filtroMes.dataset.populado = '1';
  els.filtroMes.value = mesSelecionado || '';
}

function renderKpis(resumo) {
  els.kpiPesoTotal.textContent = numeroKg(resumo.pesoTotalKg);
  els.kpiQtdColetas.textContent = resumo.quantidadeColetas.toLocaleString('pt-BR');

  const pct = resumo.pesoTotalKg > 0
    ? Math.round((resumo.pesoDetalhadoKg / resumo.pesoTotalKg) * 100)
    : 0;
  els.kpiPesoCategorizado.textContent = numeroKg(resumo.pesoDetalhadoKg);
  els.kpiPesoCategorizadoHint.textContent = `${pct}% do total identificado por tipo`;

  const media = resumo.quantidadeColetas > 0 ? resumo.pesoTotalKg / resumo.quantidadeColetas : 0;
  els.kpiMedia.textContent = numeroKg(media);
}

function formatarPeriodoAtivo(ano, mes) {
  if (ano && mes) return `${MESES_PT[mes - 1]} de ${ano}`;
  if (ano) return `ano de ${ano}`;
  if (mes) return `${MESES_PT[mes - 1]} (todos os anos)`;
  return 'todo o período';
}

function coletaCorresponde(coleta, termo) {
  if (!termo) return true;
  const alvo = (coleta.responsavel + ' ' + coleta.textoOriginal).toLowerCase();
  return alvo.includes(termo.toLowerCase());
}

function criarChip(catKey, valor) {
  const meta = CATEGORIAS_META.find((c) => c.key === catKey);
  const chip = document.createElement('span');
  chip.className = 'coleta-detail__chip';
  const dot = document.createElement('span');
  dot.className = 'coleta-detail__chip-dot';
  dot.style.background = cssVarValor(meta.cssVar);
  const text = document.createElement('span');
  text.textContent = `${meta.label}: ${numeroKgPreciso(valor)}`;
  chip.appendChild(dot);
  chip.appendChild(text);
  return chip;
}

function renderLinhaColeta(coleta) {
  const row = document.createElement('div');
  row.className = 'coleta-row';

  const summary = document.createElement('button');
  summary.type = 'button';
  summary.className = 'coleta-row__summary';
  summary.setAttribute('aria-expanded', 'false');

  const data = document.createElement('span');
  data.className = 'coleta-row__date';
  data.textContent = coleta.data;

  const resumoTexto = document.createElement('span');
  resumoTexto.className = 'coleta-row__resumo';
  resumoTexto.textContent = coleta.textoOriginal || coleta.responsavel || 'Sem descrição registrada';

  const peso = document.createElement('span');
  peso.className = 'coleta-row__peso';
  peso.textContent = numeroKg(coleta.pesoTotalKg);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('viewBox', '0 0 20 20');
  chevron.setAttribute('class', 'coleta-row__chevron');
  chevron.innerHTML = '<path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';

  summary.appendChild(data);
  summary.appendChild(resumoTexto);
  summary.appendChild(peso);
  summary.appendChild(chevron);

  const detail = document.createElement('div');
  detail.className = 'coleta-row__detail';

  const chipsWrap = document.createElement('div');
  chipsWrap.className = 'coleta-detail__categorias';
  Object.keys(coleta.categorias).forEach((key) => {
    if (coleta.categorias[key] > 0) chipsWrap.appendChild(criarChip(key, coleta.categorias[key]));
  });
  if (!chipsWrap.children.length) {
    const semDado = document.createElement('span');
    semDado.className = 'coleta-detail__meta';
    semDado.textContent = 'Nenhuma categoria detectada no texto desta coleta.';
    chipsWrap.appendChild(semDado);
  }

  const textoOriginal = document.createElement('div');
  textoOriginal.className = 'coleta-detail__texto';
  textoOriginal.textContent = coleta.textoOriginal || '—';

  const meta = document.createElement('div');
  meta.className = 'coleta-detail__meta';
  const partesMeta = [];
  if (coleta.responsavel) partesMeta.push('Responsável: ' + coleta.responsavel);
  if (coleta.sacosColetados !== null && coleta.sacosColetados !== undefined) partesMeta.push('Sacos coletados: ' + coleta.sacosColetados);
  meta.textContent = partesMeta.join(' · ');

  detail.appendChild(chipsWrap);
  detail.appendChild(textoOriginal);
  if (partesMeta.length) detail.appendChild(meta);

  summary.addEventListener('click', () => {
    const abrindo = !row.classList.contains('is-open');
    row.classList.toggle('is-open', abrindo);
    summary.setAttribute('aria-expanded', String(abrindo));
  });

  row.appendChild(summary);
  row.appendChild(detail);
  return row;
}

function renderTabela() {
  const todas = state.dados.listaColetas.filter((c) => coletaCorresponde(c, state.busca));

  els.coletasList.innerHTML = '';
  if (!todas.length) {
    els.coletasList.innerHTML = '<div class="empty-state">Nenhuma coleta encontrada.</div>';
  } else {
    todas.forEach((coleta) => els.coletasList.appendChild(renderLinhaColeta(coleta)));
  }

  els.tabelaSubtitle.textContent = `${todas.length.toLocaleString('pt-BR')} coleta(s) · mais recentes primeiro`;
}

const mainEl = document.querySelector('main');

async function atualizarPainel() {
  const ano = els.filtroAno.value || null;
  const mes = els.filtroMes.value || null;
  const primeiraCarga = !state.dados;
  if (!primeiraCarga) mainEl.classList.add('is-loading');

  try {
    const dados = await carregarDados(ano, mes);
    state.dados = dados;

    popularFiltroAno(dados.anosDisponiveis, ano);
    popularFiltroMes(mes);

    renderKpis(dados.resumo);
    els.kpiQtdHint.textContent = formatarPeriodoAtivo(ano, mes);
    renderCategoriaChart(els.chartCategorias, dados.resumo.categorias);
    renderMensalChart(els.chartMensal, dados.serieMensal);
    renderTabela();
  } catch (erro) {
    console.error(erro);
    els.coletasList.innerHTML = '<div class="error-state">Não foi possível carregar os dados agora. Tente novamente em instantes.</div>';
    els.chartCategorias.innerHTML = '<div class="error-state">Falha ao carregar.</div>';
    els.chartMensal.innerHTML = '<div class="error-state">Falha ao carregar.</div>';
  } finally {
    mainEl.classList.remove('is-loading');
  }
}

els.filtroAno.addEventListener('change', () => atualizarPainel());
els.filtroMes.addEventListener('change', () => atualizarPainel());
els.filtroReset.addEventListener('click', () => {
  els.filtroAno.value = '';
  els.filtroMes.value = '';
  atualizarPainel();
});

let buscaTimeout;
els.busca.addEventListener('input', () => {
  clearTimeout(buscaTimeout);
  buscaTimeout = setTimeout(() => {
    state.busca = els.busca.value.trim();
    renderTabela();
  }, 200);
});

// o grafico mensal calcula seu tamanho em px a partir do espaco disponivel
// no cartao (painel de tela unica, sem scroll) - precisa recalcular ao
// redimensionar a janela.
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (state.dados) renderMensalChart(els.chartMensal, state.dados.serieMensal);
  }, 150);
});

atualizarPainel();
