import { DIV } from '../constants/patterns';

export function normalizeSearch(text = '') {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fullTextSearch(ds, termo) {
  if (!termo || termo.trim().length < 3) {
    return [];
  }

  const termos = termo
    .split('+')
    .map((fragmento) => normalizeSearch(fragmento))
    .filter((fragmento) => fragmento.length >= 3);

  if (!termos.length) {
    return [];
  }

  const resultados = [];
  let artAtual = '';

  for (let index = 0; index < ds.length; index += 1) {
    const dispositivo = ds[index];

    if (DIV.has(dispositivo.tipo)) {
      artAtual = '';
    } else if (dispositivo.tipo === 'ARTIGO') {
      artAtual = dispositivo.id;
    }

    const conteudo = normalizeSearch(
      `${dispositivo.id || ''} ${dispositivo.rub || ''} ${dispositivo.txt || ''}`,
    );

    if (!termos.every((termoAtual) => conteudo.includes(termoAtual))) {
      continue;
    }

    const ocorrencias = termos.reduce(
      (total, termoAtual) => total + (conteudo.split(termoAtual).length - 1),
      0,
    );

    resultados.push({
      idx: index,
      tipo: dispositivo.tipo,
      id: dispositivo.id,
      art: artAtual,
      txt: dispositivo.txt,
      rub: dispositivo.rub,
      ocorrencias,
      status: dispositivo.status || 'vigente',
    });
  }

  return resultados;
}

export function hierarquia(ds) {
  const contexto = {};
  const trilha = {
    PARTE: '',
    LIVRO: '',
    TÍTULO: '',
    CAPÍTULO: '',
    SEÇÃO: '',
    SUBSEÇÃO: '',
  };
  const niveis = ['PARTE', 'LIVRO', 'TÍTULO', 'CAPÍTULO', 'SEÇÃO', 'SUBSEÇÃO'];

  for (const dispositivo of ds) {
    if (DIV.has(dispositivo.tipo)) {
      trilha[dispositivo.tipo] = dispositivo.rub || dispositivo.id;
      const indice = niveis.indexOf(dispositivo.tipo);
      for (let i = indice + 1; i < niveis.length; i += 1) {
        trilha[niveis[i]] = '';
      }
    }

    if (dispositivo.tipo === 'ARTIGO') {
      contexto[dispositivo.id] = Object.values(trilha).filter(Boolean).join(' > ');
    }
  }

  return contexto;
}
