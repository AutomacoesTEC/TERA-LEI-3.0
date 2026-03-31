import { useMemo, useState } from 'react';

import { buildConsultationDraft } from '../../utils/intelligence';
import EmptyState from '../ui/EmptyState';
import SectionCard from '../ui/SectionCard';

const modes = [
  { id: 'parecer', label: 'Parecer' },
  { id: 'impacto', label: 'Impacto' },
  { id: 'checklist', label: 'Checklist' },
];

export default function EConsultorBusca({ lib }) {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState('parecer');
  const [selected, setSelected] = useState([]);
  const [answer, setAnswer] = useState(null);

  const selectedIds = selected.length ? selected : lib.map((law) => law.id);
  const availableTerms = useMemo(
    () =>
      [...new Set(lib.flatMap((law) => Object.keys(law.keywordIndex || {})))]
        .slice(0, 16),
    [lib],
  );

  const toggleLaw = (lawId) => {
    setSelected((current) =>
      current.includes(lawId) ? current.filter((item) => item !== lawId) : [...current, lawId],
    );
  };

  const runConsultation = () => {
    if (!question.trim()) {
      alert('Descreva a dúvida ou o cenário que deseja analisar.');
      return;
    }

    setAnswer(buildConsultationDraft(lib, question, selectedIds, mode));
  };

  if (!lib.length) {
    return (
      <EmptyState
        title="Sem base jurídica carregada"
        description="O E-Consultor assistido precisa da biblioteca ativa para gerar respostas fundamentadas."
      />
    );
  }

  return (
    <div className="consultor-layout">
      <SectionCard title="Cenário" subtitle="Descreva a dúvida e escolha a lente de análise.">
        <div className="stack">
          <div className="badge-row">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`stab ${mode === item.id ? 'on' : ''}`}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ex.: Operação de importação com crédito presumido e risco de não cumulatividade em cenário de revisão legislativa."
            style={{ minHeight: 180, padding: 14, borderRadius: 14, resize: 'vertical' }}
          />

          <div className="tag-check-grid">
            {lib.map((law) => {
              const checked = selected.length ? selected.includes(law.id) : true;
              return (
                <label key={law.id} className="tag-check">
                  <input type="checkbox" checked={checked} onChange={() => toggleLaw(law.id)} />
                  <span>{law.nome}</span>
                </label>
              );
            })}
          </div>

          {availableTerms.length ? (
            <div className="badge-row">
              {availableTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="timeline-chip"
                  onClick={() => setQuestion((current) => `${current}${current ? ' ' : ''}${term}`)}
                >
                  {term}
                </button>
              ))}
            </div>
          ) : null}

          <button type="button" className="btn-primary" onClick={runConsultation}>
            Gerar minuta assistida
          </button>
        </div>
      </SectionCard>

      <div className="response-panel">
        {answer ? (
          <>
            <SectionCard title="Síntese" subtitle={`Modo ${answer.mode}.`}>
              <div className="stack">
                <p className="article-text">{answer.resumo}</p>
                <div className="badge-row">
                  {answer.terms.map((term) => (
                    <span key={term} className="timeline-chip">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Fundamentos Localizados" subtitle="Dispositivos mais aderentes ao cenário informado.">
              {answer.fundamentos.length ? (
                <div className="list-stack">
                  {answer.fundamentos.map((item, index) => (
                    <div key={`${item.lei}-${item.dispositivo}-${index}`} className="list-card" style={{ cursor: 'default' }}>
                      <div>
                        <strong>{item.lei}</strong>
                        <span>
                          {item.artigo} · {item.dispositivo}
                        </span>
                        <span>{item.texto}</span>
                      </div>
                      <div className="timeline-meta">
                        <span>{item.ocorrencias} ocorrência(s)</span>
                        <em>{item.status}</em>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem fundamento suficiente" description="Refine os termos do cenário ou amplie o conjunto de leis selecionadas." />
              )}
            </SectionCard>

            <SectionCard title="Riscos e Alertas" subtitle="Elementos que merecem revisão humana antes de fechar o parecer.">
              {answer.riscos.length || answer.prazos.length ? (
                <ul className="insight-list">
                  {answer.riscos.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {answer.prazos.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Sem alertas automáticos" description="Nenhum status sensível ou prazo explícito apareceu no recorte atual." />
              )}
            </SectionCard>

            <SectionCard title="Próximos Passos" subtitle="Checklist de continuidade sugerido pelo modo escolhido.">
              <ul className="insight-list">
                {answer.proximosPassos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SectionCard>
          </>
        ) : (
          <EmptyState
            title="Consultor pronto"
            description="Descreva o caso à esquerda para gerar uma resposta assistida e fundamentada apenas na sua biblioteca local."
          />
        )}
      </div>
    </div>
  );
}
