import {
  type ChangeEvent,
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from 'react';

type AnnotationPoint = {
  x: number;
  y: number;
  text: string;
};

type Trade = {
  id: number;
  date: string;
  pair: string;
  side: 'Long' | 'Short';
  strategy: string;
  entry: string;
  exit: string;
  lotSize: number;
  rr: number;
  pnl: number;
  note: string;
  beforeImage: string;
  afterImage: string;
  replayTitle: string;
  replayPlan: string;
  replayOutcome: string;
  replayLesson: string;
  aiSummary: string;
  beforeAnnotations: AnnotationPoint[];
  afterAnnotations: AnnotationPoint[];
  tags: string[];
  setupQuality: 'A+' | 'A' | 'B' | 'C';
  mistake: string;
  isFavorite: boolean;
};

type UserAccount = {
  name: string;
  email: string;
  password: string;
};

const STORAGE_KEY = 'trading-journal-full-pro-auto-pnl-v1';

const initialTrades: Trade[] = [
  {
    id: 1,
    date: '2026-03-03',
    pair: 'BTCUSDT',
    side: 'Long',
    strategy: 'Breakout',
    entry: '84200',
    exit: '84520',
    lotSize: 1,
    rr: 2.4,
    pnl: 320,
    note: 'Strong breakout above resistance with momentum confirmation.',
    beforeImage: '',
    afterImage: '',
    replayTitle: 'BTC breakout replay',
    replayPlan:
      'Wait for breakout and retest, then enter long with confirmation.',
    replayOutcome: 'Breakout followed through and hit target cleanly.',
    replayLesson: 'Patience before entry improved the result.',
    aiSummary:
      'High-quality breakout replay. Plan, execution, and result were aligned.',
    beforeAnnotations: [],
    afterAnnotations: [],
    tags: ['Scalp', 'Crypto'],
    setupQuality: 'A',
    mistake: '',
    isFavorite: true,
  },
  {
    id: 2,
    date: '2026-03-10',
    pair: 'XAUUSD',
    side: 'Short',
    strategy: 'Reversal',
    entry: '2932',
    exit: '2914',
    lotSize: 10,
    rr: 1.8,
    pnl: 180,
    note: 'Rejection from supply zone and bearish candle confirmation.',
    beforeImage: '',
    afterImage: '',
    replayTitle: 'Gold reversal replay',
    replayPlan: 'Short after rejection from higher timeframe supply.',
    replayOutcome: 'Price rotated down as expected.',
    replayLesson: 'Higher timeframe bias helped confidence.',
    aiSummary:
      'Solid reversal trade. Bias, timing, and management were consistent with the setup.',
    beforeAnnotations: [],
    afterAnnotations: [],
    tags: ['Forex', 'Reversal'],
    setupQuality: 'A+',
    mistake: '',
    isFavorite: false,
  },
  {
    id: 3,
    date: '2026-02-18',
    pair: 'EURUSD',
    side: 'Long',
    strategy: 'Pullback',
    entry: '1.0832',
    exit: '1.08225',
    lotSize: 100000,
    rr: 0.6,
    pnl: -95,
    note: 'Entered too early before full confirmation.',
    beforeImage: '',
    afterImage: '',
    replayTitle: 'EURUSD pullback review',
    replayPlan: 'Wait for pullback confirmation before long entry.',
    replayOutcome: 'Entry was early and invalidated quickly.',
    replayLesson: 'Patience matters more than prediction.',
    aiSummary:
      'The setup concept was valid, but execution was early. Discipline and timing need work.',
    beforeAnnotations: [],
    afterAnnotations: [],
    tags: ['Forex'],
    setupQuality: 'C',
    mistake: 'Early Entry',
    isFavorite: false,
  },
];

const initialUser: UserAccount = {
  name: 'Niroj',
  email: 'niroj@example.com',
  password: 'demo123',
};

function monthKey(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

function safeDate(date: string) {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calculateMaxDrawdown(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of sorted) {
    equity += trade.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return maxDrawdown;
}

function calculatePnL(
  entry: string,
  exit: string,
  lotSize: string,
  side: 'Long' | 'Short'
) {
  const entryNum = Number(entry);
  const exitNum = Number(exit);
  const lotNum = Number(lotSize);

  if (
    !entry ||
    !exit ||
    !lotSize ||
    Number.isNaN(entryNum) ||
    Number.isNaN(exitNum) ||
    Number.isNaN(lotNum)
  ) {
    return 0;
  }

  const diff = side === 'Long' ? exitNum - entryNum : entryNum - exitNum;
  return Number((diff * lotNum).toFixed(2));
}

function buildAiSummary(form: {
  pair: string;
  side: 'Long' | 'Short';
  strategy: string;
  entry: string;
  exit: string;
  pnl: string;
  setupQuality: 'A+' | 'A' | 'B' | 'C';
  mistake: string;
  replayPlan: string;
  replayOutcome: string;
  replayLesson: string;
  beforeAnnotations: AnnotationPoint[];
  afterAnnotations: AnnotationPoint[];
}) {
  const pnl = Number(form.pnl || 0);
  const resultText = pnl > 0 ? 'winning' : pnl < 0 ? 'losing' : 'breakeven';
  const annotationCount =
    form.beforeAnnotations.length + form.afterAnnotations.length;
  const mistakeText = form.mistake ? `Key mistake: ${form.mistake}. ` : '';

  return `${form.pair || 'Trade'} ${form.side.toLowerCase()} ${
    form.strategy || 'setup'
  } review. Setup grade ${
    form.setupQuality
  }. This was a ${resultText} trade with P&L ${formatNumber(pnl)}. Entry ${
    form.entry || '-'
  }, exit ${form.exit || '-'}. ${mistakeText}${
    form.replayPlan ? `Plan: ${form.replayPlan} ` : ''
  }${form.replayOutcome ? `Outcome: ${form.replayOutcome} ` : ''}${
    form.replayLesson ? `Lesson: ${form.replayLesson} ` : ''
  }Replay used ${annotationCount} chart annotation${
    annotationCount === 1 ? '' : 's'
  }.`.trim();
}

function pnlColor(value: number) {
  if (value > 0) return '#4ade80';
  if (value < 0) return '#fb7185';
  return '#cbd5e1';
}

function qualityGradient(value: 'A+' | 'A' | 'B' | 'C') {
  if (value === 'A+') return 'linear-gradient(135deg,#22c55e,#3b82f6)';
  if (value === 'A') return 'linear-gradient(135deg,#3b82f6,#8b5cf6)';
  if (value === 'B') return 'linear-gradient(135deg,#f59e0b,#fb7185)';
  return 'linear-gradient(135deg,#ef4444,#f97316)';
}

function appBackground(): CSSProperties {
  return {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top right, rgba(236,72,153,0.20), transparent 24%), radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 22%), radial-gradient(circle at bottom left, rgba(34,197,94,0.14), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
  };
}

function cardStyle(): CSSProperties {
  return {
    background:
      'linear-gradient(180deg, rgba(30,41,59,0.88) 0%, rgba(15,23,42,0.94) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.30)',
    backdropFilter: 'blur(14px)',
  };
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(15,23,42,0.92)',
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function buttonStyle(primary = true): CSSProperties {
  return {
    padding: '12px 18px',
    borderRadius: '14px',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
    background: primary
      ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 55%, #3b82f6 100%)'
      : 'rgba(255,255,255,0.04)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: primary ? '0 10px 24px rgba(139,92,246,0.28)' : 'none',
    transition:
      'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease',
  };
}

function chipStyle(bg: string, color = 'white'): CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: '999px',
    background: bg,
    color,
    fontSize: '12px',
    fontWeight: 800,
    display: 'inline-block',
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...cardStyle(),
        padding: '18px',
        border: `1px solid ${accent}22`,
        background:
          'linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(17,24,39,0.95) 100%)',
      }}
    >
      <div style={{ color: accent, fontSize: '13px', fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontSize: '30px', fontWeight: 900, marginTop: '10px' }}>
        {value}
      </div>
    </div>
  );
}

function AnnotationImage({
  src,
  title,
  annotations,
  onAdd,
}: {
  src: string;
  title: string;
  annotations: AnnotationPoint[];
  onAdd?: (x: number, y: number) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: '8px', color: '#93c5fd', fontWeight: 700 }}>
        {title}
      </div>
      <div
        onClick={(e) => {
          if (!onAdd || !src) return;
          const rect = (
            e.currentTarget as HTMLDivElement
          ).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          onAdd(Number(x.toFixed(2)), Number(y.toFixed(2)));
        }}
        style={{
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '18px',
          overflow: 'hidden',
          minHeight: '220px',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onAdd && src ? 'crosshair' : 'default',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
      >
        {src ? (
          <>
            <img
              src={src}
              alt={title}
              style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }}
            />
            {annotations.map((point, index) => (
              <div
                key={`${title}-${index}-${point.x}-${point.y}`}
                style={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                  }}
                >
                  {index + 1}
                </div>
                {point.text && (
                  <div
                    style={{
                      background: 'rgba(2,6,23,0.88)',
                      color: '#f8fafc',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      maxWidth: '180px',
                    }}
                  >
                    {point.text}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <span style={{ color: '#94a3b8' }}>No screenshot</span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<UserAccount>(initialUser);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activePage, setActivePage] = useState<
    'dashboard' | 'journal' | 'replay' | 'rules'
  >('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [rulesText, setRulesText] = useState(
    '1. Only trade A or A+ setups.\n2. Never risk more than your defined plan.\n3. Avoid revenge trading.\n4. Wait for confirmation before entry.'
  );

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [trades, setTrades] = useState<Trade[]>(initialTrades);

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [sideFilter, setSideFilter] = useState('All');
  const [strategyFilter, setStrategyFilter] = useState('All');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [form, setForm] = useState({
    date: '',
    pair: '',
    side: 'Long' as 'Long' | 'Short',
    strategy: '',
    entry: '',
    exit: '',
    lotSize: '',
    rr: '',
    pnl: '',
    note: '',
    beforeImage: '',
    afterImage: '',
    replayTitle: '',
    replayPlan: '',
    replayOutcome: '',
    replayLesson: '',
    aiSummary: '',
    beforeAnnotations: [] as AnnotationPoint[],
    afterAnnotations: [] as AnnotationPoint[],
    tags: '',
    setupQuality: 'A' as 'A+' | 'A' | 'B' | 'C',
    mistake: '',
    isFavorite: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          user: UserAccount;
          isLoggedIn: boolean;
          trades: Trade[];
          rulesText?: string;
        };
        if (parsed.user) setUser(parsed.user);
        if (typeof parsed.isLoggedIn === 'boolean')
          setIsLoggedIn(parsed.isLoggedIn);
        if (Array.isArray(parsed.trades)) setTrades(parsed.trades);
        if (typeof parsed.rulesText === 'string')
          setRulesText(parsed.rulesText);
      } catch {
        // ignore invalid storage
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user,
        isLoggedIn,
        trades,
        rulesText,
      })
    );
  }, [user, isLoggedIn, trades, rulesText, loaded]);

  useEffect(() => {
    const autoPnL = calculatePnL(
      form.entry,
      form.exit,
      form.lotSize,
      form.side
    );

    if (form.entry && form.exit && form.lotSize) {
      setForm((prev) =>
        prev.pnl === String(autoPnL)
          ? prev
          : {
              ...prev,
              pnl: String(autoPnL),
            }
      );
    } else {
      setForm((prev) =>
        prev.pnl === ''
          ? prev
          : {
              ...prev,
              pnl: '',
            }
      );
    }
  }, [form.entry, form.exit, form.lotSize, form.side]);

  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);
    const wins = winningTrades.length;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLossAbs = Math.abs(
      losingTrades.reduce((sum, t) => sum + t.pnl, 0)
    );
    const profitFactor =
      grossLossAbs === 0 ? grossProfit : grossProfit / grossLossAbs;
    const averageWin = wins ? grossProfit / wins : 0;
    const averageLoss = losingTrades.length
      ? grossLossAbs / losingTrades.length
      : 0;
    const avgRR = totalTrades
      ? trades.reduce((sum, t) => sum + (t.rr || 0), 0) / totalTrades
      : 0;
    const maxDrawdown = calculateMaxDrawdown(trades);
    const replayCount = trades.filter(
      (t) => t.beforeImage || t.afterImage
    ).length;
    const bestTrade = [...trades].sort((a, b) => b.pnl - a.pnl)[0];
    const worstTrade = [...trades].sort((a, b) => a.pnl - b.pnl)[0];

    return {
      totalTrades,
      totalPnL,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      avgRR,
      maxDrawdown,
      replayCount,
      bestTrade,
      worstTrade,
    };
  }, [trades]);

  const monthOptions = useMemo(
    () => ['All', ...Array.from(new Set(trades.map((t) => monthKey(t.date))))],
    [trades]
  );

  const strategyOptions = useMemo(
    () => [
      'All',
      ...Array.from(new Set(trades.map((t) => t.strategy).filter(Boolean))),
    ],
    [trades]
  );

  const monthlyData = useMemo(() => {
    const grouped: Record<
      string,
      { name: string; pnl: number; trades: number; wins: number }
    > = {};

    trades.forEach((trade) => {
      const key = monthKey(trade.date);
      if (!grouped[key])
        grouped[key] = { name: key, pnl: 0, trades: 0, wins: 0 };
      grouped[key].pnl += trade.pnl;
      grouped[key].trades += 1;
      if (trade.pnl > 0) grouped[key].wins += 1;
    });

    return Object.values(grouped).map((item) => ({
      ...item,
      winRate: item.trades
        ? Number(((item.wins / item.trades) * 100).toFixed(1))
        : 0,
    }));
  }, [trades]);

  const strategyData = useMemo(() => {
    const grouped: Record<string, number> = {};
    trades.forEach((trade) => {
      grouped[trade.strategy || 'Unknown'] =
        (grouped[trade.strategy || 'Unknown'] || 0) + trade.pnl;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trades]);

  const equityData = useMemo(() => {
    let running = 0;
    return [...trades]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((trade) => {
        running += trade.pnl;
        return { date: trade.date, equity: running };
      });
  }, [trades]);

  const replayTrades = useMemo(
    () =>
      trades
        .filter((t) => t.beforeImage || t.afterImage)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [trades]
  );

  const bestStrategy = strategyData[0]?.name || '-';
  const worstStrategy = strategyData[strategyData.length - 1]?.name || '-';

  const filteredTrades = useMemo(() => {
    let result = trades.filter((trade) => {
      const q = search.toLowerCase();
      const matchSearch =
        trade.pair.toLowerCase().includes(q) ||
        trade.strategy.toLowerCase().includes(q) ||
        trade.note.toLowerCase().includes(q) ||
        trade.tags.join(' ').toLowerCase().includes(q) ||
        trade.mistake.toLowerCase().includes(q) ||
        trade.replayTitle.toLowerCase().includes(q) ||
        trade.replayLesson.toLowerCase().includes(q) ||
        trade.aiSummary.toLowerCase().includes(q);

      const matchMonth =
        monthFilter === 'All' || monthKey(trade.date) === monthFilter;
      const matchSide = sideFilter === 'All' || trade.side === sideFilter;
      const matchStrategy =
        strategyFilter === 'All' || trade.strategy === strategyFilter;
      const matchFavorite = favoriteOnly ? trade.isFavorite : true;

      const tradeDate = safeDate(trade.date);
      const fromOk = !dateFrom || (tradeDate && trade.date >= dateFrom);
      const toOk = !dateTo || (tradeDate && trade.date <= dateTo);

      return (
        matchSearch &&
        matchMonth &&
        matchSide &&
        matchStrategy &&
        matchFavorite &&
        fromOk &&
        toOk
      );
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'Newest') return b.date.localeCompare(a.date);
      if (sortBy === 'Oldest') return a.date.localeCompare(b.date);
      if (sortBy === 'Biggest Win') return b.pnl - a.pnl;
      if (sortBy === 'Biggest Loss') return a.pnl - b.pnl;
      if (sortBy === 'Pair A-Z') return a.pair.localeCompare(b.pair);
      return 0;
    });

    return result;
  }, [
    trades,
    search,
    monthFilter,
    sideFilter,
    strategyFilter,
    favoriteOnly,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const handleAuth = () => {
    if (!authForm.email || !authForm.password) return;

    if (authMode === 'signup') {
      const newUser: UserAccount = {
        name: authForm.name || 'Trader',
        email: authForm.email,
        password: authForm.password,
      };
      setUser(newUser);
      setIsLoggedIn(true);
      setAuthForm({ name: '', email: '', password: '' });
      return;
    }

    if (authForm.email === user.email && authForm.password === user.password) {
      setIsLoggedIn(true);
      setAuthForm({ name: '', email: '', password: '' });
    } else {
      alert('Invalid email or password');
    }
  };

  const handleLogout = () => setIsLoggedIn(false);

  const resetForm = () => {
    setForm({
      date: '',
      pair: '',
      side: 'Long',
      strategy: '',
      entry: '',
      exit: '',
      lotSize: '',
      rr: '',
      pnl: '',
      note: '',
      beforeImage: '',
      afterImage: '',
      replayTitle: '',
      replayPlan: '',
      replayOutcome: '',
      replayLesson: '',
      aiSummary: '',
      beforeAnnotations: [],
      afterAnnotations: [],
      tags: '',
      setupQuality: 'A',
      mistake: '',
      isFavorite: false,
    });
    setEditingTradeId(null);
  };

  const handleImageUpload =
    (field: 'beforeImage' | 'afterImage') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () =>
        setForm((prev) => ({ ...prev, [field]: String(reader.result || '') }));
      reader.readAsDataURL(file);
    };

  const autoFillReplay = () => {
    const pair = form.pair || 'Trade';
    const sideText = form.side === 'Long' ? 'Long setup' : 'Short setup';
    setForm((prev) => ({
      ...prev,
      replayTitle: prev.replayTitle || `${pair} ${sideText} replay`,
      replayPlan:
        prev.replayPlan ||
        `Before trade screenshot captured the setup idea for ${pair}. Wait for confirmation, manage risk, and follow the plan.`,
      replayOutcome:
        prev.replayOutcome ||
        `After trade screenshot shows how the trade actually played out. Review whether execution matched the original plan.`,
      replayLesson:
        prev.replayLesson ||
        `Main lesson: compare the before and after screenshots to see whether patience, entry timing, and exit discipline were respected.`,
      note:
        prev.note ||
        `Replay auto-created from before/after screenshots for ${pair}.`,
    }));
  };

  const generateAiSummary = () => {
    setForm((prev) => ({
      ...prev,
      aiSummary: buildAiSummary(prev),
    }));
  };

  const addAnnotation = (
    target: 'beforeAnnotations' | 'afterAnnotations',
    x: number,
    y: number
  ) => {
    const text = window.prompt('Annotation text', 'Mark this zone');
    if (text === null) return;
    setForm((prev) => ({
      ...prev,
      [target]: [...prev[target], { x, y, text }],
    }));
  };

  const removeAnnotation = (
    target: 'beforeAnnotations' | 'afterAnnotations',
    index: number
  ) => {
    setForm((prev) => ({
      ...prev,
      [target]: prev[target].filter((_, i) => i !== index),
    }));
  };

  const saveTrade = () => {
    if (
      !form.date ||
      !form.pair ||
      !form.strategy ||
      !form.entry ||
      !form.exit ||
      !form.lotSize
    ) {
      alert('Please fill date, pair, strategy, entry, exit, and lot size');
      return;
    }

    const preparedTrade: Trade = {
      id: editingTradeId ?? Date.now(),
      date: form.date,
      pair: form.pair.toUpperCase(),
      side: form.side,
      strategy: form.strategy,
      entry: form.entry,
      exit: form.exit,
      lotSize: Number(form.lotSize || 0),
      rr: Number(form.rr || 0),
      pnl: calculatePnL(form.entry, form.exit, form.lotSize, form.side),
      note: form.note,
      beforeImage: form.beforeImage,
      afterImage: form.afterImage,
      replayTitle: form.replayTitle,
      replayPlan: form.replayPlan,
      replayOutcome: form.replayOutcome,
      replayLesson: form.replayLesson,
      aiSummary: form.aiSummary || buildAiSummary(form),
      beforeAnnotations: form.beforeAnnotations,
      afterAnnotations: form.afterAnnotations,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      setupQuality: form.setupQuality,
      mistake: form.mistake,
      isFavorite: form.isFavorite,
    };

    if (editingTradeId) {
      setTrades((prev) =>
        prev.map((t) => (t.id === editingTradeId ? preparedTrade : t))
      );
    } else {
      setTrades((prev) => [preparedTrade, ...prev]);
    }

    resetForm();
    setShowAddModal(false);
    setActivePage('journal');
  };

  const editTrade = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setForm({
      date: trade.date,
      pair: trade.pair,
      side: trade.side,
      strategy: trade.strategy,
      entry: trade.entry,
      exit: trade.exit,
      lotSize: String(trade.lotSize ?? ''),
      rr: String(trade.rr || 0),
      pnl: String(trade.pnl),
      note: trade.note,
      beforeImage: trade.beforeImage,
      afterImage: trade.afterImage,
      replayTitle: trade.replayTitle,
      replayPlan: trade.replayPlan,
      replayOutcome: trade.replayOutcome,
      replayLesson: trade.replayLesson,
      aiSummary: trade.aiSummary,
      beforeAnnotations: trade.beforeAnnotations || [],
      afterAnnotations: trade.afterAnnotations || [],
      tags: trade.tags.join(', '),
      setupQuality: trade.setupQuality,
      mistake: trade.mistake,
      isFavorite: trade.isFavorite,
    });
    setShowAddModal(true);
  };

  const duplicateTrade = (trade: Trade) => {
    setEditingTradeId(null);
    setForm({
      date: trade.date,
      pair: trade.pair,
      side: trade.side,
      strategy: trade.strategy,
      entry: trade.entry,
      exit: trade.exit,
      lotSize: String(trade.lotSize ?? ''),
      rr: String(trade.rr || 0),
      pnl: String(trade.pnl),
      note: trade.note,
      beforeImage: trade.beforeImage,
      afterImage: trade.afterImage,
      replayTitle: trade.replayTitle,
      replayPlan: trade.replayPlan,
      replayOutcome: trade.replayOutcome,
      replayLesson: trade.replayLesson,
      aiSummary: trade.aiSummary,
      beforeAnnotations: trade.beforeAnnotations || [],
      afterAnnotations: trade.afterAnnotations || [],
      tags: trade.tags.join(', '),
      setupQuality: trade.setupQuality,
      mistake: trade.mistake,
      isFavorite: trade.isFavorite,
    });
    setShowAddModal(true);
  };

  const confirmDeleteTrade = () => {
    if (deleteTargetId === null) return;
    setTrades((prev) => prev.filter((t) => t.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const toggleFavorite = (id: number) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Pair',
      'Side',
      'Strategy',
      'Entry',
      'Exit',
      'LotSize',
      'PnL',
      'RR',
      'ReplayTitle',
      'AI Summary',
      'SetupQuality',
      'Mistake',
      'Favorite',
      'Tags',
      'Note',
    ];

    const rows = trades.map((trade) => [
      trade.date,
      trade.pair,
      trade.side,
      trade.strategy,
      trade.entry,
      trade.exit,
      trade.lotSize,
      trade.pnl,
      trade.rr,
      trade.replayTitle,
      trade.aiSummary,
      trade.setupQuality,
      trade.mistake,
      trade.isFavorite ? 'Yes' : 'No',
      trade.tags.join('|'),
      trade.note.replace(/\n/g, ' '),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trading-journal.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const mobile =
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

  if (!isLoggedIn) {
    return (
      <div
        style={{
          ...appBackground(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1.2fr 0.8fr',
            gap: '24px',
            width: '100%',
            maxWidth: '1200px',
          }}
        >
          <div style={{ alignSelf: 'center' }}>
            <div
              style={chipStyle(
                'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.25))',
                '#f5d0fe'
              )}
            >
              Full Pro Upgrade + Auto P&L
            </div>
            <h1
              style={{
                fontSize: mobile ? '42px' : '58px',
                margin: '18px 0 16px 0',
                lineHeight: 1.04,
                background:
                  'linear-gradient(135deg, #e9d5ff, #f9a8d4, #93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              A colorful, mobile-friendly, analytics-rich trading journal.
            </h1>
            <p
              style={{
                color: '#dbeafe',
                fontSize: '18px',
                maxWidth: '760px',
              }}
            >
              Track trades, auto-calculate P&L from entry, exit, side and lot
              size, compare before/after screenshots, annotate charts, review AI
              summaries, and manage everything in a premium TradingView-inspired
              layout by @Mr.Niroj
            </p>
          </div>

          <div style={{ ...cardStyle(), padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '30px', color: '#f5d0fe' }}>
              {authMode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ color: '#cbd5e1', marginBottom: '18px' }}>
              {authMode === 'login'
                ? 'Use the demo login or your own signup details.'
                : 'Create your journal account.'}
            </p>

            {authMode === 'signup' && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '8px', color: '#cbd5e1' }}>
                  Full Name
                </div>
                <input
                  style={inputStyle()}
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Your name"
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px', color: '#cbd5e1' }}>Email</div>
              <input
                style={inputStyle()}
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="name@email.com"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', color: '#cbd5e1' }}>
                Password
              </div>
              <input
                type="password"
                style={inputStyle()}
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Enter password"
              />
            </div>

            <button
              style={{ ...buttonStyle(true), width: '100%' }}
              onClick={handleAuth}
            >
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>

            <button
              style={{
                ...buttonStyle(false),
                width: '100%',
                marginTop: '14px',
              }}
              onClick={() =>
                setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'))
              }
            >
              {authMode === 'login'
                ? 'Need an account? Sign up'
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...appBackground(), padding: '18px' }}>
      <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
        {mobile ? (
          <div
            style={{
              ...cardStyle(),
              padding: '14px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                background:
                  'linear-gradient(135deg, #c084fc, #f472b6, #60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Trading Journal
            </div>
            <button
              style={buttonStyle(false)}
              onClick={() => setShowMobileMenu((v) => !v)}
            >
              {showMobileMenu ? 'Close' : 'Menu'}
            </button>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '260px 1fr',
            gap: '20px',
          }}
        >
          {(!mobile || showMobileMenu) && (
            <div
              style={{
                ...cardStyle(),
                padding: '18px',
                height: 'fit-content',
                position: mobile ? 'relative' : 'sticky',
                top: 18,
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  marginBottom: '8px',
                  background:
                    'linear-gradient(135deg, #c084fc, #f472b6, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Trading Journal
              </div>

              <div
                style={{
                  color: '#93c5fd',
                  fontSize: '14px',
                  marginBottom: '20px',
                }}
              >
                {user.name} • {user.email}
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  ['dashboard', 'Dashboard'],
                  ['journal', 'Trade Journal'],
                  ['replay', 'Trade Replay'],
                  ['rules', 'Trading Rules'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActivePage(
                        key as 'dashboard' | 'journal' | 'replay' | 'rules'
                      );
                      setShowMobileMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.10)',
                      background:
                        activePage === key
                          ? 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(236,72,153,0.24), rgba(59,130,246,0.18))'
                          : 'rgba(255,255,255,0.04)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  marginTop: '18px',
                  padding: '14px',
                  borderRadius: '18px',
                  background:
                    'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.12), rgba(59,130,246,0.12))',
                }}
              >
                <div
                  style={{
                    color: '#d8b4fe',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Replay entries
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    marginTop: '6px',
                  }}
                >
                  {stats.replayCount}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
                <button
                  style={buttonStyle(true)}
                  onClick={() => {
                    setShowAddModal(true);
                    setShowMobileMenu(false);
                  }}
                >
                  + New Trade
                </button>
                <button style={buttonStyle(false)} onClick={exportToCSV}>
                  Export CSV
                </button>
                <button style={buttonStyle(false)} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : '1.4fr 0.9fr',
                gap: '18px',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  ...cardStyle(),
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.10), rgba(59,130,246,0.10))',
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <div
                    style={chipStyle(
                      'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.25))',
                      '#f5d0fe'
                    )}
                  >
                    Full Pro Upgrade
                  </div>
                  <h1
                    style={{
                      fontSize: mobile ? '28px' : '34px',
                      margin: '10px 0 8px 0',
                      background:
                        'linear-gradient(135deg, #e9d5ff, #f9a8d4, #93c5fd)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Trading Journal Pro
                  </h1>
                  <p style={{ color: '#dbeafe', margin: 0,
                        fontSize: mobile ? "14px" : "16px",
                        lineHeight: 1.45, }}>
                    Mobile responsive layout, premium visual design, replay
                    comparisons, analytics cards, equity curve, and auto P&L
                    from entry, exit, side, and lot size.
                  </p>
                </div>
              </div>

              <div style={{ ...cardStyle(), padding: '24px' }}>
                <div
                  style={{
                    color: '#93c5fd',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Quick summary
                </div>
                <div
                  style={{ marginTop: '14px', display: 'grid', gap: '10px' }}
                >
                  <div>
                    Best strategy:{' '}
                    <strong style={{ color: '#f5d0fe' }}>{bestStrategy}</strong>
                  </div>
                  <div>
                    Worst strategy:{' '}
                    <strong style={{ color: '#fda4af' }}>
                      {worstStrategy}
                    </strong>
                  </div>
                  <div>
                    Best trade:{' '}
                    <strong style={{ color: '#86efac' }}>
                      {stats.bestTrade
                        ? `${stats.bestTrade.pair} (${formatNumber(
                            stats.bestTrade.pnl
                          )})`
                        : '-'}
                    </strong>
                  </div>
                  <div>
                    Worst trade:{' '}
                    <strong style={{ color: '#fda4af' }}>
                      {stats.worstTrade
                        ? `${stats.worstTrade.pair} (${formatNumber(
                            stats.worstTrade.pnl
                          )})`
                        : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile
                  ? '1fr 1fr'
                  : 'repeat(6, minmax(0, 1fr))',
                gap: '14px',
                marginBottom: '18px',
              }}
            >
              <StatCard
                label="Total Trades"
                value={String(stats.totalTrades)}
                accent="#c084fc"
              />
              <StatCard
                label="Replay Trades"
                value={String(stats.replayCount)}
                accent="#f472b6"
              />
              <StatCard
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                accent="#60a5fa"
              />
              <StatCard
                label="Total P&L"
                value={formatNumber(stats.totalPnL)}
                accent="#4ade80"
              />
              <StatCard
                label="Avg Win"
                value={formatNumber(stats.averageWin)}
                accent="#fbbf24"
              />
              <StatCard
                label="Avg R:R"
                value={formatNumber(stats.avgRR)}
                accent="#fb7185"
              />
            </div>

            {activePage === 'dashboard' && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                    gap: '18px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ ...cardStyle(), padding: '20px' }}>
                    <h2 style={{ marginTop: 0, color: '#f9a8d4' }}>
                      Monthly Performance
                    </h2>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {monthlyData.map((month) => (
                        <div
                          key={month.name}
                          style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '18px',
                            padding: '14px',
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(139,92,246,0.05))',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '12px',
                              marginBottom: '8px',
                            }}
                          >
                            <strong>{month.name}</strong>
                            <span
                              style={{
                                color: month.pnl >= 0 ? '#86efac' : '#fda4af',
                                fontWeight: 800,
                              }}
                            >
                              {formatNumber(month.pnl)}
                            </span>
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                            Trades: {month.trades} • Win rate: {month.winRate}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...cardStyle(), padding: '20px' }}>
                    <h2 style={{ marginTop: 0, color: '#93c5fd' }}>
                      Strategy Performance
                    </h2>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {strategyData.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: mobile
                              ? '1fr'
                              : '180px 1fr 110px',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <div>{item.name}</div>
                          <div
                            style={{
                              height: '12px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.abs(item.value)
                                )}%`,
                                height: '100%',
                                background:
                                  item.value >= 0
                                    ? 'linear-gradient(90deg, #22c55e, #60a5fa)'
                                    : 'linear-gradient(90deg, #ef4444, #f97316)',
                              }}
                            />
                          </div>
                          <div
                            style={{
                              textAlign: mobile ? 'left' : 'right',
                              color: pnlColor(item.value),
                              fontWeight: 800,
                            }}
                          >
                            {formatNumber(item.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    ...cardStyle(),
                    padding: '20px',
                    marginBottom: '18px',
                  }}
                >
                  <h2 style={{ marginTop: 0, color: '#fcd34d' }}>
                    Equity Curve
                  </h2>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {equityData.length === 0 ? (
                      <div style={{ color: '#94a3b8' }}>No trades yet.</div>
                    ) : (
                      equityData.map((item, index) => {
                        const totalAbs = Math.max(
                          1,
                          Math.abs(equityData[equityData.length - 1].equity)
                        );

                        return (
                          <div
                            key={`${item.date}-${index}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: mobile
                                ? '1fr'
                                : '120px 1fr 120px',
                              gap: '12px',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ color: '#cbd5e1' }}>{item.date}</div>
                            <div
                              style={{
                                height: '12px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '999px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      8,
                                      (Math.abs(item.equity) / totalAbs) * 100
                                    )
                                  )}%`,
                                  height: '100%',
                                  background:
                                    item.equity >= 0
                                      ? 'linear-gradient(90deg, #8b5cf6, #22c55e)'
                                      : 'linear-gradient(90deg, #ef4444, #f97316)',
                                }}
                              />
                            </div>
                            <div
                              style={{
                                color: item.equity >= 0 ? '#86efac' : '#fda4af',
                                fontWeight: 800,
                                textAlign: mobile ? 'left' : 'right',
                              }}
                            >
                              {formatNumber(item.equity)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            {activePage === 'replay' && (
              <div style={{ ...cardStyle(), padding: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '18px',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, color: '#f9a8d4' }}>
                      Trade Replay
                    </h2>
                    <p style={{ color: '#cbd5e1', marginBottom: 0 }}>
                      Compare screenshots, annotations, plan, outcome, and AI
                      summary.
                    </p>
                  </div>
                  <button
                    style={buttonStyle(true)}
                    onClick={() => setShowAddModal(true)}
                  >
                    + New Replay Trade
                  </button>
                </div>

                {replayTrades.length === 0 ? (
                  <div
                    style={{
                      padding: '28px',
                      textAlign: 'center',
                      color: '#cbd5e1',
                      border: '1px dashed rgba(255,255,255,0.18)',
                      borderRadius: '18px',
                    }}
                  >
                    No replay trades yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '18px' }}>
                    {replayTrades.map((trade) => (
                      <div
                        key={trade.id}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '20px',
                          background:
                            'linear-gradient(180deg, rgba(2,6,23,0.80), rgba(15,23,42,0.75))',
                          padding: '18px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginBottom: '14px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '22px', fontWeight: 900 }}>
                              {trade.replayTitle || `${trade.pair} replay`}
                            </div>
                            <div style={{ color: '#cbd5e1', marginTop: '4px' }}>
                              {trade.pair} • {trade.side} • {trade.strategy} •{' '}
                              {trade.date}
                            </div>
                          </div>
                          <div
                            style={{
                              color: pnlColor(trade.pnl),
                              fontWeight: 900,
                            }}
                          >
                            P&L {formatNumber(trade.pnl)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                            gap: '14px',
                            marginBottom: '14px',
                          }}
                        >
                          <AnnotationImage
                            src={trade.beforeImage}
                            title="Before Trade"
                            annotations={trade.beforeAnnotations || []}
                          />
                          <AnnotationImage
                            src={trade.afterImage}
                            title="After Trade"
                            annotations={trade.afterAnnotations || []}
                          />
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                            gap: '14px',
                            marginBottom: '14px',
                          }}
                        >
                          <div
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: '16px',
                              padding: '14px',
                            }}
                          >
                            <div
                              style={{
                                color: '#93c5fd',
                                marginBottom: '8px',
                                fontWeight: 800,
                              }}
                            >
                              Plan
                            </div>
                            <div style={{ color: '#e2e8f0' }}>
                              {trade.replayPlan || 'No replay plan added.'}
                            </div>
                          </div>

                          <div
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: '16px',
                              padding: '14px',
                            }}
                          >
                            <div
                              style={{
                                color: '#f9a8d4',
                                marginBottom: '8px',
                                fontWeight: 800,
                              }}
                            >
                              Outcome
                            </div>
                            <div style={{ color: '#e2e8f0' }}>
                              {trade.replayOutcome ||
                                'No replay outcome added.'}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(236,72,153,0.14))',
                            border: '1px solid rgba(236,72,153,0.18)',
                            borderRadius: '16px',
                            padding: '14px',
                            marginBottom: '14px',
                          }}
                        >
                          <div
                            style={{
                              color: '#f5d0fe',
                              marginBottom: '8px',
                              fontWeight: 800,
                            }}
                          >
                            AI Summary
                          </div>
                          <div style={{ color: '#fae8ff' }}>
                            {trade.aiSummary || 'No AI summary generated yet.'}
                          </div>
                        </div>

                        <div
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '16px',
                            padding: '14px',
                          }}
                        >
                          <div
                            style={{
                              color: '#fcd34d',
                              marginBottom: '8px',
                              fontWeight: 800,
                            }}
                          >
                            Lesson
                          </div>
                          <div style={{ color: '#e2e8f0' }}>
                            {trade.replayLesson || 'No replay lesson added.'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePage === 'rules' && (
              <div style={{ ...cardStyle(), padding: '20px' }}>
                <h2 style={{ marginTop: 0, color: '#fcd34d' }}>
                  Trading Rules
                </h2>
                <textarea
                  style={{
                    ...inputStyle(),
                    minHeight: '260px',
                    resize: 'vertical',
                  }}
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                />
              </div>
            )}

            {activePage === 'journal' && (
              <div style={{ ...cardStyle(), padding: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '18px',
                  }}
                >
                  <h2 style={{ margin: 0, color: '#93c5fd' }}>Trade Journal</h2>
                  <button
                    style={buttonStyle(true)}
                    onClick={() => setShowAddModal(true)}
                  >
                    + Add Trade
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: mobile
                      ? '1fr 1fr'
                      : '1.2fr 150px 170px 170px 170px 150px 150px 130px',
                    gap: '10px',
                    marginBottom: '18px',
                  }}
                >
                  <input
                    style={inputStyle()}
                    placeholder="Search pair, strategy, replay, summary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    style={inputStyle()}
                    value={sideFilter}
                    onChange={(e) => setSideFilter(e.target.value)}
                  >
                    <option value="All">All sides</option>
                    <option value="Long">Long</option>
                    <option value="Short">Short</option>
                  </select>
                  <select
                    style={inputStyle()}
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    style={inputStyle()}
                    value={strategyFilter}
                    onChange={(e) => setStrategyFilter(e.target.value)}
                  >
                    {strategyOptions.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    style={inputStyle()}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <input
                    type="date"
                    style={inputStyle()}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                  <select
                    style={inputStyle()}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {[
                      'Newest',
                      'Oldest',
                      'Biggest Win',
                      'Biggest Loss',
                      'Pair A-Z',
                    ].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <label
                    style={{
                      ...inputStyle(),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={favoriteOnly}
                      onChange={(e) => setFavoriteOnly(e.target.checked)}
                    />
                    Favorites
                  </label>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {filteredTrades.map((trade) => (
                    <div
                      key={trade.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        background:
                          'linear-gradient(180deg, rgba(2,6,23,0.80), rgba(15,23,42,0.75))',
                        padding: '18px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '16px',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '10px',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              marginBottom: '12px',
                            }}
                          >
                            <div style={{ fontSize: '22px', fontWeight: 900 }}>
                              {trade.isFavorite ? '★ ' : ''}
                              {trade.pair}
                            </div>
                            <span
                              style={chipStyle(
                                trade.side === 'Long'
                                  ? 'rgba(34,197,94,0.18)'
                                  : 'rgba(239,68,68,0.18)',
                                trade.side === 'Long' ? '#bbf7d0' : '#fecaca'
                              )}
                            >
                              {trade.side}
                            </span>
                            <span
                              style={chipStyle(
                                'rgba(139,92,246,0.18)',
                                '#e9d5ff'
                              )}
                            >
                              {trade.strategy}
                            </span>
                            <span
                              style={chipStyle(
                                'rgba(59,130,246,0.16)',
                                '#dbeafe'
                              )}
                            >
                              {trade.date}
                            </span>
                            <span
                              style={chipStyle(
                                qualityGradient(trade.setupQuality),
                                'white'
                              )}
                            >
                              Setup {trade.setupQuality}
                            </span>
                            <span
                              style={{
                                ...chipStyle('transparent'),
                                color: pnlColor(trade.pnl),
                                border: `1px solid ${pnlColor(trade.pnl)}`,
                              }}
                            >
                              P&L {formatNumber(trade.pnl)}
                            </span>
                            <span
                              style={chipStyle(
                                'rgba(245,158,11,0.18)',
                                '#fde68a'
                              )}
                            >
                              R:R {formatNumber(trade.rr || 0)}
                            </span>
                            <span
                              style={chipStyle(
                                'rgba(255,255,255,0.08)',
                                '#e2e8f0'
                              )}
                            >
                              Lot {trade.lotSize}
                            </span>
                            {(trade.beforeImage || trade.afterImage) && (
                              <span
                                style={chipStyle(
                                  'rgba(34,197,94,0.18)',
                                  '#bbf7d0'
                                )}
                              >
                                Replay Ready
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              padding: '14px',
                              borderRadius: '16px',
                              background: 'rgba(255,255,255,0.04)',
                              color: '#cbd5e1',
                              marginBottom: '12px',
                            }}
                          >
                            {trade.note || 'No notes added.'}
                          </div>

                          {trade.aiSummary && (
                            <div
                              style={{
                                background:
                                  'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(236,72,153,0.14))',
                                border: '1px solid rgba(236,72,153,0.18)',
                                borderRadius: '16px',
                                padding: '14px',
                              }}
                            >
                              <div
                                style={{
                                  color: '#f5d0fe',
                                  marginBottom: '8px',
                                  fontWeight: 800,
                                }}
                              >
                                AI Summary
                              </div>
                              <div style={{ color: '#fae8ff' }}>
                                {trade.aiSummary}
                              </div>
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gap: '10px',
                            minWidth: '120px',
                          }}
                        >
                          <button
                            style={buttonStyle(false)}
                            onClick={() => toggleFavorite(trade.id)}
                          >
                            {trade.isFavorite ? 'Unstar' : 'Star'}
                          </button>
                          <button
                            style={buttonStyle(false)}
                            onClick={() => editTrade(trade)}
                          >
                            Edit
                          </button>
                          <button
                            style={buttonStyle(false)}
                            onClick={() => duplicateTrade(trade)}
                          >
                            Duplicate
                          </button>
                          <button
                            style={{
                              ...buttonStyle(false),
                              border: '1px solid rgba(239,68,68,0.25)',
                              color: '#fecaca',
                            }}
                            onClick={() => setDeleteTargetId(trade.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredTrades.length === 0 && (
                    <div
                      style={{
                        padding: '24px',
                        borderRadius: '18px',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        color: '#cbd5e1',
                        textAlign: 'center',
                      }}
                    >
                      No trades found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div
          onClick={() => {
            setShowAddModal(false);
            resetForm();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...cardStyle(),
              width: '100%',
              maxWidth: '1120px',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <h2 style={{ margin: 0, color: '#f5d0fe' }}>
                {editingTradeId ? 'Edit Trade' : 'Add New Trade'}
              </h2>
              <button
                style={buttonStyle(false)}
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : '1fr 1fr 1fr',
                gap: '12px',
              }}
            >
              <input
                type="date"
                style={inputStyle()}
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
              <input
                style={inputStyle()}
                placeholder="Pair / Symbol"
                value={form.pair}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pair: e.target.value }))
                }
              />
              <select
                style={inputStyle()}
                value={form.side}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    side: e.target.value as 'Long' | 'Short',
                  }))
                }
              >
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>

              <input
                style={inputStyle()}
                placeholder="Strategy"
                value={form.strategy}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, strategy: e.target.value }))
                }
              />
              <input
                style={inputStyle()}
                placeholder="Entry"
                value={form.entry}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, entry: e.target.value }))
                }
              />
              <input
                style={inputStyle()}
                placeholder="Exit"
                value={form.exit}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, exit: e.target.value }))
                }
              />

              <input
                style={inputStyle()}
                placeholder="Lot Size"
                value={form.lotSize}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lotSize: e.target.value }))
                }
              />
              <input
                style={inputStyle()}
                placeholder="Risk:Reward"
                value={form.rr}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, rr: e.target.value }))
                }
              />
              <select
                style={inputStyle()}
                value={form.setupQuality}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    setupQuality: e.target.value as 'A+' | 'A' | 'B' | 'C',
                  }))
                }
              >
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            <div
              style={{
                marginTop: '12px',
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : '1fr 1fr 1fr',
                gap: '12px',
              }}
            >
              <input
                style={{
                  ...inputStyle(),
                  background: 'rgba(30,41,59,0.92)',
                  color: '#86efac',
                  fontWeight: 800,
                }}
                placeholder="P&L (auto)"
                value={form.pnl}
                readOnly
              />
              <input
                style={inputStyle()}
                placeholder="Mistake"
                value={form.mistake}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mistake: e.target.value }))
                }
              />
              <input
                style={inputStyle()}
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tags: e.target.value }))
                }
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <label
                style={{
                  ...inputStyle(),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isFavorite}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isFavorite: e.target.checked,
                    }))
                  }
                />
                Mark as favorite trade
              </label>
            </div>

            <div style={{ marginTop: '12px' }}>
              <textarea
                style={{
                  ...inputStyle(),
                  minHeight: '90px',
                  resize: 'vertical',
                }}
                placeholder="Trade notes"
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>

            <div
              style={{
                marginTop: '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '16px',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(139,92,246,0.04), rgba(236,72,153,0.03))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 900,
                      color: '#f5d0fe',
                    }}
                  >
                    Before / After Replay
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                    Upload screenshots, add annotation markers, create replay
                    notes, and generate AI summary.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button style={buttonStyle(false)} onClick={autoFillReplay}>
                    Auto-create replay notes
                  </button>
                  <button
                    style={buttonStyle(false)}
                    onClick={generateAiSummary}
                  >
                    Generate AI summary
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                  gap: '14px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div
                    style={{
                      marginBottom: '8px',
                      color: '#93c5fd',
                      fontWeight: 700,
                    }}
                  >
                    Before screenshot
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('beforeImage')}
                  />
                </div>
                <div>
                  <div
                    style={{
                      marginBottom: '8px',
                      color: '#f9a8d4',
                      fontWeight: 700,
                    }}
                  >
                    After screenshot
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('afterImage')}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                  gap: '14px',
                  marginBottom: '14px',
                }}
              >
                <AnnotationImage
                  src={form.beforeImage}
                  title="Before Trade — click image to add marker"
                  annotations={form.beforeAnnotations}
                  onAdd={(x, y) => addAnnotation('beforeAnnotations', x, y)}
                />
                <AnnotationImage
                  src={form.afterImage}
                  title="After Trade — click image to add marker"
                  annotations={form.afterAnnotations}
                  onAdd={(x, y) => addAnnotation('afterAnnotations', x, y)}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                  gap: '14px',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '16px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      color: '#93c5fd',
                      marginBottom: '10px',
                      fontWeight: 800,
                    }}
                  >
                    Before annotations
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {form.beforeAnnotations.length === 0 && (
                      <div style={{ color: '#94a3b8' }}>No markers yet.</div>
                    )}
                    {form.beforeAnnotations.map((item, index) => (
                      <div
                        key={`before-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '10px',
                          alignItems: 'center',
                          background: 'rgba(2,6,23,0.55)',
                          borderRadius: '10px',
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
                          {index + 1}. {item.text || 'Untitled marker'}
                        </div>
                        <button
                          style={{ ...buttonStyle(false), padding: '6px 10px' }}
                          onClick={() =>
                            removeAnnotation('beforeAnnotations', index)
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '16px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      color: '#f9a8d4',
                      marginBottom: '10px',
                      fontWeight: 800,
                    }}
                  >
                    After annotations
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {form.afterAnnotations.length === 0 && (
                      <div style={{ color: '#94a3b8' }}>No markers yet.</div>
                    )}
                    {form.afterAnnotations.map((item, index) => (
                      <div
                        key={`after-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '10px',
                          alignItems: 'center',
                          background: 'rgba(2,6,23,0.55)',
                          borderRadius: '10px',
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
                          {index + 1}. {item.text || 'Untitled marker'}
                        </div>
                        <button
                          style={{ ...buttonStyle(false), padding: '6px 10px' }}
                          onClick={() =>
                            removeAnnotation('afterAnnotations', index)
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '12px',
                }}
              >
                <input
                  style={inputStyle()}
                  placeholder="Replay title"
                  value={form.replayTitle}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      replayTitle: e.target.value,
                    }))
                  }
                />
                <textarea
                  style={{
                    ...inputStyle(),
                    minHeight: '90px',
                    resize: 'vertical',
                  }}
                  placeholder="Original trade plan"
                  value={form.replayPlan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, replayPlan: e.target.value }))
                  }
                />
                <textarea
                  style={{
                    ...inputStyle(),
                    minHeight: '90px',
                    resize: 'vertical',
                  }}
                  placeholder="What actually happened"
                  value={form.replayOutcome}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      replayOutcome: e.target.value,
                    }))
                  }
                />
                <textarea
                  style={{
                    ...inputStyle(),
                    minHeight: '90px',
                    resize: 'vertical',
                  }}
                  placeholder="Lesson learned"
                  value={form.replayLesson}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      replayLesson: e.target.value,
                    }))
                  }
                />
                <textarea
                  style={{
                    ...inputStyle(),
                    minHeight: '100px',
                    resize: 'vertical',
                    border: '1px solid rgba(236,72,153,0.18)',
                    background:
                      'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))',
                  }}
                  placeholder="AI summary"
                  value={form.aiSummary}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, aiSummary: e.target.value }))
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '18px',
                flexWrap: 'wrap',
              }}
            >
              <button
                style={buttonStyle(false)}
                onClick={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                Cancel
              </button>
              <button style={buttonStyle(true)} onClick={saveTrade}>
                {editingTradeId ? 'Update Trade' : 'Save Trade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              ...cardStyle(),
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#f5d0fe' }}>
              Delete this trade?
            </h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                style={buttonStyle(false)}
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...buttonStyle(true),
                  background: 'linear-gradient(135deg, #dc2626, #fb7185)',
                }}
                onClick={confirmDeleteTrade}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
