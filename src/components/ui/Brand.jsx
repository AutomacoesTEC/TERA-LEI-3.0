export function BrandMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      <defs>
        <linearGradient id="teraLaiGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e7c776" />
          <stop offset="100%" stopColor="#a17c2f" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="49" height="49" rx="14" fill="url(#teraLaiGradient)" />
      <path d="M14 16h24v4H28v18h-4V20H14z" fill="#161616" />
      <path d="M33 26h5l-9 12h-5z" fill="#161616" opacity="0.86" />
    </svg>
  );
}

export function BrandLockup() {
  return (
    <div className="brand-lockup">
      <BrandMark />
      <div>
        <div className="brand-title">TERA-LAI 3.0</div>
        <div className="brand-subtitle">Inteligência jurídica modular e local-first</div>
      </div>
    </div>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}
