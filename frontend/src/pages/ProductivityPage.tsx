import { useState, useEffect, useRef } from 'react';
import { productivityApi } from '../api/services';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  Brush, ReferenceLine,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProductivityPage.css';

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

interface HourlyData {
  hour: number;
  activeSeconds: number;
  afkSeconds: number;
  events: number;
}

interface AppData {
  appName: string;
  totalSeconds: number;
  events: number;
}

interface WindowData {
  appName: string;
  windowTitle: string;
  totalSeconds: number;
}

interface MinuteData {
  minute: number;
  active: boolean;
  afk: boolean;
  appName: string;
  windowTitle: string;
  durationSeconds: number;
}

interface CategoryData {
  category: number;
  name: string;
  totalSeconds: number;
  percentage: number;
}

interface WorkScoreHour {
  hour: number;
  avgWorkScore: number;
  avgKeystrokeRate: number;
  whisperMinutes: number;
}

interface IdleResolutionEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  resolution: string;
  resolutionLabel: string;
  note: string | null;
}

interface ProductivityPulse {
  pulse: number;
  details: {
    veryProductive: number;
    productive: number;
    neutral: number;
    distracting: number;
    veryDistracting: number;
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

const FOCUS_COLORS = ['#22c55e', '#ef4444'];

const CAT_META: { [key: string]: { label: string; color: string } } = {
  '2':  { label: 'Muito Produtivo', color: '#22c55e' },
  '1':  { label: 'Produtivo',        color: '#86efac' },
  '0':  { label: 'Neutro',           color: '#6b7280' },
  '-1': { label: 'Distração',        color: '#f59e0b' },
  '-2': { label: 'Muita Distração',  color: '#ef4444' },
};

function pulseColor(pulse: number): string {
  if (pulse >= 70) return '#22c55e';
  if (pulse >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function ProductivityPage() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [timeline, setTimeline] = useState<HourlyData[]>([]);
  const [apps, setApps] = useState<AppData[]>([]);
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [weekly, setWeekly] = useState<{ days: any[]; currentStreak: number; longestStreak: number } | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [minuteData, setMinuteData] = useState<MinuteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // v2.0 smart detection
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [workScoreTimeline, setWorkScoreTimeline] = useState<WorkScoreHour[]>([]);
  const [pulse, setPulse] = useState<ProductivityPulse | null>(null);
  const [idleResolutions, setIdleResolutions] = useState<IdleResolutionEntry[]>([]);

  // Brush zoom state
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setBrushRange(null);
    Promise.all([
      productivityApi.getTodaySummary(),
      productivityApi.getTimeline(selectedDate),
      productivityApi.getAppBreakdown(selectedDate),
      productivityApi.getWindowDetails(selectedDate),
      productivityApi.getWeeklyHistory(),
      productivityApi.getCategoryBreakdown(selectedDate),
      productivityApi.getWorkScoreTimeline(selectedDate),
      productivityApi.getProductivityPulse(selectedDate),
      productivityApi.getIdleResolutions(selectedDate),
    ])
      .then(([summaryRes, timelineRes, appsRes, windowsRes, weeklyRes, catRes, wsRes, pulseRes, idleRes]) => {
        setSummary(summaryRes.data);
        setTimeline(timelineRes.data);
        setApps(appsRes.data);
        setWindows(windowsRes.data);
        setWeekly(weeklyRes.data);
        setCategories(catRes.data || []);
        setWorkScoreTimeline(wsRes.data || []);
        setPulse(pulseRes.data || null);
        setIdleResolutions(idleRes.data || []);
      })
      .catch(() => {
        setSummary(null);
        setTimeline([]);
        setApps([]);
        setWindows([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Drill-down: busca minutos quando clica numa hora
  useEffect(() => {
    if (selectedHour !== null) {
      productivityApi.getMinuteBreakdown(selectedDate, selectedHour)
        .then(res => setMinuteData(res.data))
        .catch(() => setMinuteData([]));
    } else {
      setMinuteData([]);
    }
  }, [selectedHour, selectedDate]);

  // Filtrar janelas quando seleciona um app
  useEffect(() => {
    if (selectedApp) {
      productivityApi.getWindowDetails(selectedDate, selectedApp)
        .then(res => setWindows(res.data))
        .catch(() => setWindows([]));
    } else {
      productivityApi.getWindowDetails(selectedDate)
        .then(res => setWindows(res.data))
        .catch(() => setWindows([]));
    }
  }, [selectedApp, selectedDate]);

  if (loading) return <LoadingSpinner fullScreen message="Carregando produtividade..." />;

  const activeMinutes = Math.round((summary?.activeSeconds || 0) / 60);
  const afkMinutes = Math.round((summary?.afkSeconds || 0) / 60);
  const focusData = [
    { name: 'Ativo', value: activeMinutes || 1 },
    { name: 'Idle', value: afkMinutes || 0 },
  ];

  // Detecta hora de início da sessão real usando dados horários:
  // Primeira hora com >10min ativo onde a hora anterior tinha <2min ativo.
  // Isso ignora blips noturnos de background processes.
  const sessionStartHourBRT = (() => {
    if (timeline.length < 2) return 0;
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1];
      const curr = timeline[i];
      if (curr.activeSeconds > 600 && prev.activeSeconds < 120) {
        return curr.hour;
      }
    }
    // Fallback: usa workSessionStart do backend convertido pra BRT
    if (summary?.workSessionStart) {
      const utc = new Date(summary.workSessionStart);
      const brt = new Date(utc.getTime() - 3 * 60 * 60 * 1000);
      return brt.getUTCHours();
    }
    return 0;
  })();

  const timelineData = timeline.map(h => {
    // Horas antes da sessão: mostrar como offline (zero tudo)
    const isPreSession = sessionStartHourBRT > 0 && h.hour < sessionStartHourBRT;
    return {
      ...h,
      activeMinutes: isPreSession ? 0 : Math.round(h.activeSeconds / 60),
      afkMinutes: isPreSession ? 0 : Math.round(h.afkSeconds / 60),
      label: formatHour(h.hour),
      offline: isPreSession,
    };
  });

  const totalAlerts = (summary?.alertsLevel1 || 0) + (summary?.alertsLevel2 || 0) + (summary?.alertsLevel3 || 0);

  return (
    <div className="productivity-page">
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
        {/* Pulse card */}
        <div className="stat-card stat-pulse" style={{ borderColor: pulseColor(pulse?.pulse || 0) }}>
          <div className="stat-value" style={{ color: pulseColor(pulse?.pulse || 0) }}>
            {pulse?.pulse || 0}%
          </div>
          <div className="stat-label">Productivity Pulse</div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill"
              style={{ width: `${pulse?.pulse || 0}%`, background: pulseColor(pulse?.pulse || 0) }}
            />
          </div>
        </div>

        {/* Work Score */}
        {(() => {
          const active = workScoreTimeline.filter(h => h.avgWorkScore > 0);
          const avgWS = active.length > 0 ? Math.round(active.reduce((s, h) => s + h.avgWorkScore, 0) / active.length) : 0;
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
            <div
              className="stat-bar-fill"
              style={{ width: `${summary?.focusScore || 0}%` }}
            />
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
            L1: {summary?.alertsLevel1 || 0} &middot;
            L2: {summary?.alertsLevel2 || 0} &middot;
            L3: {summary?.alertsLevel3 || 0}
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
      {pulse && (pulse.details.veryProductive + pulse.details.productive + pulse.details.neutral + pulse.details.distracting + pulse.details.veryDistracting) > 0 && (
        <div className="pulse-breakdown">
          <div className="pulse-breakdown-label">Distribuição do dia</div>
          <div className="pulse-bar-stack">
            {([
              { key: 'veryProductive', color: '#22c55e', label: 'Muito Prod.' },
              { key: 'productive',     color: '#86efac', label: 'Produtivo' },
              { key: 'neutral',        color: '#4b5563', label: 'Neutro' },
              { key: 'distracting',    color: '#f59e0b', label: 'Distração' },
              { key: 'veryDistracting',color: '#ef4444', label: 'Muita Distr.' },
            ] as { key: keyof typeof pulse.details; color: string; label: string }[]).map(({ key, color, label }) => {
              const secs = pulse.details[key];
              const total = Object.values(pulse.details).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round(secs / total * 100) : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={key}
                  className="pulse-bar-segment"
                  style={{ width: `${pct}%`, background: color }}
                  title={`${label}: ${formatDuration(secs)} (${pct}%)`}
                />
              );
            })}
          </div>
          <div className="pulse-breakdown-legend">
            {([
              { key: 'veryProductive', color: '#22c55e', label: 'Muito Prod.' },
              { key: 'productive',     color: '#86efac', label: 'Produtivo' },
              { key: 'neutral',        color: '#4b5563', label: 'Neutro' },
              { key: 'distracting',    color: '#f59e0b', label: 'Distração' },
              { key: 'veryDistracting',color: '#ef4444', label: 'Muita Distr.' },
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

      {/* Charts */}
      <div className="charts-grid">
        {/* Timeline - Atividade por hora com Brush */}
        <div className="chart-card chart-wide" ref={timelineRef}>
          <div className="chart-header">
            <h3>
              Atividade por Hora
              <span style={{fontSize: 11, color: '#666', fontWeight: 400}}> — clique para detalhar &middot; arraste para zoom</span>
            </h3>
            {brushRange && (
              <button className="filter-clear" onClick={() => setBrushRange(null)}>Reset zoom</button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={timelineData}
              onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload) {
                  const hour = parseInt(e.activePayload[0].payload.label);
                  setSelectedHour(selectedHour === hour ? null : hour);
                }
              }}
              style={{cursor: 'pointer'}}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="label" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} label={{ value: 'min', angle: -90, position: 'insideLeft', fill: '#666' }} />
              <Tooltip
                contentStyle={{ background: '#12121e', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#e0e0e0' }}
                formatter={(value: any, name: any, item: any) => {
                  if (item?.payload?.offline) return ['—', 'Offline'];
                  return [`${value} min`, name === 'activeMinutes' ? 'Ativo' : 'Idle'];
                }}
              />
              <Area type="monotone" dataKey="activeMinutes" stackId="1"
                stroke="#22c55e" fill="#22c55e" fillOpacity={0.55} name="Ativo" />
              <Area type="monotone" dataKey="afkMinutes" stackId="1"
                stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} name="Idle" />
              {summary?.workSessionStart && sessionStartHourBRT > 0 && (
                <ReferenceLine
                  x={formatHour(sessionStartHourBRT)}
                  stroke="#7c3aed"
                  strokeDasharray="4 3"
                  label={{ value: 'Sessão', position: 'top', fill: '#a78bfa', fontSize: 11 }}
                />
              )}
              <Brush
                dataKey="label"
                height={20}
                stroke="#7c3aed"
                fill="#1a1a2e"
                travellerWidth={8}
                startIndex={brushRange?.startIndex}
                endIndex={brushRange?.endIndex}
                onChange={(e: any) => {
                  if (e && typeof e.startIndex === 'number') {
                    setBrushRange({ startIndex: e.startIndex, endIndex: e.endIndex });
                  }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Minute drill-down */}
        {selectedHour !== null && minuteData.length > 0 && (
          <div className="chart-card chart-wide minute-panel">
            <h3>
              Minuto a minuto — {String(selectedHour).padStart(2, '0')}:00 - {String(selectedHour).padStart(2, '0')}:59
              <button className="filter-clear" onClick={() => setSelectedHour(null)}>Fechar</button>
            </h3>
            <div className="minute-grid">
              {minuteData.map((m, i) => (
                <div
                  key={i}
                  className={`minute-block ${m.active ? 'mb-active' : m.afk ? 'mb-afk' : 'mb-empty'}`}
                  title={`${String(selectedHour).padStart(2, '0')}:${String(m.minute).padStart(2, '0')} — ${m.active ? m.appName.replace('.exe', '') + ': ' + m.windowTitle.substring(0, 60) : m.afk ? 'Idle' : 'Sem dados'}`}
                >
                  {m.minute % 10 === 0 && <span className="minute-label">:{String(m.minute).padStart(2, '0')}</span>}
                </div>
              ))}
            </div>
            {/* Detalhes dos minutos ativos */}
            <div className="minute-details">
              {minuteData.filter(m => m.active && m.appName).reduce((acc, m) => {
                const key = m.appName + '|' + m.windowTitle;
                const existing = acc.find(a => a.key === key);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ key, appName: m.appName, windowTitle: m.windowTitle, count: 1 });
                }
                return acc;
              }, [] as { key: string; appName: string; windowTitle: string; count: number }[])
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((item, i) => (
                  <div key={i} className="minute-detail-item">
                    <span className="window-app">{item.appName.replace('.exe', '')}</span>
                    <span className="window-title">{item.windowTitle.substring(0, 50)}</span>
                    <span className="window-time">{item.count}min</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Pie - Focus vs Idle */}
        <div className="chart-card">
          <h3>Ativo vs Idle</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={focusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {focusData.map((_, i) => (
                  <Cell key={i} fill={FOCUS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8 }}
                formatter={(value, name) => [`${value} min`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            <span className="legend-item"><span className="dot dot-active" /> Ativo: {activeMinutes}min</span>
            <span className="legend-item"><span className="dot dot-idle" /> Idle: {afkMinutes}min</span>
          </div>
        </div>

        {/* Bar - Alertas */}
        <div className="chart-card">
          <h3>Alertas por Nivel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { name: 'Gota', value: summary?.alertsLevel1 || 0, fill: '#f59e0b' },
              { name: 'Nudge', value: summary?.alertsLevel2 || 0, fill: '#f97316' },
              { name: 'Pulsos', value: summary?.alertsLevel3 || 0, fill: '#ef4444' },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {[{ fill: '#f59e0b' }, { fill: '#f97316' }, { fill: '#ef4444' }].map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* v2.0 — Category breakdown + Work Score */}
      {(categories.length > 0 || workScoreTimeline.some(h => h.avgWorkScore > 0)) && (
        <div className="charts-grid">

          {/* Stacked bar: Produtivo vs Distração por categoria */}
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
                        <div
                          className="category-bar-fill"
                          style={{ width: `${item.percentage}%`, background: meta.color }}
                        />
                      </div>
                      <div className="category-time">{formatDuration(item.totalSeconds)}</div>
                      <div className="category-pct">{item.percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Work Score por hora */}
          {workScoreTimeline.some(h => h.avgWorkScore > 0) && (
            <div className="chart-card">
              <h3>Work Score por Hora</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={workScoreTimeline
                    .filter(h => h.avgWorkScore > 0)
                    .map(h => ({
                      label: `${String(h.hour).padStart(2, '0')}h`,
                      score: h.avgWorkScore,
                      kpm: h.avgKeystrokeRate,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis dataKey="label" stroke="#555" fontSize={10} />
                  <YAxis stroke="#555" fontSize={10} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#12121e', border: '1px solid #333', borderRadius: 8 }}
                    formatter={(value, name) => [
                      `${value}${name === 'score' ? '%' : ' kpm'}`,
                      name === 'score' ? 'Work Score' : 'KPM',
                    ]}
                  />
                  <Bar dataKey="score" name="score" radius={[4, 4, 0, 0]}>
                    {workScoreTimeline
                      .filter(h => h.avgWorkScore > 0)
                      .map((h, i) => {
                        const c = h.avgWorkScore >= 70 ? '#22c55e' : h.avgWorkScore >= 40 ? '#f59e0b' : '#ef4444';
                        return <Cell key={i} fill={c} />;
                      })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Apps Section */}
      {apps.length > 0 && (
        <div className="charts-grid">
          {/* Bar horizontal - Tempo por app */}
          <div className="chart-card">
            <h3>Tempo por Aplicativo</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, apps.length * 40)}>
              <BarChart data={apps.slice(0, 10).map(a => ({
                name: a.appName.replace('.exe', ''),
                minutes: Math.round(a.totalSeconds / 60),
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={120} />
                <Tooltip
                  contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8 }}
                  formatter={(value) => [`${value} min`, 'Tempo']}
                />
                <Bar dataKey="minutes" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela de janelas/titulos */}
          <div className="chart-card">
            <h3>
              Detalhamento por Janela
              {selectedApp && (
                <button className="filter-clear" onClick={() => setSelectedApp('')}>
                  Limpar filtro
                </button>
              )}
            </h3>
            {/* Filtro por app */}
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
                    away_working:   '#4ade80',
                    break:          '#60a5fa',
                    procrastinating:'#f87171',
                    discarded:      '#6b7280',
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
                      <td className="idle-note">{r.note || <span className="idle-note-empty">—</span>}</td>
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
              Ultimos 30 dias
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
                  <div
                    key={i}
                    className="heatmap-cell"
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

      {/* Info rodape */}
      {summary?.firstActivityAt && (
        <div className="activity-range">
          Primeira atividade: {new Date(summary.firstActivityAt).toLocaleTimeString('pt-BR')}
          {summary.lastActivityAt && (
            <> &middot; Ultima: {new Date(summary.lastActivityAt).toLocaleTimeString('pt-BR')}</>
          )}
        </div>
      )}
    </div>
  );
}
