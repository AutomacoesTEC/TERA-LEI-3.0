import { compareVersions } from './parser';
import { fullTextSearch, normalizeSearch } from './search';

const STOPWORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'com',
  'como',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'ou',
  'para',
  'por',
  'que',
  'se',
  'sem',
  'sob',
  'sobre',
  'um',
  'uma',
]);

function excerpt(text, size = 180) {
  if (!text) {
    return '';
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= size) {
    return normalized;
  }

  return `${normalized.slice(0, size).trim()}...`;
}

function extractTerms(question) {
  const normalized = normalizeSearch(question);
  const unique = [...new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean))];
  return unique.filter((item) => item.length > 2 && !STOPWORDS.has(item)).slice(0, 6);
}

export function buildConsultationDraft(library, question, selectedIds, mode = 'parecer') {
  const terms = extractTerms(question);
  const alvo = selectedIds?.length
    ? library.filter((law) => selectedIds.includes(law.id))
    : library;

  const termoComposto = terms.join('+');
  const results = alvo
    .map((law) => {
      const hits = termoComposto ? fullTextSearch(law.ds, termoComposto) : [];
      return {
        law,
        hits,
        score: hits.reduce((total, hit) => total + hit.ocorrencias, 0),
      };
    })
    .filter((item) => item.hits.length)
    .sort((left, right) => right.score - left.score);

  const fundamentos = results
    .flatMap((item) =>
      item.hits.slice(0, 4).map((hit) => ({
        lawId: item.law.id,
        lei: item.law.nome,
        artigo: hit.art || hit.id,
        dispositivo: hit.id,
        status: hit.status,
        texto: excerpt(hit.txt || hit.rub),
        ocorrencias: hit.ocorrencias,
      })),
    )
    .slice(0, 8);

  const riscos = fundamentos
    .filter((item) => item.status !== 'vigente')
    .map((item) => `${item.dispositivo} aparece como ${item.status} em ${item.lei}.`);

  const prazos = results
    .flatMap((item) => item.law.sinais?.filter((signal) => signal.tipo === 'PRAZO') || [])
    .slice(0, 4)
    .map((item) => `${item.val} em ${item.art || item.disp}`);

  const resumo =
    fundamentos.length > 0
      ? `Encontrei base legal relevante em ${results.length} lei(s), com maior aderência em ${results
          .slice(0, 2)
          .map((item) => item.law.nome)
          .join(' e ')}.`
      : 'Não encontrei dispositivos suficientes para sustentar uma resposta segura apenas com a base atual.';

  const perspectivas = {
    parecer: [
      'Enquadrar o caso com os artigos mais aderentes encontrados.',
      'Explicitar condições, exceções e remissões entre dispositivos.',
      'Marcar o que ainda depende de prova fática ou validação humana.',
    ],
    impacto: [
      'Mapear os dispositivos mais conectados às mudanças recentes.',
      'Separar efeitos diretos do texto alterado e efeitos irradiados por remissão.',
      'Confirmar o que já mudou e o que precisa de acompanhamento contínuo.',
    ],
    checklist: [
      'Validar fato gerador, regime e sujeito passivo envolvidos.',
      'Confirmar prazos, valores e percentuais capturados no texto legal.',
      'Revisar dispositivos com status revogado ou vetado antes de concluir.',
    ],
  };

  return {
    mode,
    terms,
    resumo,
    fundamentos,
    riscos,
    prazos,
    proximosPassos: perspectivas[mode] || perspectivas.parecer,
  };
}

export function buildUpdateFeed(library) {
  return library
    .flatMap((law) =>
      (law.versions || []).map((version, index, versions) => {
        const previous = versions[index - 1];
        const diff =
          version.diff ||
          (previous ? compareVersions(previous.ds || [], version.ds || []) : null);

        return {
          id: `${law.id}-${version.id}`,
          lawId: law.id,
          lei: law.nome,
          importedAt: version.importedAt,
          sourceName: version.sourceName,
          diff,
          stats: version.stats,
          isBaseline: index === 0,
        };
      }),
    )
    .sort((left, right) => new Date(right.importedAt) - new Date(left.importedAt));
}

export function buildLawImpactProfile(law) {
  const inbound = new Map();
  const outbound = new Map();

  for (const ref of law.refs || []) {
    inbound.set(ref.destino, (inbound.get(ref.destino) || 0) + 1);
    outbound.set(ref.origem, (outbound.get(ref.origem) || 0) + 1);
  }

  const criticalInbound = [...inbound.entries()]
    .map(([article, total]) => ({ article, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);

  const criticalOutbound = [...outbound.entries()]
    .map(([article, total]) => ({ article, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);

  const latestDiff = law.latestDiff || law.versions?.at(-1)?.diff || null;
  const touched = (latestDiff?.touchedArticles || []).map((article) => ({
    article,
    inboundPressure:
      inbound.get(article) || inbound.get(`Art. ${article.replace(/[^\dºo°]/g, '')}`) || 0,
  }));
  const impactScore = touched.reduce((total, item) => total + item.inboundPressure, 0);

  return {
    criticalInbound,
    criticalOutbound,
    touched,
    latestDiff,
    impactScore,
    riskLabel:
      impactScore >= 8 ? 'alto' : impactScore >= 3 ? 'moderado' : touched.length ? 'controlado' : 'baseline',
  };
}

export function buildDashboardData(library) {
  const totals = library.reduce(
    (acc, law) => {
      acc.leis += 1;
      acc.artigos += law.metrics?.artigos || law.nA || 0;
      acc.remissoes += law.metrics?.remissoes || law.refs?.length || 0;
      acc.versoes += law.versions?.length || 0;
      return acc;
    },
    { leis: 0, artigos: 0, remissoes: 0, versoes: 0 },
  );

  const feed = buildUpdateFeed(library).slice(0, 6);
  const critical = library
    .flatMap((law) =>
      (law.metrics?.artigosCriticos || []).map((item) => ({
        ...item,
        lei: law.nome,
        lawId: law.id,
      })),
    )
    .sort((left, right) => right.total - left.total)
    .slice(0, 6);

  const actions = [];
  if (!library.length) {
    actions.push('Importar a primeira lei para iniciar a base local.');
  }
  if (library.length && !library.some((law) => (law.versions?.length || 0) > 1)) {
    actions.push('Reimportar versões futuras do mesmo PDF vai construir histórico e diff local.');
  }
  if (library.length && !critical.length) {
    actions.push('Com mais dispositivos estruturados, a teia de remissões ganha leitura sistêmica.');
  }
  if (library.length) {
    actions.push('Usar o E-Consultor para gerar minutas fundamentadas a partir da própria biblioteca.');
  }

  return {
    totals,
    feed,
    critical,
    actions,
  };
}
