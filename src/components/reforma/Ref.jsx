import SectionCard from '../ui/SectionCard';

const roadmap = [
  {
    fase: 'Fase 1',
    titulo: 'Base de dados e versionamento',
    descricao:
      'No TERA-LAI 3.0 começamos local-first: parser, snapshots, histórico por reimportação e diff incremental já estão na aplicação.',
  },
  {
    fase: 'Fase 2',
    titulo: 'Busca e visualização',
    descricao:
      'Busca geral, índice temático e teia de remissões formam a camada de exploração jurídica que reduz o tempo de pesquisa.',
  },
  {
    fase: 'Fase 3',
    titulo: 'Inteligência assistida',
    descricao:
      'O E-Consultor parte da biblioteca local para sugerir enquadramentos, riscos, passos seguintes e leitura de impacto legislativo.',
  },
];

const pilares = [
  'Arquitetura modular em React/Vite, sem o monólito original.',
  'Compatibilidade com chaves antigas de storage para preservar continuidade do trabalho.',
  'Leitura jurídica orientada a remissões, sinais objetivos e histórico de versões.',
  'Base preparada para posterior conexão com banco dedicado e IA remota, sem reescrever a UX.',
];

export default function Ref() {
  return (
    <div className="fade stack-lg">
      <div className="hero-card">
        <div>
          <div className="hero-kicker">Estratégia do Produto</div>
          <h1>Roteiro do TERA-LAI 3.0</h1>
          <p>
            Esta aba consolida a tradução prática da proposta de melhorias em entregas reais
            dentro da nova arquitetura. A ideia é evoluir sem abrir mão da biblioteca, busca,
            leitura estruturada e continuidade de estudo.
          </p>
        </div>
      </div>

      <div className="panel-grid">
        <SectionCard title="Roadmap em Três Fases" subtitle="Como a proposta foi convertida em trilha de implementação.">
          <div className="list-stack">
            {roadmap.map((item) => (
              <div key={item.fase} className="list-card" style={{ cursor: 'default' }}>
                <div>
                  <strong>{item.fase}</strong>
                  <span>{item.titulo}</span>
                </div>
                <div className="timeline-meta">
                  <span>{item.descricao}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Pilares já incorporados" subtitle="Decisões estruturais para não perder funcionalidade no salto de versão.">
          <ul className="insight-list">
            {pilares.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
