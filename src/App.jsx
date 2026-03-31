import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import PainelLAI from './components/dashboard/PainelLAI';
import Atl from './components/atlas/Atl';
import BuscaGeral from './components/busca/BuscaGeral';
import EConsultor from './components/consultor/EConsultor';
import Lib from './components/library/Lib';
import Reader from './components/reader/Reader';
import Ref from './components/reforma/Ref';
import { BrandLockup, ThemeToggle } from './components/ui/Brand';
import { AREAS } from './constants/areas';
import { IC } from './constants/iconPaths';
import { Ic } from './constants/icons';
import { importLawFromFile, upsertLawInLibrary } from './utils/parser';
import {
  LS,
  applyBackupPayload,
  buildBackupPayload,
  downloadJson,
  openJsonPicker,
} from './utils/storage';
import './index.css';

const defaultArea = 'tributario';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('t3-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [area, setArea] = useState(() => LS('t3-area') || defaultArea);
  const [lib, setLib] = useState(() => LS('t3-lib') || []);
  const [study, setStudy] = useState(() => LS('t3-st') || {});
  const [view, setView] = useState('painel');
  const [selectedId, setSelectedId] = useState(() => LS('t3-current-law') || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('t3-theme', theme);
  }, [theme]);

  useEffect(() => {
    LS('t3-area', area);
  }, [area]);

  useEffect(() => {
    LS('t3-current-law', selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!lib.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !lib.some((law) => law.id === selectedId)) {
      setSelectedId(lib[0].id);
    }
  }, [lib, selectedId]);

  const selectedLaw = useMemo(() => lib.find((law) => law.id === selectedId) || null, [lib, selectedId]);

  const persistLibrary = (nextLibrary) => {
    setLib(nextLibrary);
    LS('t3-lib', nextLibrary);
  };

  const persistStudy = (nextStudy) => {
    setStudy(nextStudy);
    LS('t3-st', nextStudy);
  };

  const openLaw = (lawId) => {
    setSelectedId(lawId);
    setView('reader');
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const importedLaw = await importLawFromFile(file, area);
      const result = upsertLawInLibrary(lib, importedLaw);

      startTransition(() => {
        persistLibrary(result.library);
        setSelectedId(result.selectedId);
        setView('reader');
      });
    } catch (error) {
      alert(`Erro ao processar o PDF: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const handleDeleteLaw = (lawId) => {
    const nextLibrary = lib.filter((law) => law.id !== lawId);
    persistLibrary(nextLibrary);
    if (selectedId === lawId) {
      setView('painel');
    }
  };

  const updateStudyField = (lawId, deviceId, field, value) => {
    const key = `${lawId}-${deviceId}`;
    const nextStudy = {
      ...study,
      [key]: {
        ...study[key],
        [field]: value,
        updatedAt: new Date().toISOString(),
      },
    };
    persistStudy(nextStudy);
  };

  const getStudyField = (lawId, deviceId, field) => study[`${lawId}-${deviceId}`]?.[field] || '';

  const exportBackup = () => {
    const payload = buildBackupPayload({ lib, study, area });
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadJson(`tera-lai-3-backup-${dateStamp}.json`, payload);
  };

  const restoreBackup = async () => {
    try {
      const payload = await openJsonPicker();
      if (!payload) {
        return;
      }

      applyBackupPayload(payload);
      setLib(payload.lib || []);
      setStudy(payload.study || {});
      setArea(payload.area || defaultArea);
      setSelectedId(payload.lib?.[0]?.id || null);
      setView('painel');
      alert('Backup restaurado com sucesso.');
    } catch (error) {
      alert(`Erro ao restaurar o backup: ${error.message}`);
    }
  };

  const nav = [
    { id: 'painel', icon: IC.sd, label: 'Painel LAI' },
    { id: 'library', icon: IC.bk, label: 'Biblioteca' },
    ...(selectedLaw ? [{ id: 'reader', icon: IC.ls, label: selectedLaw.nome.slice(0, 22) }] : []),
    { id: 'busca', icon: IC.sr, label: 'Busca Geral' },
    { id: 'consultor', icon: IC.br, label: 'E-Consultor' },
    { id: 'estrategia', icon: IC.rf, label: 'Estratégia' },
    { id: 'atualizacoes', icon: IC.bl, label: 'Atualizações' },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-row">
          <BrandLockup />

          <nav className="app-nav">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nb ${view === item.id ? 'on' : ''}`}
                onClick={() => setView(item.id)}
              >
                <Ic d={item.icon} s={14} c={view === item.id ? 'var(--gold)' : 'var(--text-sec)'} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="toolbar-cluster">
            <button type="button" className="toolbar-btn" onClick={exportBackup}>
              Backup
            </button>
            <button type="button" className="toolbar-btn" onClick={restoreBackup}>
              Restaurar
            </button>
            <select value={area} onChange={(event) => setArea(event.target.value)} className="toolbar-select">
              {Object.entries(AREAS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.nome}
                </option>
              ))}
            </select>
            <ThemeToggle
              theme={theme}
              onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            />
          </div>
        </div>

        <div className="app-subbar">
          <span>Reimportar um PDF com o mesmo nome cria nova versão local, com diff e histórico de impacto.</span>
          <span>{lib.length} lei(s) na biblioteca</span>
        </div>
      </header>

      <main className="app-main">
        {view === 'painel' ? <PainelLAI lib={lib} selectedLaw={selectedLaw} onFocusLaw={openLaw} /> : null}
        {view === 'library' ? (
          <Lib
            lib={lib}
            sel={selectedLaw}
            onSel={(law) => {
              setSelectedId(law.id);
              setView('reader');
            }}
            onDel={handleDeleteLaw}
            onUp={handleUpload}
            uping={uploading}
            fRef={fileRef}
          />
        ) : null}
        {view === 'reader' && selectedLaw ? (
          <Reader lei={selectedLaw} area={area} gSt={getStudyField} uSt={updateStudyField} />
        ) : null}
        {view === 'busca' ? <BuscaGeral lib={lib} /> : null}
        {view === 'consultor' ? <EConsultor lib={lib} /> : null}
        {view === 'estrategia' ? <Ref /> : null}
        {view === 'atualizacoes' ? <Atl lib={lib} onFocusLaw={openLaw} /> : null}
      </main>
    </div>
  );
}
