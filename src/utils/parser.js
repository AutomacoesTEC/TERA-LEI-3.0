import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

import { AREAS } from '../constants/areas';
import { DIV, PATS } from '../constants/patterns';

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = pdfWorker;
}

function nowId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeComparableText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function identifyType(line) {
  return PATS.find((pattern) => pattern.r.test(line))?.t || null;
}

function extractId(type, line) {
  switch (type) {
    case 'PARTE':
    case 'LIVRO':
    case 'TÍTULO':
    case 'CAPÍTULO':
    case 'SEÇÃO':
    case 'SUBSEÇÃO': {
      const match = line.match(
        /^\s*([A-ZÁÉÍÓÚÇÃÕ]+(?:\s+[A-ZÁÉÍÓÚÇÃÕ]+){0,3}\s+(?:GERAL|ESPECIAL|PRELIMINAR|ÚNICO|ÚNICA|[IVXLCDM]+))/i,
      );
      return (match?.[1] || line).trim();
    }
    case 'ARTIGO':
      return line.match(/^\s*(Art\.\s*\d+[ºo°]?)/i)?.[1]?.trim() || 'Art.';
    case 'PARÁGRAFO':
      return (
        line.match(/^\s*(§\s*\d+[ºo°]?|Par[áa]grafo\s+[úu]nico\.?)/i)?.[1]?.trim() || '§'
      );
    case 'INCISO':
      return line.match(/^\s*([IVXLCDM]+)/)?.[1]?.trim() || 'Inciso';
    case 'ALÍNEA':
      return line.match(/^\s*([a-z]\))/i)?.[1]?.trim() || 'Alínea';
    case 'ITEM':
      return line.match(/^\s*(\d+\.)/)?.[1]?.trim() || 'Item';
    default:
      return '';
  }
}

function extractText(type, line) {
  switch (type) {
    case 'PARTE':
    case 'LIVRO':
    case 'TÍTULO':
    case 'CAPÍTULO':
    case 'SEÇÃO':
    case 'SUBSEÇÃO':
      return '';
    case 'ARTIGO':
      return line.replace(/^\s*Art\.\s*\d+[ºo°]?[\s-.:]*/i, '').trim();
    case 'PARÁGRAFO':
      return line
        .replace(/^\s*(?:§\s*\d+[ºo°]?|Par[áa]grafo\s+[úu]nico\.?)\s*/i, '')
        .trim();
    case 'INCISO':
      return line.replace(/^\s*[IVXLCDM]+\s*[-–—]\s*/i, '').trim();
    case 'ALÍNEA':
      return line.replace(/^\s*[a-z]\)\s*/i, '').trim();
    case 'ITEM':
      return line.replace(/^\s*\d+\.\s*/i, '').trim();
    default:
      return line.trim();
  }
}

function detectVetados(ds) {
  const normalizeId = (value) => (value || '').replace(/[^a-zA-Z0-9ºo°§]/g, '').toLowerCase();
  const hierarchyLevel = { ARTIGO: 0, PARÁGRAFO: 1, INCISO: 2, ALÍNEA: 3, ITEM: 4 };

  for (let index = 0; index < ds.length; index += 1) {
    const current = ds[index];
    if (DIV.has(current.tipo) || current.status !== 'vigente') {
      continue;
    }

    const normalizedCurrentId = normalizeId(current.id);
    const currentLevel = hierarchyLevel[current.tipo];

    if (!normalizedCurrentId || currentLevel === undefined) {
      continue;
    }

    let pointer = index + 1;
    while (pointer < ds.length) {
      const next = ds[pointer];
      if (DIV.has(next.tipo)) {
        pointer += 1;
        continue;
      }

      const nextLevel = hierarchyLevel[next.tipo];
      if (nextLevel === undefined) {
        pointer += 1;
        continue;
      }

      if (next.tipo === current.tipo && normalizeId(next.id) === normalizedCurrentId) {
        current.status = 'vetado';
        break;
      }

      if (nextLevel <= currentLevel && normalizeId(next.id) !== normalizedCurrentId) {
        break;
      }

      pointer += 1;
    }
  }

  return ds;
}

export function parse(text) {
  const ds = [];
  let active = null;
  let awaitingHeading = false;
  const reAlteracao =
    /\[?\s*(Reda[çc][ãa]o dada pel[oa]\(a\)[^\]]*|Inclu[ií]d[oa]\(a\) pel[oa]\(a\)[^\]]*|Revogad[oa]\(a\) pel[oa]\(a\)[^\]]*)\]?/gi;
  const reVetado = /\(\s*(?:VETADO|Vetado|vetado)\s*\)/;
  const reRevogado = /\(\s*(?:REVOGADO|Revogado|revogado)\s*\)/;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      if (awaitingHeading && active) {
        awaitingHeading = false;
      }
      continue;
    }

    const type = identifyType(line);
    if (type) {
      let alteracao = '';
      let status = 'vigente';
      const matchedAlteracoes = line.match(reAlteracao);
      if (matchedAlteracoes) {
        alteracao = matchedAlteracoes
          .map((item) => item.replace(/^\[|\]$/g, '').trim())
          .join('; ');
      }

      const cleanText = line.replace(reAlteracao, '').trim();
      if (reVetado.test(cleanText)) {
        status = 'vetado';
      } else if (reRevogado.test(cleanText) || /revogad/i.test(alteracao)) {
        status = 'revogado';
      }

      active = {
        tipo: type,
        id: extractId(type, cleanText),
        rub: '',
        txt: extractText(type, cleanText),
        status,
        alteracao,
      };
      ds.push(active);
      awaitingHeading = DIV.has(type);
      continue;
    }

    if (!active) {
      continue;
    }

    if (awaitingHeading && !active.rub) {
      active.rub = line;
      awaitingHeading = false;
      continue;
    }

    const matchedAlteracoes = line.match(reAlteracao);
    if (matchedAlteracoes) {
      const joined = matchedAlteracoes
        .map((item) => item.replace(/^\[|\]$/g, '').trim())
        .join('; ');
      active.alteracao = active.alteracao ? `${active.alteracao}; ${joined}` : joined;

      const cleaned = line.replace(reAlteracao, '').trim();
      if (cleaned) {
        active.txt = active.txt ? `${active.txt} ${cleaned}` : cleaned;
      }
    } else {
      active.txt = active.txt ? `${active.txt} ${line}` : line;
    }

    if (reVetado.test(active.txt)) {
      active.status = 'vetado';
    }
    if (reRevogado.test(active.txt) || /revogad/i.test(active.alteracao || '')) {
      active.status = 'revogado';
    }
  }

  return detectVetados(ds);
}

export async function pdfToText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .filter((item) => item.str?.trim())
      .sort((left, right) => {
        const deltaY = right.transform[5] - left.transform[5];
        return Math.abs(deltaY) > 3 ? deltaY : left.transform[4] - right.transform[4];
      });

    let lastY = null;
    let line = '';

    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        fullText += `${line.trim()}\n`;
        line = '';
      }

      line += `${line ? ' ' : ''}${item.str}`;
      lastY = y;
    }

    if (line.trim()) {
      fullText += `${line.trim()}\n`;
    }
  }

  return fullText
    .replaceAll('\u0000', '')
    .replace(/([.;:)\]]) *(§\s*\d)/g, '$1\n$2')
    .replace(/([.;:)\]]) *(Parágrafo único)/gi, '$1\n$2')
    .replace(/ (TÍTULO\s+[IVXLCDM]+)/g, '\n$1')
    .replace(/ (CAPÍTULO\s+[IVXLCDM]+)/g, '\n$1')
    .replace(/ (Seção\s+[IVXLCDM]+)/gi, '\n$1')
    .replace(/ (Subseção\s+[IVXLCDM]+)/gi, '\n$1')
    .replace(/ (PARTE\s+(?:GERAL|ESPECIAL|[IVXLCDM]+))/g, '\n$1')
    .replace(/ (LIVRO\s+(?:ÚNICO|[IVXLCDM]+))/g, '\n$1')
    .replace(/\ufffd/gi, '')
    .replace(/\s*ANEXO\s+[IVXLCDM]+\.pdf/gi, '')
    .replace(/\* Este texto não substitui o publicado oficialmente\./gi, '')
    .trim();
}

export function extrairRemissoes(ds) {
  const regex =
    /(?:§\s*\d+[ºo°]?\s+d[oe]\s+)?(?:arts?\.\s*)(\d+[ºo°]?(?:\s*(?:,|e|a)\s*\d+[ºo°]?)*)/gi;
  const resultado = [];
  let artigoAtual = '';

  for (const dispositivo of ds) {
    if (dispositivo.tipo === 'ARTIGO') {
      artigoAtual = dispositivo.id;
    }

    const textoCompleto = `${dispositivo.txt || ''} ${dispositivo.rub || ''}`;
    regex.lastIndex = 0;
    let match = regex.exec(textoCompleto);

    while (match !== null) {
      const referencias = match[1].match(/\d+[ºo°]?/g) || [];
      for (const referencia of referencias) {
        const destino = `Art. ${referencia}`;
        if (destino !== artigoAtual && artigoAtual) {
          resultado.push({
            origem: artigoAtual,
            disp: dispositivo.id,
            destino,
            ctx: textoCompleto.trim(),
            tipo: dispositivo.tipo,
          });
        }
      }

      match = regex.exec(textoCompleto);
    }
  }

  return resultado;
}

export function extrairPrazosValores(ds) {
  const reValor = /R\$\s*[\d.]+,\d{2}/g;
  const rePercentual = /\d+(?:[,.]\d+)?\s*%/g;
  const rePrazo = /(?:\d+\s*(?:dias?|meses?|anos?|horas?))|(?:at[ée]\s+\d{1,2}\s+de\s+\w+)/gi;
  const sinais = [];
  let artigoAtual = '';
  let capituloAtual = '';

  for (const dispositivo of ds) {
    if (dispositivo.tipo === 'CAPÍTULO') {
      capituloAtual = dispositivo.rub || dispositivo.id;
    }
    if (dispositivo.tipo === 'ARTIGO') {
      artigoAtual = dispositivo.id;
    }

    if (!dispositivo.txt) {
      continue;
    }

    for (const [regex, tipo] of [
      [reValor, 'VALOR (R$)'],
      [rePercentual, 'PERCENTUAL (%)'],
      [rePrazo, 'PRAZO'],
    ]) {
      regex.lastIndex = 0;
      let match = regex.exec(dispositivo.txt);
      while (match !== null) {
        sinais.push({
          art: artigoAtual,
          cap: capituloAtual,
          disp: dispositivo.id,
          tipo,
          val: match[0],
          ctx: dispositivo.txt,
        });
        match = regex.exec(dispositivo.txt);
      }
    }
  }

  return sinais;
}

export function buildKeywordIndex(ds, area) {
  const palavras = AREAS[area]?.palavras || [];
  const indice = {};
  let artigoAtual = '';

  for (const dispositivo of ds) {
    if (dispositivo.tipo === 'ARTIGO') {
      artigoAtual = dispositivo.id;
    }

    const texto = `${dispositivo.txt || ''} ${dispositivo.rub || ''}`.toLowerCase();
    for (const palavra of palavras) {
      if (texto.includes(palavra.toLowerCase()) && artigoAtual) {
        if (!indice[palavra]) {
          indice[palavra] = [];
        }
        if (!indice[palavra].includes(artigoAtual)) {
          indice[palavra].push(artigoAtual);
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(indice).sort(([left], [right]) => left.localeCompare(right, 'pt-BR')),
  );
}

function buildStats(ds, refs, sinais) {
  const artigos = ds.filter((item) => item.tipo === 'ARTIGO').length;
  const vetados = ds.filter((item) => item.status === 'vetado').length;
  const revogados = ds.filter((item) => item.status === 'revogado').length;
  const alterados = ds.filter((item) => item.alteracao).length;
  const valores = sinais.filter((item) => item.tipo === 'VALOR (R$)');
  const percentuais = sinais.filter((item) => item.tipo === 'PERCENTUAL (%)');
  const prazos = sinais.filter((item) => item.tipo === 'PRAZO');

  const inbound = new Map();
  for (const ref of refs) {
    inbound.set(ref.destino, (inbound.get(ref.destino) || 0) + 1);
  }

  const artigosCriticos = [...inbound.entries()]
    .map(([artigo, total]) => ({ artigo, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);

  return {
    artigos,
    dispositivos: ds.length,
    remissoes: refs.length,
    vetados,
    revogados,
    alterados,
    valores,
    percentuais,
    prazos,
    artigosCriticos,
  };
}

function buildVersionSnapshot({ sourceName, ds, area, previousDs }) {
  const refs = extrairRemissoes(ds);
  const sinais = extrairPrazosValores(ds);
  return {
    id: nowId(),
    importedAt: new Date().toISOString(),
    sourceName,
    area,
    ds,
    stats: buildStats(ds, refs, sinais),
    diff: previousDs ? compareVersions(previousDs, ds) : null,
  };
}

function fallbackParse(rawText) {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      tipo: 'TEXTO',
      id: `Linha ${index + 1}`,
      rub: '',
      txt: line,
      status: 'vigente',
      alteracao: '',
    }));
}

export function buildArticleBlocks(ds) {
  const blocks = [];
  const trilha = {
    PARTE: '',
    LIVRO: '',
    TÍTULO: '',
    CAPÍTULO: '',
    SEÇÃO: '',
    SUBSEÇÃO: '',
  };
  const niveis = ['PARTE', 'LIVRO', 'TÍTULO', 'CAPÍTULO', 'SEÇÃO', 'SUBSEÇÃO'];
  let currentBlock = null;

  for (const dispositivo of ds) {
    if (DIV.has(dispositivo.tipo)) {
      trilha[dispositivo.tipo] = dispositivo.rub || dispositivo.id;
      const indice = niveis.indexOf(dispositivo.tipo);
      for (let i = indice + 1; i < niveis.length; i += 1) {
        trilha[niveis[i]] = '';
      }
      continue;
    }

    if (dispositivo.tipo === 'ARTIGO') {
      currentBlock = {
        id: dispositivo.id,
        heading: dispositivo.id,
        text: dispositivo.txt,
        status: dispositivo.status,
        alteracao: dispositivo.alteracao,
        hierarchy: Object.values(trilha).filter(Boolean).join(' > '),
        devices: [dispositivo],
      };
      blocks.push(currentBlock);
      continue;
    }

    if (currentBlock) {
      currentBlock.devices.push(dispositivo);
    }
  }

  return blocks;
}

function contextualize(ds) {
  const enriched = [];
  let artigoAtual = '';

  for (const dispositivo of ds) {
    if (dispositivo.tipo === 'ARTIGO') {
      artigoAtual = dispositivo.id;
    }

    enriched.push({
      ...dispositivo,
      artigoAtual,
    });
  }

  return enriched;
}

function deviceKey(dispositivo) {
  return `${dispositivo.tipo}|${slugify(dispositivo.id || dispositivo.rub || dispositivo.txt || '')}`;
}

export function compareVersions(previousDs = [], nextDs = []) {
  const previousMap = new Map(contextualize(previousDs).map((item) => [deviceKey(item), item]));
  const nextMap = new Map(contextualize(nextDs).map((item) => [deviceKey(item), item]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, value] of nextMap.entries()) {
    if (!previousMap.has(key)) {
      added.push(value);
      continue;
    }

    const previous = previousMap.get(key);
    const changedText =
      normalizeComparableText(`${previous.rub} ${previous.txt}`) !==
      normalizeComparableText(`${value.rub} ${value.txt}`);
    const changedStatus = previous.status !== value.status;
    const changedAlteracao =
      normalizeComparableText(previous.alteracao || '') !==
      normalizeComparableText(value.alteracao || '');

    if (changedText || changedStatus || changedAlteracao) {
      changed.push({
        ...value,
        previousText: previous.txt,
        previousStatus: previous.status,
      });
    }
  }

  for (const [key, value] of previousMap.entries()) {
    if (!nextMap.has(key)) {
      removed.push(value);
    }
  }

  const touchedArticles = [
    ...new Set(
      [...added, ...removed, ...changed]
        .map((item) => item.artigoAtual || item.id)
        .filter(Boolean),
    ),
  ];

  return {
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
    touchedArticles,
    sampleChanges: [
      ...changed.slice(0, 4).map((item) => ({
        kind: 'alterado',
        label: item.id,
        article: item.artigoAtual || item.id,
      })),
      ...added.slice(0, 2).map((item) => ({
        kind: 'incluído',
        label: item.id,
        article: item.artigoAtual || item.id,
      })),
      ...removed.slice(0, 2).map((item) => ({
        kind: 'removido',
        label: item.id,
        article: item.artigoAtual || item.id,
      })),
    ],
  };
}

export async function importLawFromFile(file, area) {
  const rawText = await pdfToText(file);
  let ds = parse(rawText);

  if (ds.length < 3) {
    ds = fallbackParse(rawText);
  }

  const refs = extrairRemissoes(ds);
  const sinais = extrairPrazosValores(ds);
  const keywordIndex = buildKeywordIndex(ds, area);
  const metrics = buildStats(ds, refs, sinais);
  const version = buildVersionSnapshot({
    sourceName: file.name,
    ds,
    area,
    previousDs: null,
  });

  return {
    id: nowId(),
    slug: slugify(file.name.replace(/\.pdf$/i, '')),
    nome: file.name.replace(/\.pdf$/i, ''),
    origemArquivo: file.name,
    area,
    data: new Date().toLocaleDateString('pt-BR'),
    updatedAt: new Date().toISOString(),
    ds,
    refs,
    sinais,
    keywordIndex,
    metrics,
    nA: metrics.artigos,
    nD: metrics.dispositivos,
    anexos: [],
    versions: [version],
    latestDiff: null,
  };
}

function ensureVersions(law) {
  if (law.versions?.length) {
    return law.versions;
  }

  return [
    buildVersionSnapshot({
      sourceName: law.origemArquivo || `${law.nome}.pdf`,
      ds: law.ds,
      area: law.area,
      previousDs: null,
    }),
  ];
}

export function upsertLawInLibrary(library, importedLaw) {
  const existingIndex = library.findIndex(
    (law) => slugify(law.nome) === importedLaw.slug || law.slug === importedLaw.slug,
  );

  if (existingIndex === -1) {
    return {
      library: [importedLaw, ...library].sort(
        (left, right) => new Date(right.updatedAt) - new Date(left.updatedAt),
      ),
      selectedId: importedLaw.id,
      mode: 'created',
    };
  }

  const existing = library[existingIndex];
  const versionSnapshot = buildVersionSnapshot({
    sourceName: importedLaw.origemArquivo,
    ds: importedLaw.ds,
    area: importedLaw.area,
    previousDs: existing.ds,
  });

  const merged = {
    ...existing,
    ...importedLaw,
    id: existing.id,
    slug: existing.slug || importedLaw.slug,
    anexos: existing.anexos || [],
    versions: [...ensureVersions(existing), versionSnapshot],
    latestDiff: versionSnapshot.diff,
  };

  const next = [...library];
  next[existingIndex] = merged;

  return {
    library: next.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)),
    selectedId: merged.id,
    mode: 'versioned',
  };
}
