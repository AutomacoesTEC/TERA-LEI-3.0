export const Ic = ({ d, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const Sp = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--gold)"
    strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
  </svg>
);
