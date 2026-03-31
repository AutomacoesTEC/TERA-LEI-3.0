import { useMemo } from 'react';

import { buildUpdateFeed } from '../../utils/intelligence';
import EmptyState from '../ui/EmptyState';
import SectionCard from '../ui/SectionCard';

export default function Atl({ lib, onFocusLaw }) {
  const feed = useMemo(() => buildUpdateFeed(lib), [lib]);

  return (
    <div className="fade stack-lg">
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Atualizações</div>
          <h1>Linha do tempo operacional do acervo</h1>
          <p>
            Em vez de depender só de um monitor externo, o TERA-LAI 3.0 já registra localmente
            cada entrada e cada nova versão de uma lei, com contagem de alterações e artigos tocados.
          </p>
        </div>
      </div>

      <SectionCard title="Eventos Registrados" subtitle="Histórico local de baseline e novas versões.">
        {feed.length ? (
          <div className="timeline-list">
            {feed.map((event) => (
              <button
                key={event.id}
                type="button"
                className="timeline-item"
                onClick={() => onFocusLaw(event.lawId)}
              >
                <div>
                  <strong>{event.lei}</strong>
                  <span>{new Date(event.importedAt).toLocaleString('pt-BR')}</span>
                  <span>{event.sourceName}</span>
                </div>
                <div className="timeline-meta">
                  <span>{event.isBaseline ? 'baseline' : 'nova versão'}</span>
                  {event.diff ? (
                    <em>
                      {event.diff.changedCount} alterado(s), {event.diff.touchedArticles.length} artigo(s) tocado(s)
                    </em>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem eventos ainda"
            description="Assim que uma lei for importada, esta linha do tempo passa a registrar o estado inicial e as próximas versões."
          />
        )}
      </SectionCard>
    </div>
  );
}
