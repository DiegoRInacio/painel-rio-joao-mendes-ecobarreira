// URL do Web App do Apps Script (Extensões > Apps Script > Implantar).
// Nunca aponta para a planilha em si — só para esse endpoint que já
// devolve os dados agregados em JSON.
const API_URL = 'https://script.google.com/macros/s/AKfycby_VxkCol6ehKnziY-sBCqSLKVmoj7iVIoePlvZlWanoy5QymLr0rcApN0XIh2u_7oI/exec';

const CATEGORIAS_META = [
  { key: 'microlixo', label: 'Microlixo', cssVar: '--cat-microlixo' },
  { key: 'vidro', label: 'Vidro', cssVar: '--cat-vidro' },
  { key: 'plastico', label: 'Plástico', cssVar: '--cat-plastico' },
  { key: 'metal', label: 'Metal', cssVar: '--cat-metal' },
  { key: 'vestimentas', label: 'Vestimentas', cssVar: '--cat-vestimentas' },
  { key: 'tetrapak', label: 'Tetrapak', cssVar: '--cat-tetrapak' },
  { key: 'naoIdentificados', label: 'Não identificados', cssVar: '--cat-naoidentificados' },
  { key: 'outros', label: 'Outros', cssVar: '--cat-outros' },
  { key: 'naoDiscriminado', label: 'Não discriminado', cssVar: '--cat-naodiscriminado' }
];

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
