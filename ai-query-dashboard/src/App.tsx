import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  CircleHelp,
  Database,
  Edit3,
  LineChart,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Bookmark,
  Table2,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

type RenderSpec = {
  [key: string]: unknown;
  type: string;
  title?: string;
  value?: string;
  description?: string;
  summary?: string;
  bullets?: string[];
  details?: { label: string; value: unknown }[];
  sections?: { heading: string; items: { label: string; value: unknown }[] }[];
  dataSources?: string[];
  columns?: string[];
  rows?: unknown[][];
  data?: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  metricDescription?: string;
  unit?: string;
  color?: string;
};
type Card = {
  id: string | number;
  title: string;
  query: string;
  spec: RenderSpec;
  minimized: boolean;
  updated: string;
};

const starterCards: Card[] = [];

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "Not available";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function normalizeChartValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed !== "" && Number.isFinite(Number(trimmed))) return Number(trimmed);
  return value;
}

const textFields = new Set([
  "type", "title", "value", "description", "summary", "bullets", "details",
  "sections", "dataSources", "columns", "rows", "data", "xKey", "yKey",
  "yKeys", "xAxisLabel", "yAxisLabel", "metricDescription", "unit", "color",
]);

function Visual({ spec }: { spec: RenderSpec }) {
  if (spec.type === "metric")
    return (
      <div className="py-5">
        <div className="text-5xl font-semibold tracking-tight text-white">
          {spec.value || "—"} {spec.unit && <span className="text-lg font-medium text-slate-500">{spec.unit}</span>}
        </div>
        <p className="mt-2 text-sm text-slate-400">{spec.description}</p>
      </div>
    );
  if (spec.type === "text")
    return (
      <div className="space-y-4 py-5">
        {spec.title && (
          <h4 className="text-base font-semibold text-white">{spec.title}</h4>
        )}
        <p className="text-sm leading-7 text-slate-300">
          {spec.summary || spec.description || spec.value || "Response details"}
        </p>
        {spec.bullets && spec.bullets.length > 0 && (
          <ul className="space-y-2 border-l border-[#f0b35b]/40 pl-4 text-sm leading-6 text-slate-300">
            {spec.bullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        )}
        {spec.details && spec.details.length > 0 && (
          <dl className="grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-2">
            {spec.details.map((detail) => (
              <div key={detail.label}>
                <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">
                  {detail.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{displayValue(detail.value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {spec.sections && spec.sections.length > 0 && (
          <div className="space-y-4 border-t border-white/8 pt-4">
            {spec.sections.map((section) => (
              <section key={section.heading}>
                <h5 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{section.heading}</h5>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="rounded-lg bg-black/3 px-3 py-2">
                      <dt className="text-xs text-slate-500">{item.label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{displayValue(item.value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
        {Object.entries(spec).some(([key]) => !textFields.has(key)) && (
          <dl className="grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-2">
            {Object.entries(spec)
              .filter(([key]) => !textFields.has(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">{key}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{displayValue(value)}</dd>
                </div>
              ))}
          </dl>
        )}
      </div>
    );
  if (spec.type === "table")
    return (
      <div className="py-3">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr>
              {spec.columns?.map((column) => (
                <th
                  key={column}
                  className="border-b border-white/10 px-3 py-3 text-xs font-medium uppercase tracking-[.16em] text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows?.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-white/5 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-3 text-slate-300">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  const chartData = (spec.data || []).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeChartValue(value)])),
  );
  if (chartData.length === 0) {
    return <div className="grid min-h-40 place-items-center py-8 text-sm text-slate-500">No chart data available for this query.</div>;
  }
  const availableKeys = Object.keys(chartData[0] || {});
  const numericKeys = availableKeys.filter((key) => chartData.some((row) => typeof row[key] === "number"));
  const xKey = spec.xKey && availableKeys.includes(spec.xKey) ? spec.xKey : availableKeys[0] || "x";
  const yKey = spec.yKey && numericKeys.includes(spec.yKey) ? spec.yKey : numericKeys[0] || spec.yKey || availableKeys[1] || availableKeys[0] || "y";
  const seriesKeys = (spec.yKeys?.filter((key) => availableKeys.includes(key)) || []).length
    ? spec.yKeys!.filter((key) => availableKeys.includes(key))
    : [yKey];
  const common = {
    data: chartData,
    margin: { top: 12, right: 8, left: -18, bottom: 0 },
  };
  return (
    <div className="h-72 min-w-0 w-full overflow-x-auto pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: spec.color || "#f0b35b" }}
        />
        <span>Y: {spec.yAxisLabel || yKey}</span>
        <span>X: {spec.xAxisLabel || xKey}</span>
        {spec.metricDescription && <span className="text-slate-400">{spec.metricDescription}</span>}
      </div>
      <ResponsiveContainer width="100%" minWidth={420} height="100%">
        {spec.type === "pie" ? (
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "#171b25",
                border: "1px solid #ffffff1a",
                borderRadius: 8,
              }}
            />
            <Pie
              data={chartData}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={82}
              paddingAngle={3}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`slice-${index}`}
                  fill={["#f0b35b", "#79a8ff", "#73d6a5", "#d68cff", "#ff7f8a"][index % 5]}
                />
              ))}
            </Pie>
          </PieChart>
        ) : spec.type === "scatter" ? (
          <ScatterChart {...common}>
            <CartesianGrid stroke="#ffffff0d" />
            <XAxis dataKey={xKey} type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis dataKey={yKey} type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#171b25", border: "1px solid #ffffff1a", borderRadius: 8 }} />
            <Scatter data={chartData} fill={spec.color || "#79a8ff"} />
          </ScatterChart>
        ) : spec.type === "bar" || spec.type === "histogram" || spec.type === "stackedBar" ? (
          <BarChart {...common}>
            <CartesianGrid stroke="#ffffff0d" vertical={false} />
            <XAxis
              dataKey={xKey}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#171b25",
                border: "1px solid #ffffff1a",
                borderRadius: 8,
              }}
            />
            {seriesKeys.map((seriesKey, index) => (
              <Bar
                key={seriesKey}
                dataKey={seriesKey}
                fill={spec.color || ["#f0b35b", "#79a8ff", "#73d6a5", "#d68cff"][index % 4]}
                stackId={spec.type === "stackedBar" ? "stack" : undefined}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : spec.type === "line" ? (
          <RechartsLineChart {...common}>
            <CartesianGrid stroke="#ffffff0d" vertical={false} />
            <XAxis
              dataKey={xKey}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#171b25",
                border: "1px solid #ffffff1a",
                borderRadius: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={spec.color || "#79a8ff"}
              strokeWidth={3}
              dot={false}
            />
          </RechartsLineChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              <linearGradient id="cardArea" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={spec.color || "#f0b35b"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={spec.color || "#f0b35b"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff0d" vertical={false} />
            <XAxis
              dataKey={xKey}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#171b25",
                border: "1px solid #ffffff1a",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={spec.color || "#f0b35b"}
              fill="url(#cardArea)"
              strokeWidth={3}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function App() {
  const [cards, setCards] = useState(starterCards);
  const [maximizedId, setMaximizedId] = useState<string | number | null>(null);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [query, setQuery] = useState("");
  const queryInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("New chart");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/cards")
      .then((response) => response.json())
      .then((savedCards: { cardId: string; title: string; query: string; spec: RenderSpec }[]) => {
        setSavedIds(new Set(savedCards.map((card) => card.cardId)));
        setCards(savedCards.map((card) => ({ ...card, id: card.cardId, minimized: false, updated: "Saved in MongoDB" })));
      })
      .catch(() => undefined);
  }, []);
  const visible = cards.filter(
    (card) =>
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.query.toLowerCase().includes(search.toLowerCase()),
  );
  const runQuery = async () => {
    if (!query.trim()) {
      queryInputRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error("API unavailable");
      const result = await response.json();
      const spec = result.renderSpec || result;
      if (activeId)
        setCards((current) =>
          current.map((card) =>
            card.id === activeId
              ? { ...card, title, query, spec, updated: "Just now" }
              : card,
          ),
        );
      else
        setCards((current) => [
          ...current,
          {
            id: Date.now(),
            title,
            query,
            spec,
            minimized: false,
            updated: "Just now",
          },
        ]);
      setQuery("");
      setActiveId(null);
    } catch {
      alert(
        "Could not reach the query API. Start the Spring service on port 8080 and try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const saveCard = async (card: Card) => {
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: card.title, query: card.query, spec: card.spec }),
    });
    if (!response.ok) throw new Error("Could not save card");
    const saved = await response.json();
    setSavedIds((current) => new Set(current).add(saved.cardId));
  };
  const deleteCard = async (card: Card) => {
    if (savedIds.has(String(card.id))) await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    setCards((current) => current.filter((item) => item.id !== card.id));
  };
  const addCard = () => {
    setActiveId(null);
    setTitle("New chart");
    setQuery("");
  };
  const editCard = (card: Card) => {
    setActiveId(card.id);
    setTitle(card.title);
    setQuery(card.query);
  };
  return (
    <div className="app-shell theme-light min-h-screen bg-[#f4f6f8] text-slate-700">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#dfe4ea] bg-white px-5 py-6 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0b35b] text-[#15120d]">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="font-bold tracking-tight text-white">
              Queryboard
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[.18em] text-slate-500">
              AI workspace
            </div>
          </div>
        </div>
        <nav className="mt-12 space-y-1">
          <div className="flex items-center gap-3 rounded-lg bg-white/7 px-3 py-2.5 text-sm font-medium text-white">
            <PanelLeft size={17} />
            Overview
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-500">
            <Database size={17} />
            Data sources
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-500">
            <CircleHelp size={17} />
            Documentation
          </div>
        </nav>
        <div className="absolute bottom-6 left-7 right-7 border-t border-white/8 pt-5">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#6c5dd3] text-xs font-bold">
              AK
            </div>
            <div>
              <div className="text-xs font-medium text-white">Akshay Kumar</div>
              <div className="text-[11px] text-slate-500">Owner</div>
            </div>
            <MoreHorizontal className="ml-auto text-slate-500" size={16} />
          </div>
        </div>
      </aside>
      <main className="lg:ml-64">
        <header className="flex h-20 items-center justify-between border-b border-white/8 px-6 md:px-10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#f0b35b]">
              Workspace / Overview
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
              Insights
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2 md:flex">
              <Search size={15} className="text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cards"
                className="w-32 bg-transparent text-xs outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              onClick={addCard}
              className="flex items-center gap-2 rounded-lg bg-[#f0b35b] px-3.5 py-2.5 text-xs font-bold text-[#17130c] transition hover:bg-[#ffc875]"
            >
              <Plus size={16} /> Start a chart
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-6 py-9 md:px-10">
          <section className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-.04em] text-white">
                Your intelligence layer
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Ask questions, shape the answer, and keep the signal close.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              API connected
            </div>
          </section>
          <section className="mb-10 rounded-2xl border border-[#f0b35b]/25 bg-[#f0b35b]/6 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles size={16} className="text-[#f0b35b]" />
                Build an insight
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">
                {activeId ? "Editing card" : "New card"}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#0b0d12]/70 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#f0b35b]/60"
                placeholder="Card heading"
              />
              <input
                ref={queryInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && runQuery()}
                className="rounded-lg border border-white/10 bg-[#0b0d12]/70 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#f0b35b]/60"
                placeholder="Ask anything about your connected data..."
              />
              <button
                onClick={runQuery}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-xs font-bold text-[#15171d] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={15} />
                ) : (
                  <Sparkles size={15} />
                )}
                {loading ? "Thinking" : "Run query"}
              </button>
            </div>
          </section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">
                Live canvas
              </span>
              <span className="text-slate-600">/</span>
              <span>{visible.length} cards</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-600">
              Auto-saved
            </div>
          </div>
          <section className="grid gap-4 xl:grid-cols-2">
            {visible.map((card) => (
              <article
                key={card.id}
                className={`min-w-0 rounded-2xl border border-white/9 bg-[#11151d] px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,.12)] transition ${card.minimized ? "" : "min-h-[280px]"} ${maximizedId === card.id ? "card-is-maximized fixed inset-4 z-50 overflow-hidden" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/4 text-slate-400">
                      {card.spec.type === "table" ? (
                        <Table2 size={15} />
                      ) : card.spec.type === "metric" ? (
                        <BarChart3 size={15} />
                      ) : card.spec.type === "text" ? (
                        <Edit3 size={15} />
                      ) : (
                        <LineChart size={15} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {card.title}
                      </h3>
                      <p className="mt-1 truncate font-mono text-[10px] text-slate-600">
                        {card.query}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-slate-600">
                    <button
                      title={maximizedId === card.id ? "Restore card size" : "Maximize card"}
                      onClick={() =>
                        setMaximizedId((current) =>
                          current === card.id ? null : card.id,
                        )
                      }
                      className="rounded-md p-1.5 hover:bg-white/7 hover:text-white"
                    >
                      {maximizedId === card.id ? (
                        <Minimize2 size={15} />
                      ) : (
                        <Maximize2 size={15} />
                      )}
                    </button>
                    <button
                      title={savedIds.has(String(card.id)) ? "Saved in MongoDB" : "Save card in MongoDB"}
                      onClick={() => saveCard(card).catch(() => alert("Could not save this card."))}
                      className="rounded-md p-1.5 hover:bg-emerald-500/15 hover:text-emerald-600"
                    >
                      <Bookmark size={15} fill={savedIds.has(String(card.id)) ? "currentColor" : "none"} />
                    </button>
                    <button
                      title={card.minimized ? "Maximize card" : "Minimize card"}
                      onClick={() =>
                        setCards((current) =>
                          current.map((item) =>
                            item.id === card.id
                              ? { ...item, minimized: !item.minimized }
                              : item,
                          ),
                        )
                      }
                      className="rounded-md p-1.5 hover:bg-white/7 hover:text-white"
                    >
                      {card.minimized ? (
                        <Maximize2 size={15} />
                      ) : (
                        <Minimize2 size={15} />
                      )}
                    </button>
                    <button
                      title="Edit card"
                      onClick={() => editCard(card)}
                      className="rounded-md p-1.5 hover:bg-white/7 hover:text-white"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      title="Delete card"
                      onClick={() => deleteCard(card).catch(() => alert("Could not delete this card."))}
                      className="rounded-md p-1.5 hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {!card.minimized && (
                  <>
                    <div className="card-result-scroll mt-5 min-w-0">
                      <Visual spec={card.spec} />
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-white/7 pt-3">
                      <span className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-600">
                        {card.updated}
                      </span>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Check size={13} />
                        <span className="text-[11px]">Synced</span>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </section>
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
              <p className="text-sm text-slate-500">
                No cards match your search.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
