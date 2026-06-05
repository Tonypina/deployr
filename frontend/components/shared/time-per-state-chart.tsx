"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ChevronLeft } from "lucide-react";
import { ClientTimeAnalytics } from "@/lib/services/tickets";
import { Button } from "@/components/ui/button";

const STATE_LABELS: Record<string, string> = {
  PENDING:          "Pendiente",
  ASSIGNED:         "Asignado",
  ON_SITE:          "En sitio",
  IN_PROGRESS:      "En progreso",
  PENDING_REPORT:   "P. Reporte",
  REVIEW:           "En revisión",
  PENDING_APPROVAL: "P. Aprobación",
  REOPENED:         "Reabierto",
  COMPLETED:        "Completado",
  CLOSED:           "Cerrado",
  CANCELLED:        "Cancelado",
  EXPIRED:          "Expirado",
};

// Canonical order so states always appear left-to-right in workflow order
const STATE_ORDER = [
  "PENDING", "ASSIGNED", "ON_SITE", "IN_PROGRESS",
  "PENDING_REPORT", "REVIEW", "PENDING_APPROVAL", "REOPENED",
  "COMPLETED",
];

const ENTITY_COLORS = ["#adc6ff", "#ffcf8f", "#3ce36a", "#818cf8", "#67e8f9"];

function fmtHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-white/10 px-3 py-2 text-xs min-w-[150px]"
      style={{ background: "rgba(20,20,20,0.95)", backdropFilter: "blur(12px)" }}
    >
      <p className="font-label-caps text-on-surface-variant mb-2">{label}</p>
      {payload.filter((e) => e.value > 0).map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-on-surface-variant truncate max-w-[110px]">{entry.name}</span>
          <span className="ml-auto pl-3 font-semibold" style={{ color: entry.color }}>
            {fmtHours(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Entity {
  id: string;
  name: string;
  avgByStatus: Record<string, number>;
}

interface Props {
  data: ClientTimeAnalytics[];
  loading: boolean;
}

export function TimePerStateChart({ data, loading }: Props) {
  const [drillClient, setDrillClient] = useState<{ id: string; name: string } | null>(null);

  // Top 5 clients by total avg time
  const topClients: Entity[] = [...data]
    .sort((a, b) => {
      const sum = (x: Record<string, number>) => Object.values(x).reduce((s, v) => s + v, 0);
      return sum(b.avgByStatus) - sum(a.avgByStatus);
    })
    .slice(0, 5)
    .map((c) => ({ id: c.clientId, name: c.clientName, avgByStatus: c.avgByStatus }));

  const entities: Entity[] = drillClient
    ? (data.find((c) => c.clientId === drillClient.id)?.branches ?? [])
        .slice(0, 5)
        .map((b) => ({ id: b.branchId, name: b.branchName, avgByStatus: b.avgByStatus }))
    : topClients;

  const presentStates = STATE_ORDER;

  type ChartRow = { state: string } & Record<string, string | number>;
  const rows: ChartRow[] = presentStates.map((status) => {
    const row: ChartRow = { state: STATE_LABELS[status] ?? status };
    for (const entity of entities) {
      row[entity.name] = entity.avgByStatus[status] ?? 0;
    }
    return row;
  });

  const hasData = entities.length > 0;

  if (loading) {
    return (
      <div className="h-56 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-56 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Sin datos de historial de estados</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {drillClient && (
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setDrillClient(null)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todos los clientes
          </Button>
          <span className="text-xs text-on-surface-variant">
            Sucursales de{" "}
            <span className="text-on-surface font-medium">{drillClient.name}</span>
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={rows}
          margin={{ top: 4, right: 8, left: -16, bottom: presentStates.length > 6 ? 40 : 0 }}
          barGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="state"
            tick={{
              fill: "#c1c6d7",
              fontSize: 11,
              ...(presentStates.length > 6 ? { textAnchor: "end" } : {}),
            }}
            angle={presentStates.length > 6 ? -35 : 0}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={fmtHours}
            tick={{ fill: "#c1c6d7", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#c1c6d7", paddingTop: 12 }}
          />
          {entities.map((entity, i) => (
            <Bar
              key={entity.id}
              dataKey={entity.name}
              fill={ENTITY_COLORS[i]}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
              style={{ cursor: drillClient ? "default" : "pointer" }}
              onClick={() => {
                if (!drillClient) {
                  setDrillClient({ id: entity.id, name: entity.name });
                }
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {!drillClient && hasData && (
        <p className="text-xs text-on-surface-variant text-center mt-1">
          Haz clic en la barra de un cliente para ver por sucursal
        </p>
      )}
    </div>
  );
}
