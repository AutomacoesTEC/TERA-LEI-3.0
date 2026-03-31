import { Fragment, useDeferredValue, useMemo, useState } from 'react';

import { fullTextSearch } from '../../utils/search';
import EmptyState from '../ui/EmptyState';
import SectionCard from '../ui/SectionCard';

function highlightText(text, term) {
  if (!text || !term.trim()) {
    return text;
  }

  const terms = term
    .split('+')
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);

  if (!terms.length) {
    return text;
  }

  const escaped = terms.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={`${part}-${index}`}
        style={{ background: 'rgba(212, 168, 83, 0.35)', padding: '0 1px', borderRadius: 2 }}
      >
        {part}
      </mark>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}

export default function BuscaGeral({ lib }) {
  const [filtro, setFiltro] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [selLeis, setSelLeis] = useState(() => new Set(lib.map((law) => law.id)));
  const deferredFiltro = useDeferredValue(filtro);
  const validSelected = useMemo(
    () => new Set([...selLeis].filter((id) => lib.some((law) => law.id === id))),
    [lib, selLeis],
  );
  const allSelected = lib.length > 0 && validSelected.size === lib.length;

  const toggleLei = (lawId) => {
    setSelLeis((current) => {
      const next = new Set(current);
      if (next.has(lawId)) {
        next.delete(lawId);
      } else {
        next.add(lawId);
      }
      return next;
    });
    setExpandedIdx(null);
  };

  const toggleAll = () => {
    setSelLeis(allSelected ? new Set() : new Set(lib.map((law) => law.id)));
    setExpandedIdx(null);
  };

  const resultados = useMemo(() => {
    if (!deferredFiltro || deferredFiltro.trim().length < 3) {
      return [];
    }

    const hits = [];
    for (const law of lib) {
      if (!validSelected.has(law.id)) {
        continue;
      }

      const found = fullTextSearch(law.ds, deferredFiltro);
      for (const item of found) {
        hits.push({
          ...item,
          leiId: law.id,
          leiNome: law.nome,
        });
      }
    }

    return hits;
  }, [deferredFiltro, lib, validSelected]);

  const totalOcorrencias = useMemo(
    () => resultados.reduce((total, item) => total + item.ocorrencias, 0),
    [resultados],
  );

  if (!lib.length) {
    return (
      <EmptyState
        title="Biblioteca vazia"
        description="Adicione leis primeiro para ativar a busca transversal do TERA-LAI 3.0."
      />
    );
  }

  return (
    <div className="fade stack-lg">
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Busca Geral</div>
          <h1>Pesquisa transversal no acervo jurídico</h1>
          <p>
            Use termos simples ou combine palavras com <strong>+</strong> para exigir contexto
            conjunto dentro do mesmo dispositivo.
          </p>
        </div>
      </div>

      <SectionCard title="Escopo da pesquisa" subtitle="Selecione as leis que entram no recorte atual.">
        <div className="stack">
          <label className="tag-check" style={{ width: 'fit-content' }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>{allSelected ? 'Desmarcar todas' : 'Selecionar todas'}</span>
          </label>

          <div className="tag-check-grid">
            {lib.map((law) => (
              <label key={law.id} className="tag-check">
                <input
                  type="checkbox"
                  checked={validSelected.has(law.id)}
                  onChange={() => toggleLei(law.id)}
                />
                <span>
                  {law.nome} · {law.nA} art.
                </span>
              </label>
            ))}
          </div>

          <input
            value={filtro}
            onChange={(event) => {
              setFiltro(event.target.value);
              setExpandedIdx(null);
            }}
            placeholder="Ex.: credito + presumido + importacao"
            className="reader-search"
          />

          {deferredFiltro.trim().length >= 3 ? (
            <div className="article-meta">
              {resultados.length} dispositivo(s) encontrado(s) e {totalOcorrencias} ocorrência(s).
            </div>
          ) : null}
        </div>
      </SectionCard>

      {deferredFiltro.trim().length < 3 ? (
        <EmptyState
          title="Digite ao menos 3 caracteres"
          description="A busca geral fica mais precisa quando você usa termos com densidade semântica mínima."
        />
      ) : null}

      {deferredFiltro.trim().length >= 3 && !selLeis.size ? (
        <EmptyState
          title="Nenhuma lei selecionada"
          description="Escolha pelo menos uma lei para montar o recorte da busca."
        />
      ) : null}

      {deferredFiltro.trim().length >= 3 && selLeis.size > 0 && !resultados.length ? (
        <EmptyState
          title="Sem resultados"
          description="Tente refinar os termos, trocar a combinação de leis ou remover um operador AND."
        />
      ) : null}

      {resultados.length ? (
        <SectionCard title="Resultados" subtitle="Clique em qualquer linha para expandir o texto encontrado.">
          <div style={{ maxHeight: '68vh', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 14 }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lei</th>
                  <th>Tipo</th>
                  <th>Dispositivo</th>
                  <th>Artigo</th>
                  <th>Texto</th>
                  <th>Qtd</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((item, index) => (
                  <Fragment key={`${item.leiId}-${item.id}-${index}`}>
                    <tr
                      style={{
                        opacity: item.status === 'vetado' || item.status === 'revogado' ? 0.55 : 1,
                        cursor: 'pointer',
                        background: expandedIdx === index ? 'var(--gold-subtle)' : 'inherit',
                      }}
                      onClick={() => setExpandedIdx(expandedIdx === index ? null : index)}
                    >
                      <td>{index + 1}</td>
                      <td style={{ maxWidth: 190, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.leiNome}
                      </td>
                      <td>{item.tipo}</td>
                      <td>{item.id}</td>
                      <td>{item.art}</td>
                      <td>{highlightText(`${item.txt || item.rub || ''}`.slice(0, 190), deferredFiltro)}</td>
                      <td>{item.ocorrencias}</td>
                    </tr>
                    {expandedIdx === index ? (
                      <tr>
                        <td colSpan="7" style={{ background: 'var(--bg-hover)', lineHeight: 1.7 }}>
                          {highlightText(item.txt || item.rub || '', deferredFiltro)}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
