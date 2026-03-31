import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3';
import { useDeferredValue, useMemo, useState } from 'react';

import { AREAS } from '../../constants/areas';
import { buildLawImpactProfile } from '../../utils/intelligence';
import { buildArticleBlocks, compareVersions } from '../../utils/parser';
import { normalizeSearch } from '../../utils/search';
import EmptyState from '../ui/EmptyState';
import MetricCard from '../ui/MetricCard';
import SectionCard from '../ui/SectionCard';

const tabs = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'artigos', label: 'Artigos' },
  { id: 'texto', label: 'Texto Estruturado' },
  { id: 'teia', label: 'Teia' },
  { id: 'versoes', label: 'Versões' },
];

function createGraphData(lei) {
  const width = 780;
  const height = 460;
  const refs = (lei.refs || []).slice(0, 140);
  const degree = new Map();

  for (const ref of refs) {
    degree.set(ref.origem, (degree.get(ref.origem) || 0) + 1);
    degree.set(ref.destino, (degree.get(ref.destino) || 0) + 1);
  }

  const ids = [...new Set(refs.flatMap((ref) => [ref.origem, ref.destino]))];
  const nodes = ids.map((id) => ({
    id,
    radius: 12 + Math.min((degree.get(id) || 0) * 2.2, 16),
  }));
  const links = refs.map((ref) => ({ source: ref.origem, target: ref.destino, ctx: ref.ctx }));

  if (!nodes.length) {
    return { width, height, nodes: [], links: [] };
  }

  const simulation = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-220))
    .force('center', forceCenter(width / 2, height / 2))
    .force('link', forceLink(links).id((item) => item.id).distance(92))
    .force('collide', forceCollide().radius((item) => item.radius + 8))
    .stop();

  for (let i = 0; i < 180; i += 1) {
    simulation.tick();
  }

  return { width, height, nodes, links };
}

function StatusPill({ status }) {
  const palette =
    status === 'revogado'
      ? { bg: 'rgba(231, 76, 60, 0.12)', color: '#e74c3c' }
      : status === 'vetado'
        ? { bg: 'rgba(230, 126, 34, 0.14)', color: '#e67e22' }
        : { bg: 'rgba(46, 204, 113, 0.14)', color: '#2ecc71' };

  return (
    <span className="badge" style={{ background: palette.bg, color: palette.color }}>
      {status}
    </span>
  );
}

function SignalCluster({ title, items, emptyLabel }) {
  return (
    <SectionCard title={title} subtitle={`${items.length} ocorrência(s) capturada(s).`}>
      {items.length ? (
        <div className="list-stack">
          {items.slice(0, 8).map((item) => (
            <div key={`${item.disp}-${item.val}`} className="list-card" style={{ cursor: 'default' }}>
              <div>
                <strong>{item.val}</strong>
                <span>{item.art || item.disp}</span>
              </div>
              <div className="timeline-meta">
                <span>{item.tipo}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={emptyLabel} description="Nenhum sinal objetivo foi extraído desse conjunto ainda." />
      )}
    </SectionCard>
  );
}

export default function Reader({ lei, area, gSt, uSt }) {
  const [tab, setTab] = useState('visao');
  const [term, setTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const deferredTerm = useDeferredValue(term);

  const areaLabel = AREAS[area]?.nome || area;
  const articleBlocks = useMemo(() => buildArticleBlocks(lei.ds), [lei.ds]);
  const graph = useMemo(() => createGraphData(lei), [lei]);
  const impact = useMemo(() => buildLawImpactProfile(lei), [lei]);
  const versions = lei.versions || [];
  const lastDiff =
    lei.latestDiff ||
    versions.at(-1)?.diff ||
    (versions.length > 1 ? compareVersions(versions.at(-2)?.ds, versions.at(-1)?.ds) : null);

  const filteredArticles = useMemo(() => {
    if (!deferredTerm.trim()) {
      return articleBlocks;
    }

    const normalized = normalizeSearch(deferredTerm);
    return articleBlocks.filter((block) =>
      normalizeSearch(`${block.heading} ${block.text} ${block.devices.map((item) => item.txt).join(' ')}`).includes(normalized),
    );
  }, [articleBlocks, deferredTerm]);

  const filteredDevices = useMemo(() => {
    if (!deferredTerm.trim()) {
      return lei.ds;
    }

    const normalized = normalizeSearch(deferredTerm);
    return lei.ds.filter((item) =>
      normalizeSearch(`${item.tipo} ${item.id} ${item.rub} ${item.txt}`).includes(normalized),
    );
  }, [deferredTerm, lei.ds]);

  const selectedGraphRelations = useMemo(() => {
    if (!selectedNode) {
      return [];
    }

    return (lei.refs || [])
      .filter((ref) => ref.origem === selectedNode || ref.destino === selectedNode)
      .slice(0, 12);
  }, [lei.refs, selectedNode]);

  return (
    <div className="fade stack-lg">
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Lei em Análise</div>
          <h1>{lei.nome}</h1>
          <p>
            Biblioteca ativa em <strong>{areaLabel}</strong>, com {lei.metrics?.artigos || lei.nA} artigos
            estruturados, {lei.metrics?.remissoes || lei.refs?.length || 0} remissões e {versions.length} versão(ões)
            registradas.
          </p>
        </div>
        <div className="badge-row">
          <span className="pill">{lei.data}</span>
          <span className="pill">{versions.length} versão(ões)</span>
        </div>
      </div>

      <div className="reader-tab-grid">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`stab ${tab === item.id ? 'on' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'visao' ? (
        <div className="stack-lg">
          <div className="metrics-grid">
            <MetricCard label="Artigos" value={lei.metrics?.artigos || lei.nA} detail="Estrutura normativa" />
            <MetricCard label="Dispositivos" value={lei.metrics?.dispositivos || lei.nD} detail="Itens, parágrafos e incisos" tone="blue" />
            <MetricCard label="Remissões" value={lei.metrics?.remissoes || lei.refs?.length || 0} detail="Conexões internas detectadas" tone="green" />
            <MetricCard label="Alterações" value={lei.metrics?.alterados || 0} detail="Marcas de redação, inclusão ou revogação" />
          </div>

          <div className="split-grid">
            <SectionCard title="Impacto Legislativo Local" subtitle="Leitura rápida das mudanças mais sensíveis.">
              {lastDiff ? (
                <div className="stack">
                  <div className="badge-row">
                    <span className="pill">{lastDiff.changedCount} alterado(s)</span>
                    <span className="pill">{lastDiff.addedCount} incluído(s)</span>
                    <span className="pill">{lastDiff.removedCount} removido(s)</span>
                  </div>
                  <div className="badge-row">
                    {impact.touched.length ? (
                      impact.touched.slice(0, 8).map((item) => (
                        <span key={item.article} className="timeline-chip">
                          {item.article} · pressão {item.inboundPressure}
                        </span>
                      ))
                    ) : (
                      <span className="timeline-chip">Sem pressão sistêmica relevante até aqui</span>
                    )}
                  </div>
                  {lastDiff.sampleChanges.length ? (
                    <ul className="insight-list">
                      {lastDiff.sampleChanges.map((item, index) => (
                        <li key={`${item.label}-${index}`}>
                          <strong>{item.label}</strong> foi {item.kind} em {item.article}.
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="Baseline criada"
                  description="A próxima importação desse mesmo PDF criará automaticamente diff, linha do tempo e impacto incremental."
                />
              )}
            </SectionCard>

            <SectionCard title="Nós Mais Referenciados" subtitle={`Risco ${impact.riskLabel} de propagação por remissão.`}>
              {impact.criticalInbound.length ? (
                <div className="list-stack">
                  {impact.criticalInbound.map((item) => (
                    <div key={item.article} className="list-card" style={{ cursor: 'default' }}>
                      <div>
                        <strong>{item.article}</strong>
                        <span>Artigo alvo</span>
                      </div>
                      <div className="timeline-meta">
                        <span>{item.total} entrada(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Teia ainda discreta"
                  description="Esta lei ainda não apresentou densidade alta de remissões internas."
                />
              )}
            </SectionCard>
          </div>

          <div className="panel-grid">
            <SignalCluster title="Prazos Sensíveis" items={lei.metrics?.prazos || []} emptyLabel="Nenhum prazo identificado" />
            <SignalCluster title="Valores e Percentuais" items={[...(lei.metrics?.valores || []), ...(lei.metrics?.percentuais || [])]} emptyLabel="Nenhum valor ou percentual identificado" />
          </div>

          <SectionCard title="Índice Temático" subtitle="Palavras estruturantes detectadas dentro da área selecionada.">
            {Object.keys(lei.keywordIndex || {}).length ? (
              <div className="badge-row">
                {Object.entries(lei.keywordIndex)
                  .slice(0, 20)
                  .map(([key, articles]) => (
                    <span key={key} className="timeline-chip">
                      {key} · {articles.length} art.
                    </span>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="Índice ainda enxuto"
                description="Isso costuma acontecer quando a lei não concentra vocabulário típico da área selecionada."
              />
            )}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'artigos' ? (
        <div className="stack-lg">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Filtrar artigos por tema, número ou trecho..."
            className="reader-search"
          />

          {filteredArticles.length ? (
            <div className="article-list">
              {filteredArticles.map((block) => (
                <article key={block.id} className="article-card">
                  <div className="article-head">
                    <div>
                      <h3>{block.heading}</h3>
                      {block.hierarchy ? <div className="article-meta">{block.hierarchy}</div> : null}
                    </div>
                    <div className="badge-row">
                      <StatusPill status={block.status || 'vigente'} />
                      {block.alteracao ? <span className="timeline-chip">alterado</span> : null}
                    </div>
                  </div>

                  <div className="article-text">{block.text}</div>

                  {block.devices.length > 1 ? (
                    <div className="stack" style={{ marginTop: 14 }}>
                      {block.devices.slice(1).map((item) => (
                        <div key={`${block.id}-${item.id}`} className="device-card">
                          <strong>{item.id}</strong>
                          <div className="article-text">{item.txt}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="study-grid">
                    <textarea
                      value={gSt(lei.id, block.id, 'insight')}
                      onChange={(event) => uSt(lei.id, block.id, 'insight', event.target.value)}
                      placeholder="Leitura estratégica do artigo"
                    />
                    <textarea
                      value={gSt(lei.id, block.id, 'risco')}
                      onChange={(event) => uSt(lei.id, block.id, 'risco', event.target.value)}
                      placeholder="Riscos, exceções ou dúvidas"
                    />
                    <textarea
                      value={gSt(lei.id, block.id, 'acao')}
                      onChange={(event) => uSt(lei.id, block.id, 'acao', event.target.value)}
                      placeholder="Próxima ação ou parecer"
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum artigo encontrado" description="Ajuste o filtro para reencontrar o conteúdo desejado." />
          )}
        </div>
      ) : null}

      {tab === 'texto' ? (
        <div className="stack-lg">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar em todo o texto estruturado..."
            className="reader-search"
          />

          <div className="device-list">
            {filteredDevices.map((item, index) => (
              <div key={`${item.tipo}-${item.id}-${index}`} className="device-card">
                <div className="article-head">
                  <div>
                    <strong>{item.tipo}</strong>
                    {item.id ? <div className="article-meta">{item.id}</div> : null}
                  </div>
                  <StatusPill status={item.status || 'vigente'} />
                </div>
                {item.rub ? <div className="article-meta" style={{ marginBottom: 8 }}>{item.rub}</div> : null}
                {item.txt ? <div className="article-text">{item.txt}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'teia' ? (
        <div className="graph-shell">
          <SectionCard title="Teia de Remissões" subtitle="Clique em um nó para inspecionar as ligações mais próximas.">
            {graph.nodes.length ? (
              <div className="graph-frame">
                <svg viewBox={`0 0 ${graph.width} ${graph.height}`} width="100%" height="100%">
                  {graph.links.map((link, index) => (
                    <line
                      key={`${link.source.id || link.source}-${link.target.id || link.target}-${index}`}
                      x1={link.source.x}
                      y1={link.source.y}
                      x2={link.target.x}
                      y2={link.target.y}
                      stroke="rgba(161, 124, 47, 0.34)"
                      strokeWidth="1.4"
                    />
                  ))}
                  {graph.nodes.map((node) => (
                    <g key={node.id} onClick={() => setSelectedNode(node.id)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={selectedNode === node.id ? 'var(--gold-bright)' : 'rgba(161, 124, 47, 0.86)'}
                      />
                      <text
                        x={node.x}
                        y={node.y + 4}
                        fontSize="10"
                        textAnchor="middle"
                        fill="#111"
                        fontWeight="700"
                      >
                        {node.id.replace('Art. ', '')}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <EmptyState title="Sem remissões suficientes" description="Esta lei ainda não apresentou referências internas em volume suficiente para o grafo." />
            )}
          </SectionCard>

          <div className="graph-legend">
            <SectionCard title="Remissões de Entrada" subtitle="Artigos mais citados dentro da lei.">
              {impact.criticalInbound.length ? (
                <div className="list-stack">
                  {impact.criticalInbound.map((item) => (
                    <button key={item.article} type="button" className="list-card" onClick={() => setSelectedNode(item.article)}>
                      <strong>{item.article}</strong>
                      <span>{item.total} referência(s) recebida(s)</span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem entradas relevantes" description="A malha de remissões ainda é enxuta nesta lei." />
              )}
            </SectionCard>

            <SectionCard title="Relações do Nó Selecionado" subtitle={selectedNode || 'Selecione um artigo no grafo.'}>
              {selectedGraphRelations.length ? (
                <div className="list-stack">
                  {selectedGraphRelations.map((ref, index) => (
                    <div key={`${ref.origem}-${ref.destino}-${index}`} className="list-card" style={{ cursor: 'default' }}>
                      <div>
                        <strong>{ref.origem}</strong>
                        <span>remete para {ref.destino}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem seleção ativa" description="Clique em qualquer nó para ver a cadeia de dependência local." />
              )}
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'versoes' ? (
        <SectionCard title="Histórico de Versões" subtitle="Cada reimportação do mesmo arquivo gera uma nova camada temporal local.">
          {versions.length ? (
            <div className="version-list">
              {[...versions].reverse().map((version) => (
                <div key={version.id} className="version-card">
                  <div className="article-head">
                    <div>
                      <strong>{version.sourceName}</strong>
                      <div className="article-meta">{new Date(version.importedAt).toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="badge-row">
                      <span className="timeline-chip">{version.stats?.artigos || 0} art.</span>
                      <span className="timeline-chip">{version.stats?.remissoes || 0} remissões</span>
                    </div>
                  </div>

                  {version.diff ? (
                    <div className="stack">
                      <div className="badge-row">
                        <span className="pill">{version.diff.changedCount} alterado(s)</span>
                        <span className="pill">{version.diff.addedCount} incluído(s)</span>
                        <span className="pill">{version.diff.removedCount} removido(s)</span>
                      </div>
                      <div className="badge-row">
                        {version.diff.touchedArticles.slice(0, 10).map((item) => (
                          <span key={item} className="timeline-chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="article-meta">Versão base da lei dentro do TERA-LAI 3.0.</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem versões registradas" description="As versões começam a ser registradas assim que a lei entra na biblioteca." />
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
