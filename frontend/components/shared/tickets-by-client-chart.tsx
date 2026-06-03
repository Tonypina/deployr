"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTicketsByYear } from "@/lib/hooks/use-tickets-by-year";
import { Ticket } from "@/lib/types";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CLIENT_COLORS = ["#adc6ff", "#ffcf8f", "#3ce36a"];

function buildChartData(tickets: Ticket[]) {
  // Count tickets per clientId per month
  const counts: Record<string, Record<number, number>> = {};
  for (const t of tickets) {
    if (!t.clientId || !t.client) continue;
    const month = new Date(t.createdAt).getMonth(); // 0-11
    if (!counts[t.clientId]) counts[t.clientId] = {};
    counts[t.clientId][month] = (counts[t.clientId][month] ?? 0) + 1;
  }

  // Sum totals per client to find top 3
  const totals = Object.entries(counts).map(([clientId, monthly]) => ({
    clientId,
    name: tickets.find((t) => t.clientId === clientId)?.client?.name ?? clientId,
    total: Object.values(monthly).reduce((a, b) => a + b, 0),
    monthly,
  }));
  totals.sort((a, b) => b.total - a.total);
  const top3 = totals.slice(0, 3);

  // Build chart rows — one per month
  return {
    rows: MONTHS.map((month, i) => {
      const row: Record<string, string | number> = { month };
      for (const client of top3) {
        row[client.name] = client.monthly[i] ?? 0;
      }
      return row;
    }),
    clients: top3,
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-white/10 px-3 py-2 text-xs"
      style={{ background: "rgba(20,20,20,0.95)", backdropFilter: "blur(12px)" }}
    >
      <p className="font-label-caps text-on-surface-variant mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-on-surface-variant">{entry.name}</span>
          <span className="ml-auto pl-4 font-semibold" style={{ color: entry.color }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  year?: number;
}

export function TicketsByClientChart({ year = new Date().getFullYear() }: Props) {
  const { tickets, loading } = useTicketsByYear(year);
  const { rows, clients } = buildChartData(tickets);
  const hasData = clients.length > 0;

  return (
    <div className="w-full">
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      ) : !hasData ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Sin datos para {year}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#c1c6d7", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#c1c6d7", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "#c1c6d7", paddingTop: 12 }}
            />
            {clients.map((client, i) => (
              <Line
                key={client.clientId}
                type="monotone"
                dataKey={client.name}
                stroke={CLIENT_COLORS[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
