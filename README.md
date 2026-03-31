# TERA-LAI 3.0

Nova base do TERA com arquitetura modular em React + Vite, focada em inteligência jurídica local-first.

## O que já está pronto

- Biblioteca com importação de PDFs
- Parser jurídico local para estruturar dispositivos
- Busca geral em múltiplas leis
- Leitor com visão geral, artigos, texto estruturado, teia de remissões e versões
- Histórico incremental por reimportação do mesmo PDF
- E-Consultor assistido por recuperação de contexto da própria biblioteca
- Backup e restauração compatíveis com as chaves antigas do TERA (`t3-lib`, `t3-st`, `t3-notas`, `t3-temas`)

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Direção do produto

O TERA-LAI 3.0 foi pensado para sair do monólito anterior e abrir espaço para:

- versionamento jurídico mais robusto
- busca e visualização sistêmica
- consultoria tributária assistida
- futura conexão com banco dedicado e IA remota sem reescrever a interface
