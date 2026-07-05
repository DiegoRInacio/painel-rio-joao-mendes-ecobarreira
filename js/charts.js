// Gráficos construídos à mão em HTML/SVG (sem biblioteca), seguindo os specs
// de marca do painel: barras finas, cantos arredondados na ponta, hairlines
// para grade, tooltip no hover/foco, rótulos diretos com o valor.

const numeroKg = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
const numeroKgPreciso = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kg';

function cssVarValor(nomeVar) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeVar).trim();
}

// --- Tooltip compartilhado ---
const tooltipEl = document.getElementById('viz-tooltip');

function mostrarTooltip(x, y, tituloTexto, valorTexto) {
  const titleEl = document.createElement('div');
  titleEl.className = 'viz-tooltip__title';
  titleEl.textContent = tituloTexto;
  const valueEl = document.createElement('div');
  valueEl.className = 'viz-tooltip__value';
  valueEl.textContent = valorTexto;

  tooltipEl.innerHTML = '';
  tooltipEl.appendChild(titleEl);
  tooltipEl.appendChild(valueEl);
  tooltipEl.classList.add('is-visible');
  posicionarTooltip(x, y);
}

function posicionarTooltip(x, y) {
  const rect = tooltipEl.getBoundingClientRect();
  let left = x + 14;
  let top = y - rect.height - 10;
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 14;
  if (top < 8) top = y + 18;
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
}

function esconderTooltip() {
  tooltipEl.classList.remove('is-visible');
}

/**
 * Gráfico de barras horizontais — peso por categoria.
 * "Não discriminado" sempre por último, em cinza neutro (não é uma 9ª cor
 * categórica, é o "resto" — ver dataviz skill: uma 9ª série nunca vira hue nova).
 *
 * Clicável: funciona como cross-filter (igual Looker Studio/Power BI) — clicar
 * numa categoria chama onSelecionar(key), que o app.js usa pra filtrar a
 * tabela e recalcular a evolução mensal só daquela categoria. Clicar de novo
 * na mesma limpa a seleção (onSelecionar(key) de novo, o app decide o toggle).
 */
function renderCategoriaChart(container, categorias, categoriaSelecionada, onSelecionar) {
  const reais = CATEGORIAS_META
    .filter((c) => c.key !== 'naoDiscriminado')
    .map((c) => ({ ...c, valor: categorias[c.key] || 0 }))
    .sort((a, b) => b.valor - a.valor);

  const naoDiscriminadoMeta = CATEGORIAS_META.find((c) => c.key === 'naoDiscriminado');
  const naoDiscriminado = { ...naoDiscriminadoMeta, valor: categorias.naoDiscriminado || 0 };

  const todas = [...reais, naoDiscriminado];
  const max = Math.max(...todas.map((c) => c.valor), 1);
  const temSelecao = !!categoriaSelecionada;

  container.innerHTML = '';
  todas.forEach((cat) => {
    const estaSelecionada = cat.key === categoriaSelecionada;
    const row = document.createElement('div');
    row.className = 'hbar-row'
      + (cat.key === 'naoDiscriminado' ? ' hbar-row--muted' : '')
      + (estaSelecionada ? ' is-selected' : '')
      + (temSelecao && !estaSelecionada ? ' is-dimmed' : '');

    const label = document.createElement('span');
    label.className = 'hbar-row__label';
    label.textContent = cat.label;
    label.title = cat.label;

    const track = document.createElement('div');
    track.className = 'hbar-row__track';
    const fill = document.createElement('div');
    fill.className = 'hbar-row__fill';
    fill.style.background = cssVarValor(cat.cssVar);
    fill.style.width = '0%';
    track.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'hbar-row__value';
    value.textContent = cat.valor > 0 ? numeroKg(cat.valor) : '—';

    track.tabIndex = 0;
    track.setAttribute('role', 'button');
    track.setAttribute('aria-pressed', String(estaSelecionada));
    track.setAttribute('aria-label', 'Filtrar por ' + cat.label + ': ' + numeroKgPreciso(cat.valor));
    const abrirTip = (evt) => mostrarTooltip(evt.clientX, evt.clientY, cat.label, numeroKgPreciso(cat.valor));
    track.addEventListener('pointermove', abrirTip);
    track.addEventListener('pointerenter', abrirTip);
    track.addEventListener('focus', () => {
      const r = track.getBoundingClientRect();
      mostrarTooltip(r.left + r.width / 2, r.top, cat.label, numeroKgPreciso(cat.valor));
    });
    track.addEventListener('pointerleave', esconderTooltip);
    track.addEventListener('blur', esconderTooltip);

    if (typeof onSelecionar === 'function') {
      const selecionar = (evt) => {
        // Impede o clique de borbulhar ate o listener global de "clicar fora"
        // (app.js) - sem isso, o proprio clique some com a selecao que ele
        // acabou de fazer, porque renderGraficos() troca o DOM da linha na
        // hora, quebrando a cadeia de ancestrais que o listener global usa
        // pra saber se o clique foi "dentro" do grafico.
        if (evt) evt.stopPropagation();
        esconderTooltip();
        onSelecionar(cat.key);
      };
      // a linha inteira e clicavel (nao so a barrinha), mais facil de acertar
      row.style.cursor = 'pointer';
      row.addEventListener('click', selecionar);
      track.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); selecionar(); }
      });
    }

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);

    requestAnimationFrame(() => {
      fill.style.width = Math.max((cat.valor / max) * 100, cat.valor > 0 ? 2 : 0) + '%';
    });
  });

  // legenda (identidade nunca só por cor — reforça com texto)
  const legend = document.createElement('div');
  legend.className = 'legend';
  todas.forEach((cat) => {
    const item = document.createElement('div');
    item.className = 'legend__item';
    const dot = document.createElement('span');
    dot.className = 'legend__swatch';
    dot.style.background = cssVarValor(cat.cssVar);
    const text = document.createElement('span');
    text.textContent = cat.label;
    item.appendChild(dot);
    item.appendChild(text);
    legend.appendChild(item);
  });
  container.appendChild(legend);
}

function arredondarEscala(maxValor) {
  if (maxValor <= 0) return { max: 10, passo: 2 };
  const grandeza = Math.pow(10, Math.floor(Math.log10(maxValor)));
  const candidatos = [1, 2, 2.5, 5, 10];
  for (const c of candidatos) {
    const passo = c * grandeza / 5;
    if (passo * 5 >= maxValor) return { max: passo * 5, passo };
  }
  return { max: maxValor, passo: maxValor / 5 };
}

/**
 * Gráfico de barras verticais — evolução mensal.
 * Uma única série, então usa um só hue de marca (sem legenda). Clicável:
 * funciona como cross-filter, chamando onSelecionarMes({ano,mes}) — o app.js
 * usa isso pra aplicar o mesmo filtro dos dropdowns de Ano/Mês. mesAtivo
 * marca a barra que corresponde ao filtro ano/mês em vigor no momento.
 */
function renderMensalChart(container, serieMensal, onSelecionarMes, mesAtivo) {
  container.innerHTML = '';
  if (!serieMensal.length) {
    container.innerHTML = '<div class="empty-state">Sem coletas no período selecionado.</div>';
    return;
  }

  const padLeft = 46;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;

  // O painel é de tela única (sem rolagem de página): o gráfico sempre
  // preenche a largura e a altura do cartão, em vez de crescer e exigir
  // scroll horizontal — o slot de cada barra se ajusta à quantidade de meses.
  const chartWidth = Math.max(container.clientWidth || container.parentElement.clientWidth || 600, 280);
  const chartHeight = Math.max(container.clientHeight || container.parentElement.clientHeight || 220, 160);
  const barSlot = (chartWidth - padLeft - padRight) / serieMensal.length;
  const barWidth = Math.max(Math.min(barSlot * 0.62, 22), 2);

  const maxValor = Math.max(...serieMensal.map((m) => m.pesoTotalKg));
  const { max: escalaMax, passo } = arredondarEscala(maxValor);
  const escalaY = (v) => chartHeight - padBottom - (v / escalaMax) * (chartHeight - padTop - padBottom);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
  svg.setAttribute('width', chartWidth);
  svg.setAttribute('height', chartHeight);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Peso total coletado por mês');

  // gridlines + rótulos do eixo Y
  for (let v = 0; v <= escalaMax + 0.001; v += passo) {
    const y = escalaY(v);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', padLeft);
    line.setAttribute('x2', chartWidth - padRight);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'bar-chart__gridline');
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', padLeft - 8);
    label.setAttribute('y', y + 3);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('class', 'bar-chart__axis-label');
    label.textContent = Math.round(v).toLocaleString('pt-BR');
    svg.appendChild(label);
  }

  const baselineY = escalaY(0);

  const temMesAtivo = !!mesAtivo;

  serieMensal.forEach((m, i) => {
    const x = padLeft + i * barSlot + (barSlot - barWidth) / 2;
    const yTopo = escalaY(m.pesoTotalKg);
    const altura = Math.max(baselineY - yTopo, 1);
    const raio = Math.min(4, barWidth / 2, altura);
    const estaAtivo = temMesAtivo && mesAtivo.ano === m.ano && mesAtivo.mes === m.mes;

    const path = document.createElementNS(svgNS, 'path');
    const d = `M ${x} ${baselineY}
               L ${x} ${yTopo + raio}
               Q ${x} ${yTopo} ${x + raio} ${yTopo}
               L ${x + barWidth - raio} ${yTopo}
               Q ${x + barWidth} ${yTopo} ${x + barWidth} ${yTopo + raio}
               L ${x + barWidth} ${baselineY} Z`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'bar-chart__bar'
      + (estaAtivo ? ' is-selected' : '')
      + (temMesAtivo && !estaAtivo ? ' is-dimmed' : ''));
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-pressed', String(estaAtivo));
    const mesNome = MESES_PT[m.mes - 1];
    path.setAttribute('aria-label', `Filtrar por ${mesNome} de ${m.ano}: ${numeroKgPreciso(m.pesoTotalKg)}`);

    const abrirTip = (evt) => mostrarTooltip(evt.clientX, evt.clientY, `${mesNome} de ${m.ano}`, numeroKgPreciso(m.pesoTotalKg));
    path.addEventListener('pointermove', abrirTip);
    path.addEventListener('pointerenter', abrirTip);
    path.addEventListener('focus', () => {
      const r = path.getBoundingClientRect();
      mostrarTooltip(r.left + r.width / 2, r.top, `${mesNome} de ${m.ano}`, numeroKgPreciso(m.pesoTotalKg));
    });
    path.addEventListener('pointerleave', esconderTooltip);
    path.addEventListener('blur', esconderTooltip);

    if (typeof onSelecionarMes === 'function') {
      const selecionar = () => { esconderTooltip(); onSelecionarMes({ ano: m.ano, mes: m.mes }); };
      path.addEventListener('click', selecionar);
      path.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); selecionar(); }
      });
    }

    svg.appendChild(path);

    // rótulo do eixo X: só em janeiro (marca virada de ano) pra não colidir
    if (m.mes === 1 || i === 0) {
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', x + barWidth / 2);
      label.setAttribute('y', chartHeight - padBottom + 16);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'bar-chart__axis-label');
      label.textContent = m.ano;
      svg.appendChild(label);
    }
  });

  const baseline = document.createElementNS(svgNS, 'line');
  baseline.setAttribute('x1', padLeft);
  baseline.setAttribute('x2', chartWidth - padRight);
  baseline.setAttribute('y1', baselineY);
  baseline.setAttribute('y2', baselineY);
  baseline.setAttribute('stroke', cssVarValor('--baseline'));
  baseline.setAttribute('stroke-width', '1');
  svg.appendChild(baseline);

  container.appendChild(svg);
}
