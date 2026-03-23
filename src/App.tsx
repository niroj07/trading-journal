import React, { type ChangeEvent, useEffect, useMemo, useState } from 'react';

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
  pnl: number;
  note: string;
  image: string;
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

const STORAGE_KEY = 'trading-journal-full-pro-v1';

const initialTrades: Trade[] = [
  {
    id: 1,
    date: '2026-03-03',
    pair: 'BTCUSDT',
    side: 'Long',
    strategy: 'Breakout',
    entry: '84200',
    exit: '84950',
    pnl: 320,
    note: 'Strong breakout above resistance with momentum confirmation.',
    image: '',
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
    exit: '2918',
    pnl: 180,
    note: 'Rejection from supply zone and bearish candle confirmation.',
    image: '',
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
    date: '2026-02-22',
    pair: 'EURUSD',
    side: 'Long',
    strategy: 'Pullback',
    entry: '1.0832',
    exit: '1.0810',
    pnl: -95,
    note: 'Entered too early before full confirmation.',
    image: '',
    beforeImage: '',
    afterImage: '',
    replayTitle: 'EURUSD pullback replay',
    replayPlan: 'Buy after clean pullback into support.',
    replayOutcome: 'Entry was early and price continued lower first.',
    replayLesson: 'Wait for better confirmation and avoid forcing the trade.',
    aiSummary:
      'Execution was weaker than the idea. Patience and confirmation were missing.',
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
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    value
  );
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
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
}

function buildEquityCurve(trades: Trade[]) {
  let running = 0;
  return [...trades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((trade) => {
      running += trade.pnl;
      return { date: trade.date, value: running };
    });
}

function cardStyle(): React.CSSProperties {
  return {
    background:
      'linear-gradient(180deg, rgba(30,41,59,0.88) 0%, rgba(15,23,42,0.95) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.30)',
    backdropFilter: 'blur(14px)',
    transition:
      'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
  };
}

function inputStyle(): React.CSSProperties {
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

function buttonStyle(primary = true): React.CSSProperties {
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
    transition: 'transform 140ms ease, opacity 140ms ease',
  };
}

function chipStyle(bg: string, color = 'white'): React.CSSProperties {
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

function pnlColor(value: number) {
  if (value > 0) return '#4ade80';
  if (value < 0) return '#fb7185';
  return '#cbd5e1';
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
  const mistakeText = form.mistake
    ? `Key mistake noted: ${form.mistake}. `
    : '';
  const qualityText = `Setup grade ${form.setupQuality}. `;
  const planText = form.replayPlan
    ? `Planned idea: ${form.replayPlan.trim()} `
    : '';
  const outcomeText = form.replayOutcome
    ? `Outcome: ${form.replayOutcome.trim()} `
    : '';
  const lessonText = form.replayLesson
    ? `Lesson: ${form.replayLesson.trim()} `
    : '';
  return `${form.pair || 'Trade'} ${form.side.toLowerCase()} ${
    form.strategy || 'setup'
  } review. ${qualityText}This was a ${resultText} trade with P&L ${formatNumber(
    pnl
  )}. Entry ${form.entry || '-'}, exit ${
    form.exit || '-'
  }. ${mistakeText}${planText}${outcomeText}${lessonText}Replay included ${annotationCount} chart annotation${
    annotationCount === 1 ? '' : 's'
  } across before and after screenshots.`.trim();
}

function MiniBar({
  value,
  max,
  positive,
}: {
  value: number;
  max: number;
  positive: boolean;
}) {
  const width =
    max === 0 ? 0 : Math.max(6, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div
      style={{
        height: 12,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: '100%',
          background: positive
            ? 'linear-gradient(90deg, #22c55e, #60a5fa)'
            : 'linear-gradient(90deg, #ef4444, #fb7185)',
        }}
      />
    </div>
  );
}

function EquityCurve({
  points,
}: {
  points: { date: string; value: number }[];
}) {
  if (points.length === 0)
    return <div style={{ color: '#94a3b8' }}>No data yet.</div>;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * 100;
      const y = 100 - ((p.value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div>
      <div
        style={{
          height: 240,
          borderRadius: 18,
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 14,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.8"
            points={coords}
          />
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#94a3b8',
          fontSize: 12,
          marginTop: 8,
        }}
      >
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
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
      <div style={{ marginBottom: 8, color: '#93c5fd', fontWeight: 700 }}>
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
          borderRadius: 18,
          overflow: 'hidden',
          minHeight: 220,
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onAdd && src ? 'crosshair' : 'default',
        }}
      >
        {src ? (
          <>
            <img
              src={src}
              alt={title}
              style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }}
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
                  gap: 6,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                      borderRadius: 10,
                      padding: '6px 8px',
                      fontSize: 12,
                      maxWidth: 180,
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
    'dashboard' | 'add' | 'journal' | 'rules' | 'replay'
  >('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [rulesText, setRulesText] = useState(
    '1. Only trade A or A+ setups.\n2. Never risk more than your defined plan.\n3. Avoid revenge trading.\n4. Wait for confirmation before entry.'
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    pnl: '',
    note: '',
    image: '',
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
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, isLoggedIn, trades, rulesText })
    );
  }, [user, isLoggedIn, trades, rulesText, loaded]);

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
  const replayTrades = useMemo(
    () =>
      trades
        .filter((t) => t.beforeImage || t.afterImage)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [trades]
  );
  const bestStrategy = strategyData[0]?.name || '-';
  const worstStrategy = strategyData[strategyData.length - 1]?.name || '-';
  const equityPoints = useMemo(() => buildEquityCurve(trades), [trades]);
  const biggestAbs = useMemo(
    () => Math.max(1, ...strategyData.map((s) => Math.abs(s.value))),
    [strategyData]
  );

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
      setUser({
        name: authForm.name || 'Trader',
        email: authForm.email,
        password: authForm.password,
      });
      setIsLoggedIn(true);
      setAuthForm({ name: '', email: '', password: '' });
      return;
    }
    if (authForm.email === user.email && authForm.password === user.password) {
      setIsLoggedIn(true);
      setAuthForm({ name: '', email: '', password: '' });
    } else alert('Invalid email or password');
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
      pnl: '',
      note: '',
      image: '',
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
    (field: 'image' | 'beforeImage' | 'afterImage') =>
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

  const generateAiSummary = () =>
    setForm((prev) => ({ ...prev, aiSummary: buildAiSummary(prev) }));

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
    if (!form.date || !form.pair || !form.strategy || !form.pnl) {
      alert('Please fill date, pair, strategy, and P&L');
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
      pnl: Number(form.pnl),
      note: form.note,
      image: form.image,
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
    if (editingTradeId)
      setTrades((prev) =>
        prev.map((t) => (t.id === editingTradeId ? preparedTrade : t))
      );
    else setTrades((prev) => [preparedTrade, ...prev]);
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
      pnl: String(trade.pnl),
      note: trade.note,
      image: trade.image,
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
    setActivePage('add');
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
      pnl: String(trade.pnl),
      note: trade.note,
      image: trade.image,
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
    setActivePage('add');
  };

  const confirmDeleteTrade = () => {
    if (deleteTargetId === null) return;
    setTrades((prev) => prev.filter((t) => t.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const toggleFavorite = (id: number) =>
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Pair',
      'Side',
      'Strategy',
      'Entry',
      'Exit',
      'PnL',
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
      trade.pnl,
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

  const renderSidebarButton = (
    key: 'dashboard' | 'add' | 'journal' | 'rules' | 'replay',
    label: string
  ) => (
    <button
      onClick={() => {
        setActivePage(key);
        setIsMobileMenuOpen(false);
        if (key === 'add') setShowAddModal(true);
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
  );

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top right, rgba(236,72,153,0.22), transparent 24%), radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 22%), radial-gradient(circle at bottom left, rgba(34,197,94,0.14), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: 24,
            width: '100%',
            maxWidth: 1200,
          }}
        >
          <div style={{ alignSelf: 'center' }}>
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
                fontSize: 58,
                margin: '18px 0 16px 0',
                lineHeight: 1.04,
                background:
                  'linear-gradient(135deg, #e9d5ff, #f9a8d4, #93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Mobile responsive, premium, colorful, and analytics-ready.
            </h1>
            <p style={{ color: '#dbeafe', fontSize: 18, maxWidth: 760 }}>
              {' '}
              Pro Trading Journal with replay review, annotations, AI-style
              summary, mobile menu, equity curve, analytics cards, and a
              polished SaaS-style UI by @Mr.Niroj
            </p>
          </div>
          <div style={{ ...cardStyle(), padding: 28, alignSelf: 'center' }}>
            <h2 style={{ marginTop: 0, fontSize: 30, color: '#f5d0fe' }}>
              {authMode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ color: '#cbd5e1', marginBottom: 18 }}>
              {authMode === 'login'
                ? 'Use the demo login or your own signup details.'
                : 'Create your journal account.'}
            </p>
            {authMode === 'signup' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8, color: '#cbd5e1' }}>
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
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 8, color: '#cbd5e1' }}>Email</div>
              <input
                style={inputStyle()}
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="name@email.com"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, color: '#cbd5e1' }}>Password</div>
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
              style={{ ...buttonStyle(false), width: '100%', marginTop: 14 }}
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
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top right, rgba(236,72,153,0.18), transparent 24%), radial-gradient(circle at top left, rgba(59,130,246,0.16), transparent 22%), radial-gradient(circle at bottom left, rgba(34,197,94,0.14), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: 18,
      }}
    >
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <div
          style={{
            ...cardStyle(),
            padding: 14,
            marginBottom: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              background: 'linear-gradient(135deg, #c084fc, #f472b6, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Trading Journal Pro
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: '#93c5fd', fontSize: 14 }}>{user.name}</span>
            <button
              style={buttonStyle(false)}
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              Menu
            </button>
            <button
              style={buttonStyle(true)}
              onClick={() => setShowAddModal(true)}
            >
              + New Trade
            </button>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}
        >
          <div
            style={{
              ...cardStyle(),
              padding: 18,
              height: 'fit-content',
              position: 'sticky',
              top: 18,
            }}
          >
            <div style={{ color: '#93c5fd', fontSize: 14, marginBottom: 16 }}>
              {user.email}
            </div>
            {(isMobileMenuOpen || true) && (
              <div style={{ display: 'grid', gap: 10 }}>
                {renderSidebarButton('dashboard', 'Dashboard')}
                {renderSidebarButton('journal', 'Trade Journal')}
                {renderSidebarButton('replay', 'Trade Replay')}
                {renderSidebarButton('add', 'Add Trade')}
                {renderSidebarButton('rules', 'Trading Rules')}
              </div>
            )}
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 18,
                background:
                  'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.12), rgba(59,130,246,0.12))',
              }}
            >
              <div style={{ color: '#d8b4fe', fontSize: 12, fontWeight: 700 }}>
                Replay entries
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 6 }}>
                {stats.replayCount}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <button style={buttonStyle(false)} onClick={exportToCSV}>
                Export CSV
              </button>
              <button style={buttonStyle(false)} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 0.9fr',
                gap: 18,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  ...cardStyle(),
                  padding: 24,
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
                      fontSize: 30,
                      margin: '14px 0 10px 0',
                      background:
                        'linear-gradient(135deg, #e9d5ff, #f9a8d4, #93c5fd)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Colorful Trading Dashboard
                  </h1>
                  <p style={{ color: '#dbeafe', margin: 0 }}>
                    Mobile-friendly layout, premium gradients, replay workflow,
                    AI summary, equity curve, and analytics widgets in one
                    journal.
                  </p>
                </div>
              </div>
              <div style={{ ...cardStyle(), padding: 24 }}>
                <div
                  style={{
                    color: '#93c5fd',
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Highlights
                </div>
                <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
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
                        ? `${stats.bestTrade.pair} ${formatNumber(
                            stats.bestTrade.pnl
                          )}`
                        : '-'}
                    </strong>
                  </div>
                  <div>
                    Worst trade:{' '}
                    <strong style={{ color: '#fda4af' }}>
                      {stats.worstTrade
                        ? `${stats.worstTrade.pair} ${formatNumber(
                            stats.worstTrade.pnl
                          )}`
                        : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gap: 14,
                marginBottom: 18,
              }}
            >
              {[
                ['Total Trades', String(stats.totalTrades), '#c084fc'],
                ['Replay Trades', String(stats.replayCount), '#f472b6'],
                ['Win Rate', `${stats.winRate.toFixed(1)}%`, '#60a5fa'],
                [
                  'Total P&L',
                  formatNumber(stats.totalPnL),
                  stats.totalPnL >= 0 ? '#4ade80' : '#fb7185',
                ],
                ['Avg Win', formatNumber(stats.averageWin), '#fbbf24'],
                ['Max Drawdown', formatNumber(stats.maxDrawdown), '#fb7185'],
              ].map(([label, value, accent]) => (
                <div
                  key={label}
                  style={{
                    ...cardStyle(),
                    padding: 18,
                    border: `1px solid ${accent}22`,
                  }}
                >
                  <div
                    style={{
                      color: accent as string,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {activePage === 'dashboard' && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.15fr 0.85fr',
                    gap: 18,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ ...cardStyle(), padding: 20 }}>
                    <h2 style={{ marginTop: 0, color: '#93c5fd' }}>
                      Equity Curve
                    </h2>
                    <EquityCurve points={equityPoints} />
                  </div>
                  <div style={{ ...cardStyle(), padding: 20 }}>
                    <h2 style={{ marginTop: 0, color: '#f9a8d4' }}>
                      Monthly Performance
                    </h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {monthlyData.map((month) => (
                        <div
                          key={month.name}
                          style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 18,
                            padding: 14,
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(139,92,246,0.05))',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              marginBottom: 8,
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
                          <div style={{ color: '#cbd5e1', fontSize: 14 }}>
                            Trades: {month.trades} • Win rate: {month.winRate}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 18,
                  }}
                >
                  <div style={{ ...cardStyle(), padding: 20 }}>
                    <h2 style={{ marginTop: 0, color: '#fcd34d' }}>
                      Strategy Performance
                    </h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {strategyData.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '180px 1fr 110px',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div>{item.name}</div>
                          <MiniBar
                            value={item.value}
                            max={biggestAbs}
                            positive={item.value >= 0}
                          />
                          <div
                            style={{
                              textAlign: 'right',
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
                  <div style={{ ...cardStyle(), padding: 20 }}>
                    <h2 style={{ marginTop: 0, color: '#86efac' }}>
                      Best & Worst Trades
                    </h2>
                    <div style={{ display: 'grid', gap: 14 }}>
                      <div
                        style={{
                          borderRadius: 18,
                          padding: 16,
                          background:
                            'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(59,130,246,0.10))',
                        }}
                      >
                        <div
                          style={{
                            color: '#86efac',
                            fontWeight: 800,
                            marginBottom: 8,
                          }}
                        >
                          Best Trade
                        </div>
                        <div>
                          {stats.bestTrade
                            ? `${stats.bestTrade.pair} • ${stats.bestTrade.strategy}`
                            : '-'}
                        </div>
                        <div style={{ marginTop: 6, color: '#bbf7d0' }}>
                          {stats.bestTrade
                            ? formatNumber(stats.bestTrade.pnl)
                            : '-'}
                        </div>
                      </div>
                      <div
                        style={{
                          borderRadius: 18,
                          padding: 16,
                          background:
                            'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(236,72,153,0.10))',
                        }}
                      >
                        <div
                          style={{
                            color: '#fda4af',
                            fontWeight: 800,
                            marginBottom: 8,
                          }}
                        >
                          Worst Trade
                        </div>
                        <div>
                          {stats.worstTrade
                            ? `${stats.worstTrade.pair} • ${stats.worstTrade.strategy}`
                            : '-'}
                        </div>
                        <div style={{ marginTop: 6, color: '#fecaca' }}>
                          {stats.worstTrade
                            ? formatNumber(stats.worstTrade.pnl)
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activePage === 'replay' && (
              <div style={{ ...cardStyle(), padding: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, color: '#f9a8d4' }}>
                      Trade Replay
                    </h2>
                    <p style={{ color: '#cbd5e1', marginBottom: 0 }}>
                      Compare screenshots, view chart annotations, and read the
                      AI-style summary.
                    </p>
                  </div>
                  <button
                    style={buttonStyle(true)}
                    onClick={() => {
                      resetForm();
                      setShowAddModal(true);
                      setActivePage('add');
                    }}
                  >
                    + New Replay Trade
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 18 }}>
                  {replayTrades.map((trade) => (
                    <div
                      key={trade.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20,
                        background:
                          'linear-gradient(180deg, rgba(2,6,23,0.80), rgba(15,23,42,0.75))',
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 900 }}>
                            {trade.replayTitle || `${trade.pair} replay`}
                          </div>
                          <div style={{ color: '#cbd5e1', marginTop: 4 }}>
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
                          gridTemplateColumns: '1fr 1fr',
                          gap: 14,
                          marginBottom: 14,
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
                          gridTemplateColumns: '1fr 1fr',
                          gap: 14,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: 16,
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              color: '#93c5fd',
                              marginBottom: 8,
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
                            borderRadius: 16,
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              color: '#f9a8d4',
                              marginBottom: 8,
                              fontWeight: 800,
                            }}
                          >
                            Outcome
                          </div>
                          <div style={{ color: '#e2e8f0' }}>
                            {trade.replayOutcome || 'No replay outcome added.'}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(236,72,153,0.14))',
                          border: '1px solid rgba(236,72,153,0.18)',
                          borderRadius: 16,
                          padding: 14,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            color: '#f5d0fe',
                            marginBottom: 8,
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
                          borderRadius: 16,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            color: '#fcd34d',
                            marginBottom: 8,
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
              </div>
            )}

            {activePage === 'rules' && (
              <div style={{ ...cardStyle(), padding: 20 }}>
                <h2 style={{ marginTop: 0, color: '#fcd34d' }}>
                  Trading Rules
                </h2>
                <textarea
                  style={{
                    ...inputStyle(),
                    minHeight: 260,
                    resize: 'vertical',
                  }}
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                />
              </div>
            )}

            {(activePage === 'journal' || activePage === 'add') && (
              <div style={{ ...cardStyle(), padding: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 18,
                  }}
                >
                  <h2 style={{ margin: 0, color: '#93c5fd' }}>Trade Journal</h2>
                  <button
                    style={buttonStyle(true)}
                    onClick={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                  >
                    + Add Trade
                  </button>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1.2fr 150px 170px 170px 170px 150px 150px 130px',
                    gap: 10,
                    marginBottom: 18,
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
                      gap: 8,
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
                <div style={{ display: 'grid', gap: 16 }}>
                  {filteredTrades.map((trade) => (
                    <div
                      key={trade.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20,
                        background:
                          'linear-gradient(180deg, rgba(2,6,23,0.80), rgba(15,23,42,0.75))',
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 16,
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: 10,
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ fontSize: 22, fontWeight: 900 }}>
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
                              style={{
                                ...chipStyle('transparent'),
                                color: pnlColor(trade.pnl),
                                border: `1px solid ${pnlColor(trade.pnl)}`,
                              }}
                            >
                              P&L {formatNumber(trade.pnl)}
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
                              padding: 14,
                              borderRadius: 16,
                              background: 'rgba(255,255,255,0.04)',
                              color: '#cbd5e1',
                              marginBottom: 12,
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
                                borderRadius: 16,
                                padding: 14,
                              }}
                            >
                              <div
                                style={{
                                  color: '#f5d0fe',
                                  marginBottom: 8,
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
                          style={{ display: 'grid', gap: 10, minWidth: 120 }}
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
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...cardStyle(),
              width: '100%',
              maxWidth: 1120,
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 18,
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
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
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
                placeholder="P&L"
                value={form.pnl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pnl: e.target.value }))
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
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <input
                style={inputStyle()}
                placeholder="Mistake"
                value={form.mistake}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mistake: e.target.value }))
                }
              />
              <label
                style={{
                  ...inputStyle(),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
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
            <div style={{ marginTop: 12 }}>
              <textarea
                style={{ ...inputStyle(), minHeight: 90, resize: 'vertical' }}
                placeholder="Trade notes"
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>
            <div
              style={{
                marginTop: 18,
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 16,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(139,92,246,0.04), rgba(236,72,153,0.03))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 18, fontWeight: 900, color: '#f5d0fe' }}
                  >
                    Before / After Replay
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: 14 }}>
                    Upload screenshots, click on them to add annotation markers,
                    then generate replay notes and AI summary.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      marginBottom: 8,
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
                      marginBottom: 8,
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  marginBottom: 14,
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      color: '#93c5fd',
                      marginBottom: 10,
                      fontWeight: 800,
                    }}
                  >
                    Before annotations
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {form.beforeAnnotations.length === 0 && (
                      <div style={{ color: '#94a3b8' }}>No markers yet.</div>
                    )}
                    {form.beforeAnnotations.map((item, index) => (
                      <div
                        key={`before-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'center',
                          background: 'rgba(2,6,23,0.55)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ color: '#e2e8f0', fontSize: 13 }}>
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
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      color: '#f9a8d4',
                      marginBottom: 10,
                      fontWeight: 800,
                    }}
                  >
                    After annotations
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {form.afterAnnotations.length === 0 && (
                      <div style={{ color: '#94a3b8' }}>No markers yet.</div>
                    )}
                    {form.afterAnnotations.map((item, index) => (
                      <div
                        key={`after-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'center',
                          background: 'rgba(2,6,23,0.55)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ color: '#e2e8f0', fontSize: 13 }}>
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
                style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
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
                  style={{ ...inputStyle(), minHeight: 90, resize: 'vertical' }}
                  placeholder="Original trade plan"
                  value={form.replayPlan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, replayPlan: e.target.value }))
                  }
                />
                <textarea
                  style={{ ...inputStyle(), minHeight: 90, resize: 'vertical' }}
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
                  style={{ ...inputStyle(), minHeight: 90, resize: 'vertical' }}
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
                    minHeight: 100,
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
                gap: 12,
                justifyContent: 'flex-end',
                marginTop: 18,
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
            padding: 20,
            zIndex: 60,
          }}
        >
          <div
            style={{
              ...cardStyle(),
              maxWidth: 420,
              width: '100%',
              padding: 24,
            }}
          >
            <h3 style={{ marginTop: 0, color: '#f5d0fe' }}>
              Delete this trade?
            </h3>
            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}
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
