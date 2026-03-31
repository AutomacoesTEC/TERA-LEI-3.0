import { useMemo } from 'react';

import { buildDashboardData } from '../../utils/intelligence';
import EmptyState from '../ui/EmptyState';
import MetricCard from '../ui/MetricCard';
import SectionCard from '../ui/SectionCard';

export default function PainelLAI({ lib, selectedLaw, onFocusLaw }) {
  const dashboard = useMemo(() => buildDashboardData(lib), [lib]);

  if (!lib.length) {
    return (
      <div className="fade">
        <div className="hero-card">
          <div>
            <div className="hero-kicker">Painel Estratégico</div>
            <h1>TERA-LAI 3.0 nasce como uma bancada jurídica viva.</h1>
            <p>
              O objetivo aqui é sair do leitor de leis tradicional e chegar a uma camada de
              inteligência jurídica com histórico, remissões, impacto e consultoria assistida.
            </p>
          </div>
        </div>

        <EmptyState
          title="A biblioteca ainda está vazia"
          description="Importe um PDF para ativar parser, busca, teia de remissões, versão local e o E-Consultor contextual."
        />
      </div>
    );
  }

  return (
    <div className="fade stack-lg">
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Painel Estratégico</div>
          <h1>Visão unificada da sua base jurídica local.</h1>
          <p>
            O TERA-LAI 3.0 já está operando com biblioteca, versionamento por reimportação,
            teia de remissões e consultoria assistida por recuperação de contexto.
          </p>
        </div>
        {selectedLaw ? (
          <button type="button" className="btn-primary" onClick={() => onFocusLaw(selectedLaw.id)}>
            Abrir lei em foco
          </button>
        ) : null}
      </div>

      <div className="metrics-grid">
        <MetricCard label="Leis carregadas" value={dashboard.totals.leis} detail="Base local pronta para análise" />
        <MetricCard label="Artigos estruturados" value={dashboard.totals.artigos} detail="Parser LC 95 aplicado" tone="blue" />
        <MetricCard label="Remissões detectadas" value={dashboard.totals.remissoes} detail="Mapa sistêmico de referências" tone="green" />
        <MetricCard label="Versões registradas" value={dashboard.totals.versoes} detail="Histórico incremental por documento" />
      </div>

      <div className="panel-grid">
        <SectionCard title="Agenda Inteligente" subtitle="Próximos movimentos mais úteis com a base atual.">
          <ul className="insight-list">
            {dashboard.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Nós Jurídicos Críticos" subtitle="Artigos com maior densidade de remissões.">
          {dashboard.critical.length ? (
            <div className="list-stack">
              {dashboard.critical.map((item) => (
                <button
                  key={`${item.lawId}-${item.artigo}`}
                  type="button"
                  className="list-card"
                  onClick={() => onFocusLaw(item.lawId)}
                >
                  <strong>{item.artigo}</strong>
                  <span>{item.lei}</span>
                  <em>{item.total} conexão(ões)</em>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem nós críticos ainda"
              description="Assim que a base ganhar mais remissões, o painel destaca os dispositivos de maior impacto sistêmico."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Linha do Tempo de Versões" subtitle="Tudo o que entrou ou foi atualizado na base local.">
        <div className="timeline-list">
          {dashboard.feed.map((event) => (
            <button
              key={event.id}
              type="button"
              className="timeline-item"
              onClick={() => onFocusLaw(event.lawId)}
            >
              <div>
                <strong>{event.lei}</strong>
                <span>{new Date(event.importedAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="timeline-meta">
                <span>{event.isBaseline ? 'baseline' : 'nova versão'}</span>
                {!event.isBaseline && event.diff ? (
                  <em>
                    {event.diff.changedCount} alterado(s), {event.diff.addedCount} incluído(s),{' '}
                    {event.diff.removedCount} removido(s)
                  </em>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
