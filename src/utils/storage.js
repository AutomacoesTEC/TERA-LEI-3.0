const cache = new Map();

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseValue(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function LS(key, value) {
  if (!canUseStorage()) {
    return value === undefined ? null : value;
  }

  if (value === undefined) {
    if (cache.has(key)) {
      return cache.get(key);
    }

    const parsed = parseValue(window.localStorage.getItem(key));
    cache.set(key, parsed);
    return parsed;
  }

  if (value === null) {
    cache.delete(key);
    window.localStorage.removeItem(key);
    return null;
  }

  cache.set(key, value);
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildBackupPayload({ lib, study, area }) {
  return {
    version: '3.0',
    exportedAt: new Date().toISOString(),
    area,
    lib,
    study,
    notas: LS('t3-notas') || [],
    temas: LS('t3-temas') || [],
  };
}

export function applyBackupPayload(payload) {
  if (payload.lib) {
    LS('t3-lib', payload.lib);
  }

  if (payload.study) {
    LS('t3-st', payload.study);
  }

  if (payload.notas) {
    LS('t3-notas', payload.notas);
  }

  if (payload.temas) {
    LS('t3-temas', payload.temas);
  }

  if (payload.area) {
    LS('t3-area', payload.area);
  }
}

export function openJsonPicker() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}
