# Painel da Ecobarreira do Rio João Mendes

Painel de acompanhamento das coletas de resíduos da Ecobarreira do Rio João Mendes (Niterói/RJ), projeto da **amaDarcy**. Substitui o antigo dashboard do Google Data Studio por um site estático (HTML/CSS/JS puro, sem framework, sem build step), lendo os dados diretamente da planilha de campo do formulário de coletas — sem expor a planilha nem precisar de um backend próprio.

## Arquitetura

```
Planilha do Google (formulário de campo)
        │
        ▼
Google Apps Script (apps-script/Code.gs) — Web App
  • lê a aba de respostas
  • interpreta o texto livre da coluna de resíduos
  • agrega por categoria, por mês e por coleta
  • devolve tudo em JSON
        │  fetch()
        ▼
Front-end estático (index.html + css/ + js/)
```

Não existe servidor próprio: o único ponto de rede do front-end é a URL do Web App do Apps Script, configurada em [js/config.js](js/config.js) (`API_URL`). A planilha em si nunca é referenciada no front — só esse endpoint, que já devolve dados agregados.

## Estrutura de pastas

| Caminho | Conteúdo |
|---|---|
| `index.html` | Estrutura da página (header, filtros, KPIs, gráficos, tabela) |
| `css/styles.css` | Estilo completo — paleta verde da amaDarcy no chrome + paleta categórica validada (CVD-safe) para os dados |
| `js/config.js` | URL da API e metadados fixos (categorias, meses) |
| `js/charts.js` | Gráficos construídos à mão em SVG/HTML (barra horizontal de categorias, barra mensal), com tooltip |
| `js/app.js` | Busca os dados na API, popula filtros, renderiza KPIs/gráficos/tabela |
| `apps-script/Code.gs` | Código do Web App do Apps Script (fonte de dados) |
| `assets/` | Logo da amaDarcy e da DTA Dados (rodapé) |

## Rodando localmente

Como só existe uma chamada de rede (para a URL do Apps Script, um domínio externo https), abrir o `index.html` direto no navegador já funciona na maioria dos casos. Para testar em condições mais próximas da publicação:

```bash
cd "Painel Rio João Mendes"
python -m http.server 8000
```

Depois acesse `http://localhost:8000`. Alternativa sem Python: extensão **Live Server** do VS Code (clique direito no `index.html` → *Open with Live Server*).

## O backend de dados (Apps Script)

O `apps-script/Code.gs` é implantado como **Web App** direto no editor do Apps Script da planilha (`Extensões → Apps Script`):

- **Executar como:** Eu
- **Quem tem acesso:** Qualquer pessoa

Isso gera uma URL (`https://script.google.com/macros/s/…/exec`) que é o único endpoint que o front-end conhece. Sempre que o `Code.gs` for editado, é preciso criar uma **nova versão** na mesma implantação (*Implantar → Gerenciar implantações → editar → nova versão*) para a URL publicada refletir as mudanças — criar uma implantação nova mudaria a URL.

### Formato da resposta (`doGet`)

```jsonc
{
  "filtros": { "ano": null, "mes": null },
  "anosDisponiveis": [2022, 2023, 2024, 2025, 2026],
  "resumo": {
    "quantidadeColetas": 101,
    "pesoTotalKg": 20476.28,
    "pesoDetalhadoKg": 6126.56,
    "categorias": { "microlixo": 3056.29, "vidro": 115.45, "...": "...", "naoDiscriminado": 14479.12 }
  },
  "serieMensal": [{ "ano": 2022, "mes": 9, "pesoTotalKg": 1088.5 }],
  "listaColetas": [
    {
      "data": "15/06/2026",
      "responsavel": "…",
      "pesoTotalKg": 253.1,
      "sacosColetados": null,
      "textoOriginal": "Plástico 1 14,35; Plástico 2 1,60; …",
      "categorias": { "plastico": 31.5, "naoDiscriminado": 221.6, "...": 0 }
    }
  ]
}
```

Filtros são passados como query string: `?ano=2023`, `?mes=6`, ou combinados. `?debug=1` adiciona um array `linhasParaRevisar`, útil para auditar linhas onde o parser não conseguiu reconhecer o texto ou onde a soma das categorias não bate com o peso total da coleta.

### Interpretação do texto de resíduos

A coluna "Características do resíduo coletado" é texto livre, não estruturado (ex: `"Plástico tipo 2: 6,60 KG"`, `"Microlixo - 13.000 kg"`, ou só uma frase descritiva sem números). O `Code.gs` interpreta esse texto linha a linha e agrega em 8 categorias fixas (microlixo, vidro, plástico, metal, vestimentas, tetrapak, não identificados, outros) mais um bucket **`naoDiscriminado`**.

Três problemas de parsing foram identificados e corrigidos ao longo do desenvolvimento (ver comentários no próprio `Code.gs`):
1. Número com espaço depois da vírgula decimal (`"0, 400"`) sendo lido como `400` em vez de `0,4`.
2. Texto de horário no fim da célula (`"...08:00 as 10:50"`) sendo lido como um peso de 50 kg.
3. Ponto final de frase grudado no número (`"...2,60."`) sendo lido como `260` em vez de `2,6`.

**Limitação conhecida, não é bug:** boa parte das coletas — principalmente de 2024 em diante — só detalha alguns tipos de resíduo no texto (ex: só os subtipos de plástico), sem quebrar o restante por categoria, mesmo o peso total da coleta (pesado na balança) estando correto. Isso faz o bucket `naoDiscriminado` responder por boa parte do peso total (histórico atual: ~30% categorizado / ~70% não discriminado). O painel mostra essa lacuna de forma transparente em vez de escondê-la — a solução de fundo é a equipe de campo voltar a preencher a quebra completa por categoria em cada coleta.

## Publicando

Sem backend próprio: basta subir a pasta inteira em qualquer hospedagem de site estático (GitHub Pages, Netlify, etc.) — o repositório já está publicado via GitHub Pages (branch `main`, raiz). O único ponto que depende de configuração externa é a URL do Apps Script em `js/config.js`.
