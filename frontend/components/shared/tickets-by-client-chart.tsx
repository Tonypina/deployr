"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTicketsByRange } from "@/lib/hooks/use-tickets-by-range";
import { Ticket } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

type Preset = "30d" | "6m" | "year" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  "30d": "Últimos 30 días",
  "6m": "Últimos 6 meses",
  year: "Año actual",
  custom: "Rango personalizado",
};

interface Series {
  key: string;
  name: string;
  color: string;
}

interface Range {
  from: Date;
  to: Date;
}

// Resolve the selected preset (and any custom inputs) to a concrete date range.
// Returns null when a custom range is incomplete or invalid so the chart can
// prompt the user instead of fetching every ticket.
function computeRange(preset: Preset, customFrom: string, customTo: string): Range | null {
  const now = new Date();
  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to: now };
  }
  if (preset === "6m") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return { from, to: now };
  }
  if (preset === "year") {
    return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to: now };
  }
  // custom
  if (!customFrom || !customTo) return null;
  const from = new Date(`${customFrom}T00:00:00`);
  const to = new Date(`${customTo}T23:59:59.999`);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return null;
  return { from, to };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function buildChartData(tickets: Ticket[], from: Date, to: Date) {
  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  // Short windows read better day-by-day; longer ones collapse to months.
  const granularity: "day" | "month" = spanDays <= 45 ? "day" : "month";
  const multiYear = from.getFullYear() !== to.getFullYear();

  // Ordered, gap-free buckets spanning the whole range.
  const buckets: { key: string; label: string }[] = [];
  if (granularity === "day") {
    const cur = startOfDay(from);
    const end = startOfDay(to);
    while (cur <= end) {
      buckets.push({ key: dayKey(cur), label: `${cur.getDate()} ${MONTHS[cur.getMonth()]}` });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end) {
      const label = multiYear
        ? `${MONTHS[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`
        : MONTHS[cur.getMonth()];
      buckets.push({ key: monthKey(cur), label });
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  const keyOf = (d: Date) => (granularity === "day" ? dayKey(d) : monthKey(d));

  // Count tickets per clientId per bucket.
  const counts: Record<string, Record<string, number>> = {};
  const nameById: Record<string, string> = {};
  for (const t of tickets) {
    if (!t.clientId || !t.client) continue;
    const bk = keyOf(new Date(t.createdAt));
    if (!counts[t.clientId]) counts[t.clientId] = {};
    counts[t.clientId][bk] = (counts[t.clientId][bk] ?? 0) + 1;
    nameById[t.clientId] = t.client.name;
  }

  // Top 3 clients by total tickets in range.
  const totals = Object.entries(counts).map(([clientId, perBucket]) => ({
    clientId,
    name: nameById[clientId] ?? clientId,
    total: Object.values(perBucket).reduce((a, b) => a + b, 0),
    perBucket,
  }));
  totals.sort((a, b) => b.total - a.total);
  const top3 = totals.slice(0, 3);

  // Stable series keys (client names may contain spaces — not valid CSS var names)
  const series: Series[] = top3.map((client, i) => ({
    key: `client${i}`,
    name: client.name,
    color: SERIES_COLORS[i],
  }));

  const rows = buckets.map((b) => {
    const row: Record<string, string | number> = { label: b.label };
    top3.forEach((client, idx) => {
      row[`client${idx}`] = client.perBucket[b.key] ?? 0;
    });
    return row;
  });

  return { rows, series };
}

export function TicketsByClientChart() {
  const [preset, setPreset] = useState<Preset>("year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );
  const fromISO = range?.from.toISOString() ?? "";
  const toISO = range?.to.toISOString() ?? "";

  const { tickets, loading } = useTicketsByRange(fromISO, toISO);
  const gradId = useId().replace(/:/g, "");
  const { rows, series } = useMemo(
    () => (range ? buildChartData(tickets, range.from, range.to) : { rows: [], series: [] }),
    [tickets, range]
  );
  const hasData = series.length > 0;

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
        <SelectTrigger aria-label="Rango de fechas" size="default" className="min-w-44">
          <SelectValue placeholder="Rango" />
        </SelectTrigger>
        <SelectContent align="start">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
            <SelectItem key={p} value={p}>
              {PRESET_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Desde"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-7 w-auto px-2 py-1 text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            aria-label="Hasta"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-7 w-auto px-2 py-1 text-xs"
          />
        </div>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (!range) {
    body = (
      <div className="h-72 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Selecciona un rango de fechas válido</p>
      </div>
    );
  } else if (loading) {
    body = (
      <div className="h-72 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    );
  } else if (!hasData) {
    body = (
      <div className="h-72 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Sin datos para el rango seleccionado</p>
      </div>
    );
  } else {
    const chartConfig: ChartConfig = Object.fromEntries(
      series.map((s) => [s.key, { label: s.name, color: s.color }])
    );
    body = (
      <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
        <AreaChart accessibilityLayer data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={`var(--color-${s.key})`} stopOpacity={0.3} />
                <stop offset="60%" stopColor={`var(--color-${s.key})`} stopOpacity={0.08} />
                <stop offset="100%" stopColor={`var(--color-${s.key})`} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} minTickGap={16} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--border)" }} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              fill={`url(#${gradId}-${s.key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    );
  }

  return (
    <div className="space-y-3">
      {controls}
      {body}
    </div>
  );
}
