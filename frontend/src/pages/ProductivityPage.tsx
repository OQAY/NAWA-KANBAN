import { useState, useEffect, useRef, useCallback } from 'react';
import { productivityApi } from '../api/services';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  Brush,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProductivityPage.css';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TodaySummary {
  date: string;
  totalTrackedSeconds: number;
  activeSeconds: number;
  afkSeconds: number;
  alertsLevel1: number;
  alertsLevel2: number;
  alertsLevel3: number;
  longestFocusStreakSeconds: number;
  pomodoroCompleted: number;
  pomodoroInterrupted: number;
  focusScore: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  workSessionStart: string | null;
  totalEvents: number;
}

interface AppData { appName: string; totalSeconds: number; events: number; }
interface WindowData { appName: string; windowTitle: string; totalSeconds: number; }
interface MinuteData { minute: number; active: boolean; afk: boolean; appName: string; windowTitle: string; durationSeconds: number; }
interface CategoryData { category: number; name: string; totalSeconds: number; percentage: number; }
interface WorkScoreHour { hour: number; avgWorkScore: number; avgKeystrokeRate: number; whisperMinutes: number; }
interface IdleResolutionEntry { id: string; startedAt: string; endedAt: string; durationSeconds: number; resolution: string; resolutionLabel: string; note: string | null; }

interface TimeseriesPoint {
  timestamp: string;
  ts: number;            // Unix ms — used by Recharts XAxis type="number"
  activeSeconds: number;
  afkSeconds: number;
  avgWorkScore: number;
}

interface ProductivityPulse {
  pulse: number;
  details: {
    veryProductive: number; productive: number;
    neutral: number; distracting: number; veryDistracting: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function startOfDayBRT(date: string): Date {
  return new Date(date + 'T03:00:00Z'); // 00:00 BRT = 03:00 UTC
}

function endOfDayBRT(date: string): Date {
  return new Date(startOfDayBRT(date).getTime() + 24 * 3600 * 1000 - 1);
}

function todayBRTStr(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().split('T')[0];
}

function calcResolution(from: Date, to: Date): '1m' | '5m' | '1h' {
  const hours = (to.getTime() - from.getTime()) / 3600_000;
  if (hours <= 2) return '1m';
  if (hours <= 24) return '5m';
  return '1h';
}

function formatTick(ms: number, resolution: '1m' | '5m' | '1h'): string {
  const d = new Date(ms);
  if (resolution === '1h') {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function pulseColor(pulse: number): string {
  if (pulse >= 70) return '#22c55e';
  if (pulse >= 40) return '#f59e0b';
  return '#ef4444';
}

const CAT_META: Record<string, { label: string; color: string }> = {
  '2':  { label: 'Muito Produtivo', color: '#22c55e' },
  '1':  { label: 'Produtivo',        color: '#86efac' },
  '0':  { label: 'Neutro',           color: '#6b7280' },
  '-1': { label: 'Distração',        color: '#f59e0b' },
  '-2': { label: 'Muita Distração',  color: '#ef4444' },
};

type QuickRange = 'today' | '12h' | '6h' | '2h' | '1h';

function getQuickRange(range: QuickRange, selectedDate: string): { from: Date; to: Date } {
  const isToday = selectedDate === todayBRTStr();
  const now = isToday ? new Date() : endOfDayBRT(selectedDate);
  switch (range) {
    case 'today': return { from: startOfDayBRT(selectedDate), to: now };
    case '12h':   return { from: new Date(now.getTime() - 12 * 3600_000), to: now };
    case '6h':    return { from: new Date(now.getTime() - 6 * 3600_000),  to: now };
    case '2h':    return { from: new Date(now.getTime() - 2 * 3600_000),  to: now };
    case '1h':    return { from: new Date(now.getTime() - 3600_000),      to: now };
  }
}

// ─── Grafana Tooltip ─────────────────────────────────────────────────────────

function GrafanaTooltip({ active, payload, label, resolution }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label as number);
  const showSeconds = resolution === '1m';
  return (
    <div className="grafana-tooltip">
      <div className="grafana-tooltip-time">
        {d.toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit',
          second: showSeconds ? '2-digit' : undefined,
        })}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="grafana-tooltip-row" style={{ color: p.color }}>
          <span className="grafana-tooltip-name">{p.name}</span>
          <strong className="grafana-tooltip-value">{formatDuration(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const FOCUS_COLORS = ['#22c55e', '#ef4444'];

export default function ProductivityPage() {
  const [summary, setSummary]       = useState<TodaySummary | null>(null);
  const [apps, setApps]             = useState<AppData[]>([]);
  const [windows, setWindows]       = useState<WindowData[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [weekly, setWeekly]         = useState<{ days: any[]; currentStreak: number; longestStreak: number } | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [minuteData, setMinuteData] = useState<MinuteData[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayBRTStr());

  // v2.0 smart detection
  const [categories, setCategories]           = useState<CategoryData[]>([]);
  const [workScoreTimeline, setWorkScoreTimeline] = useState<WorkScoreHour[]>([]);
  const [pulse, setPulse]                     = useState<ProductivityPulse | null>(null);
  const [idleResolutions, setIdleResolutions] = useState<IdleResolutionEntry[]>([]);

  // ─── Adaptive timeseries state ───────────────────────────────────────────
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesPoint[]>([]);
  const [tsLoading, setTsLoading]           = useState(false);
  const [viewFrom, setViewFrom]             = useState<Date>(() => startOfDayBRT(todayBRTStr()));
  const [viewTo, setViewTo]                 = useState<Date>(() => new Date());
  const [activeRange, setActiveRange]       = useState<QuickRange>('today');
  const [resolution, setResolution]         = useState<'1m' | '5m' | '1h'>('5m');
  const brushDebounce                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load page data (summary, apps, etc.) ────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      productivityApi.getTodaySummary(),
      productivityApi.getAppBreakdown(selectedDate),
      productivityApi.getWindowDetails(selectedDate),
      productivityApi.getWeeklyHistory(),
      productivityApi.getCategoryBreakdown(selectedDate),
      productivityApi.getWorkScoreTimeline(selectedDate),
      productivityApi.getProductivityPulse(selectedDate),
      productivityApi.getIdleResolutions(selectedDate),
    ]).then(([summaryRes, appsRes, windowsRes, weeklyRes, catRes, wsRes, pulseRes, idleRes]) => {
      setSummary(summaryRes.data);
      setApps(appsRes.data);
      setWindows(windowsRes.data);
      setWeekly(weeklyRes.data);
      setCategories(catRes.data || []);
      setWorkScoreTimeline(wsRes.data || []);
      setPulse(pulseRes.data || null);
      setIdleResolutions(idleRes.data || []);
    }).catch(() => {
      setSummary(null); setApps([]); setWindows([]);
    }).finally(() => setLoading(false));
  }, [selectedDate]);

  // Reset view range when date changes
  useEffect(() => {
    const from = startOfDayBRT(selectedDate);
    const to   = selectedDate === todayBRTStr() ? new Date() : endOfDayBRT(selectedDate);
    setViewFrom(from);
    setViewTo(to);
    setActiveRange('today');
  }, [selectedDate]);

  // ─── Fetch timeseries when viewFrom/viewTo change ────────────────────────
  const fetchTimeSeries = useCallback((from: Date, to: Date) => {
    const res = calcResolution(from, to);
    setResolution(res);
    setTsLoading(true);
    productivityApi.getTimeSeries(from.toISOString(), to.toISOString(), res)
      .then(r => {
        setTimeseriesData(
          (r.data as any[]).map(p => ({
            ...p,
            ts: new Date(p.timestamp).getTime(),
          }))
        );
      })
      .catch(() => setTimeseriesData([]))
      .finally(() => setTsLoading(false));
  }, []);

  useEffect(() => {
    fetchTimeSeries(viewFrom, viewTo);
  }, [viewFrom, viewTo, fetchTimeSeries]);

  // ─── Drill-down: minute blocks when clicking a work-score bar ────────────
  useEffect(() => {
    if (selectedHour !== null) {
      productivityApi.getMinuteBreakdown(selectedDate, selectedHour)
        .then(res => setMinuteData(res.data))
        .catch(() => setMinuteData([]));
    } else {
      setMinuteData([]);
    }
  }, [selectedHour, selectedDate]);

  // ─── Window filter ────────────────────────────────────────────────────────
  useEffect(() => {
    const api = selectedApp
      ? productivityApi.getWindowDetails(selectedDate, selectedApp)
      : productivityApi.getWindowDetails(selectedDate);
    api.then(res => setWindows(res.data)).catch(() => setWindows([]));
  }, [selectedApp, selectedDate]);

  if (loading) return <LoadingSpinner fullScreen message="Carregando produtividade..." />;

  const activeMinutes = Math.round((summary?.activeSeconds || 0) / 60);
  const afkMinutes    = Math.round((summary?.afkSeconds || 0) / 60);
  const focusData     = [
    { name: 'Ativo', value: activeMinutes || 1 },
    { name: 'Idle',  value: afkMinutes || 0 },
  ];
  const totalAlerts = (summary?.alertsLevel1 || 0) + (summary?.alertsLevel2 || 0) + (summary?.alertsLevel3 || 0);

  // ─── Brush zoom handler (debounced) ──────────────────────────────────────
  function handleBrushChange(e: any) {
    if (!e || typeof e.startIndex !== 'number') return;
    if (brushDebounce.current) clearTimeout(brushDebounce.current);
    brushDebounce.current = setTimeout(() => {
      const start = timeseriesData[e.startIndex];
      const end   = timeseriesData[e.endIndex];
      if (start && end && end.ts > start.ts) {
        setViewFrom(new Date(start.ts));
        setViewTo(new Date(end.ts));
        setActiveRange('today'); // custom range — deselect quick buttons
      }
    }, 350);
  }

  // ─── Quick range button handler ──────────────────────────────────────────
  function applyQuickRange(range: QuickRange) {
    const { from, to } = getQuickRange(range, selectedDate);
    setActiveRange(range);
    setViewFrom(from);
    setViewTo(to);
  }

  // ─── Resolution label for the chart header ───────────────────────────────
  const resolutionLabel: Record<string, string> = { '1m': '1 min', '5m': '5 min', '1h': '1h' };
  const rangeLabel = (() => {
    const h = (viewTo.getTime() - viewFrom.getTime()) / 3600_000;
    if (h < 2) return `${Math.round(h * 60)}min`;
    if (h <= 24) return `${Math.round(h)}h`;
    return `${Math.round(h / 24)}d`;
  })();

  return (
    <div className="productivity-page">

      {/* Header */}
      <div className="productivity-header">
        <div className="productivity-title">
          <h1>Produtividade</h1>
          <div className="productivity-subtitle-row">
            <p className="productivity-subtitle">Monitoramento de atividade do desktop</p>
            {summary?.workSessionStart && (
              <span className="session-badge">
                Sessão desde{' '}
                <strong>
                  {new Date(summary.workSessionStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </span>
            )}
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="date-picker"
        />
      </div>

      {/* Hero Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-pulse" style={{ borderColor: pulseColor(pulse?.pulse || 0) }}>
          <div className="stat-value" style={{ color: pulseColor(pulse?.pulse || 0) }}>{pulse?.pulse || 0}%</div>
          <div className="stat-label">Productivity Pulse</div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${pulse?.pulse || 0}%`, background: pulseColor(pulse?.pulse || 0) }} />
          </div>
        </div>

        {(() => {
          const active = workScoreTimeline.filter(h => h.avgWorkScore > 0);
          const avgWS  = active.length > 0 ? Math.round(active.reduce((s, h) => s + h.avgWorkScore, 0) / active.length) : 0;
          return (
            <div className="stat-card stat-workscore">
              <div className="stat-value">{avgWS}%</div>
              <div className="stat-label">Work Score Médio</div>
              <div className="stat-bar">
                <div className="stat-bar-fill stat-bar-purple" style={{ width: `${avgWS}%` }} />
              </div>
            </div>
          );
        })()}

        <div className="stat-card stat-focus">
          <div className="stat-value">{summary?.focusScore || 0}%</div>
          <div className="stat-label">Focus Score</div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${summary?.focusScore || 0}%` }} />
          </div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-value">{formatDuration(summary?.activeSeconds || 0)}</div>
          <div className="stat-label">Tempo Ativo</div>
        </div>

        <div className="stat-card stat-streak">
          <div className="stat-value">{formatDuration(summary?.longestFocusStreakSeconds || 0)}</div>
          <div className="stat-label">Maior Streak</div>
        </div>

        <div className="stat-card stat-alerts">
          <div className="stat-value">{totalAlerts}</div>
          <div className="stat-label">Alertas</div>
          <div className="stat-detail">
            L1: {summary?.alertsLevel1 || 0} &middot; L2: {summary?.alertsLevel2 || 0} &middot; L3: {summary?.alertsLevel3 || 0}
          </div>
        </div>

        <div className="stat-card stat-pomodoro">
          <div className="stat-value">{summary?.pomodoroCompleted || 0}</div>
          <div className="stat-label">Pomodoros</div>
          {(summary?.pomodoroInterrupted || 0) > 0 && (
            <div className="stat-detail">{summary?.pomodoroInterrupted} interrompidos</div>
          )}
        </div>

        <div className="stat-card stat-events">
          <div className="stat-value">{summary?.totalEvents || 0}</div>
          <div className="stat-label">Eventos</div>
        </div>
      </div>

      {/* Pulse breakdown bar */}
      {pulse && Object.values(pulse.details).some(v => v > 0) && (
        <div className="pulse-breakdown">
          <div className="pulse-breakdown-label">Distribuição do dia</div>
          <div className="pulse-bar-stack">
            {([
              { key: 'veryProductive',  color: '#22c55e', label: 'Muito Prod.' },
              { key: 'productive',      color: '#86efac', label: 'Produtivo' },
              { key: 'neutral',         color: '#4b5563', label: 'Neutro' },
              { key: 'distracting',     color: '#f59e0b', label: 'Distração' },
              { key: 'veryDistracting', color: '#ef4444', label: 'Muita Distr.' },
            ] as { key: keyof typeof pulse.details; color: string; label: string }[]).map(({ key, color, label }) => {
              const secs  = pulse.details[key];
              const total = Object.values(pulse.details).reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? Math.round(secs / total * 100) : 0;
              if (pct === 0) return null;
              return (
                <div key={key} className="pulse-bar-segment"
                  style={{ width: `${pct}%`, background: color }}
                  title={`${label}: ${formatDuration(secs)} (${pct}%)`}
                />
              );
            })}
          </div>
          <div className="pulse-breakdown-legend">
            {([
              { key: 'veryProductive',  color: '#22c55e', label: 'Muito Prod.' },
              { key: 'productive',      color: '#86efac', label: 'Produtivo' },
              { key: 'neutral',         color: '#4b5563', label: 'Neutro' },
              { key: 'distracting',     color: '#f59e0b', label: 'Distração' },
              { key: 'veryDistracting', color: '#ef4444', label: 'Muita Distr.' },
            ] as { key: keyof typeof pulse.details; color: string; label: string }[]).map(({ key, color, label }) => {
              const secs = pulse.details[key];
              if (!secs) return null;
              return (
                <span key={key} className="legend-item">
                  <span className="dot" style={{ background: color }} />
                  {label}: {formatDuration(secs)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ADAPTIVE TIMESERIES CHART (Grafana-style) ─────────────────────── */}
      <div className="chart-card grafana-panel">

        {/* Panel header */}
        <div className="grafana-panel-header">
          <div className="grafana-panel-title">
            <span className="grafana-panel-dot" />
            Atividade
            <span className="grafana-panel-meta">
              {rangeLabel} · {resolutionLabel[resolution]} buckets
              {tsLoading && <span className="grafana-panel-loading"> ···</span>}
            </span>
          </div>

          {/* Quick range buttons */}
          <div className="ts-quick-ranges">
            {(['today', '12h', '6h', '2h', '1h'] as QuickRange[]).map(r => (
              <button
                key={r}
                className={`ts-range-btn ${activeRange === r ? 'active' : ''}`}
                onClick={() => applyQuickRange(r)}
              >
                {r === 'today' ? 'Hoje' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Main chart */}
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={timeseriesData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradAfk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.20} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />

            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickCount={8}
              tickFormatter={ms => formatTick(ms as number, resolution)}
              tick={{ fill: '#555', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tickFormatter={v => `${v}s`}
              tick={{ fill: '#444', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={34}
            />

            <Tooltip
              content={<GrafanaTooltip resolution={resolution} />}
              cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="activeSeconds"
              name="Ativo"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#gradActive)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
            />

            <Area
              type="monotone"
              dataKey="afkSeconds"
              name="Idle"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#gradAfk)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
            />

            {/* Brush — arraste para zoom (dispara nova requisição) */}
            <Brush
              dataKey="ts"
              height={28}
              stroke="#2a2a3e"
              fill="#0d0d1a"
              travellerWidth={6}
              onChange={handleBrushChange}
              tickFormatter={ms => formatTick(ms as number, resolution)}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="grafana-panel-legend">
          <span><span className="dot" style={{ background: '#22c55e' }} /> Ativo</span>
          <span><span className="dot" style={{ background: '#ef4444' }} /> Idle</span>
        </div>
      </div>

      {/* Charts grid: pie + alertas */}
      <div className="charts-grid">

        {/* Pie - Focus vs Idle */}
        <div className="chart-card">
          <h3>Ativo vs Idle</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={focusData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {focusData.map((_, i) => <Cell key={i} fill={FOCUS_COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8 }}
                formatter={(value, name) => [`${value} min`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            <span className="legend-item"><span className="dot dot-active" /> Ativo: {activeMinutes}min</span>
            <span className="legend-item"><span className="dot dot-idle" />  Idle: {afkMinutes}min</span>
          </div>
        </div>

        {/* Bar - Alertas */}
        <div className="chart-card">
          <h3>Alertas por Nível</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { name: 'Gota',   value: summary?.alertsLevel1 || 0 },
              { name: 'Nudge',  value: summary?.alertsLevel2 || 0 },
              { name: 'Pulsos', value: summary?.alertsLevel3 || 0 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
              <XAxis dataKey="name" stroke="#555" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#444" fontSize={11} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {[{ fill: '#f59e0b' }, { fill: '#f97316' }, { fill: '#ef4444' }].map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* v2.0 — Category breakdown + Work Score */}
      {(categories.length > 0 || workScoreTimeline.some(h => h.avgWorkScore > 0)) && (
        <div className="charts-grid">

          {categories.length > 0 && (
            <div className="chart-card">
              <h3>Tempo por Categoria</h3>
              <div className="category-list">
                {[2, 1, 0, -1, -2].map(cat => {
                  const item = categories.find(c => c.category === cat);
                  if (!item || item.totalSeconds === 0) return null;
                  const meta = CAT_META[String(cat)];
                  return (
                    <div key={cat} className="category-row">
                      <div className="category-label">
                        <span className="category-dot" style={{ background: meta.color }} />
                        <span>{meta.label}</span>
                      </div>
                      <div className="category-bar-wrap">
                        <div className="category-bar-fill" style={{ width: `${item.percentage}%`, background: meta.color }} />
                      </div>
                      <div className="category-time">{formatDuration(item.totalSeconds)}</div>
                      <div className="category-pct">{item.percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Work Score por hora — clique para ver minutos */}
          {workScoreTimeline.some(h => h.avgWorkScore > 0) && (
            <div className="chart-card">
              <h3>
                Work Score por Hora
                <span style={{ fontSize: 11, color: '#555', fontWeight: 400 }}> — clique para detalhar</span>
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={workScoreTimeline.map(h => ({
                    label: `${String(h.hour).padStart(2, '0')}h`,
                    score: h.avgWorkScore,
                    hour: h.hour,
                  }))}
                  onClick={(e: any) => {
                    if (e?.activePayload?.[0]?.payload) {
                      const h = e.activePayload[0].payload.hour;
                      setSelectedHour(selectedHour === h ? null : h);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#444" fontSize={10} domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#12121e', border: '1px solid #2a2a3e', borderRadius: 6 }}
                    formatter={(value) => [`${value}%`, 'Work Score']}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {workScoreTimeline.map((h, i) => (
                      <Cell key={i} fill={
                        selectedHour === h.hour ? '#a78bfa' :
                        h.avgWorkScore >= 70 ? '#22c55e' :
                        h.avgWorkScore >= 40 ? '#f59e0b' : '#ef4444'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Minute drill-down */}
      {selectedHour !== null && minuteData.length > 0 && (
        <div className="chart-card chart-wide minute-panel">
          <h3>
            Minuto a minuto — {String(selectedHour).padStart(2, '0')}:00 – {String(selectedHour).padStart(2, '0')}:59
            <button className="filter-clear" onClick={() => setSelectedHour(null)}>Fechar</button>
          </h3>
          <div className="minute-grid">
            {minuteData.map((m, i) => (
              <div
                key={i}
                className={`minute-block ${m.active ? 'mb-active' : m.afk ? 'mb-afk' : 'mb-empty'}`}
                title={`${String(selectedHour).padStart(2, '0')}:${String(m.minute).padStart(2, '0')} — ${
                  m.active ? m.appName.replace('.exe', '') + ': ' + m.windowTitle.substring(0, 60) :
                  m.afk ? 'Idle' : 'Sem dados'
                }`}
              >
                {m.minute % 10 === 0 && <span className="minute-label">:{String(m.minute).padStart(2, '0')}</span>}
              </div>
            ))}
          </div>
          <div className="minute-details">
            {minuteData.filter(m => m.active && m.appName)
              .reduce((acc, m) => {
                const key = m.appName + '|' + m.windowTitle;
                const ex  = acc.find(a => a.key === key);
                if (ex) ex.count++; else acc.push({ key, appName: m.appName, windowTitle: m.windowTitle, count: 1 });
                return acc;
              }, [] as { key: string; appName: string; windowTitle: string; count: number }[])
              .sort((a, b) => b.count - a.count).slice(0, 8)
              .map((item, i) => (
                <div key={i} className="minute-detail-item">
                  <span className="window-app">{item.appName.replace('.exe', '')}</span>
                  <span className="window-title">{item.windowTitle.substring(0, 50)}</span>
                  <span className="window-time">{item.count}min</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Apps Section */}
      {apps.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Tempo por Aplicativo</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, apps.length * 40)}>
              <BarChart data={apps.slice(0, 10).map(a => ({
                name: a.appName.replace('.exe', ''),
                minutes: Math.round(a.totalSeconds / 60),
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis type="number" stroke="#555" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#555" fontSize={11} width={120} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 8 }}
                  formatter={(value) => [`${value} min`, 'Tempo']}
                />
                <Bar dataKey="minutes" fill="#8b5cf6" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>
              Detalhamento por Janela
              {selectedApp && (
                <button className="filter-clear" onClick={() => setSelectedApp('')}>Limpar filtro</button>
              )}
            </h3>
            <div className="app-filter">
              {apps.slice(0, 8).map(a => (
                <button
                  key={a.appName}
                  className={`app-tag ${selectedApp === a.appName ? 'active' : ''}`}
                  onClick={() => setSelectedApp(selectedApp === a.appName ? '' : a.appName)}
                >
                  {a.appName.replace('.exe', '')}
                </button>
              ))}
            </div>
            <div className="window-list">
              {windows.slice(0, 15).map((w, i) => (
                <div key={i} className="window-item">
                  <div className="window-info">
                    <span className="window-app">{w.appName.replace('.exe', '')}</span>
                    <span className="window-title">{w.windowTitle}</span>
                  </div>
                  <div className="window-time">{formatDuration(w.totalSeconds)}</div>
                </div>
              ))}
              {windows.length === 0 && (
                <div className="window-empty">Sem dados de janelas para este dia</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log de Ausências */}
      {idleResolutions.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card chart-wide">
            <h3>Log de Ausências</h3>
            <table className="idle-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Duração</th>
                  <th>O que estava fazendo</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {idleResolutions.map(r => {
                  const resColors: Record<string, string> = {
                    away_working:    '#4ade80',
                    break:           '#60a5fa',
                    procrastinating: '#f87171',
                    discarded:       '#6b7280',
                  };
                  return (
                    <tr key={r.id}>
                      <td className="idle-time">
                        {new Date(r.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(r.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="idle-duration">{formatDuration(r.durationSeconds)}</td>
                      <td>
                        <span className="idle-badge" style={{ color: resColors[r.resolution] || '#aaa' }}>
                          {r.resolutionLabel}
                        </span>
                      </td>
                      <td className="idle-note">
                        {r.note || <span className="idle-note-empty">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Heatmap + Streaks */}
      {weekly && (
        <div className="charts-grid">
          <div className="chart-card chart-wide">
            <h3>
              Últimos 30 dias
              <span className="streak-badges">
                <span className="streak-badge streak-current">Streak atual: {weekly.currentStreak} dias</span>
                <span className="streak-badge streak-longest">Recorde: {weekly.longestStreak} dias</span>
              </span>
            </h3>
            <div className="heatmap">
              {weekly.days.map((day, i) => {
                const colors = ['#1a1a2e', '#1a3a1a', '#2d5a2d', '#22c55e', '#4ade80'];
                const d = new Date(day.date + 'T12:00:00');
                const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
                const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const ah = Math.floor(day.activeSeconds / 3600);
                const am = Math.floor((day.activeSeconds % 3600) / 60);
                return (
                  <div key={i} className="heatmap-cell"
                    style={{ background: colors[day.level] }}
                    title={`${dateStr} (${weekday}): ${ah}h${am}min ativo | Focus: ${day.avgFocusScore}%`}
                  >
                    {i % 7 === 0 && <span className="heatmap-label">{dateStr}</span>}
                  </div>
                );
              })}
            </div>
            <div className="heatmap-legend">
              <span>Menos</span>
              {['#1a1a2e', '#1a3a1a', '#2d5a2d', '#22c55e', '#4ade80'].map((c, i) => (
                <div key={i} className="heatmap-cell-sm" style={{ background: c }} />
              ))}
              <span>Mais</span>
            </div>
          </div>
        </div>
      )}

      {summary?.firstActivityAt && (
        <div className="activity-range">
          Primeira atividade: {new Date(summary.firstActivityAt).toLocaleTimeString('pt-BR')}
          {summary.lastActivityAt && (
            <> &middot; Última: {new Date(summary.lastActivityAt).toLocaleTimeString('pt-BR')}</>
          )}
        </div>
      )}
    </div>
  );
}
