"use client";

import { useState } from "react";
import { Pie, PieChart, Cell } from "recharts";
import { ClientTimeAnalytics } from "@/lib/services/tickets";
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

// Canonical workflow order so slices are laid out consistently
const STATE_ORDER = [
  "PENDING", "ASSIGNED", "ON_SITE", "IN_PROGRESS",
  "PENDING_REPORT", "REVIEW", "PENDING_APPROVAL", "REOPENED",
  "COMPLETED",
];

const STATE_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
];

function fmtHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

interface Props {
  data: ClientTimeAnalytics[];
  loading: boolean;
}

const ALL_CLIENTS = "Todos";
const ALL_BRANCHES = "Todas";

export function TimePerStateChart({ data, loading }: Props) {
  const [clientId, setClientId] = useState<string>(ALL_CLIENTS);
  const [branchId, setBranchId] = useState<string>(ALL_BRANCHES);

  const selectedClient = clientId === ALL_CLIENTS ? null : data.find((c) => c.clientId === clientId);
  const branches = selectedClient?.branches ?? [];

  // Pick the set of entities whose avgByStatus we aggregate, narrowing from all
  // clients → one client → one branch as the filters tighten.
  let scoped: { avgByStatus: Record<string, number> }[];
  if (!selectedClient) {
    scoped = data;
  } else if (branchId === ALL_BRANCHES) {
    scoped = [selectedClient];
  } else {
    const branch = branches.find((b) => b.branchId === branchId);
    scoped = branch ? [branch] : [];
  }

  // When the scope is a single client/branch we use its averages directly;
  // across all clients we average each state over the clients that actually
  // spent time in it, so the pie reflects typical time-per-state rather than a
  // sum skewed by volume.
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const client of scoped) {
    for (const [status, hours] of Object.entries(client.avgByStatus)) {
      if (hours > 0) {
        sums[status] = (sums[status] ?? 0) + hours;
        counts[status] = (counts[status] ?? 0) + 1;
      }
    }
  }

  const rows = STATE_ORDER
    .filter((status) => counts[status] > 0)
    .map((status, i) => ({
      status,
      label: STATE_LABELS[status] ?? status,
      value: sums[status] / counts[status],
      fill: STATE_COLORS[i % STATE_COLORS.length],
    }));

  const hasData = rows.length > 0;

  const selector = (
    <div className="flex flex-wrap items-center gap-2">
      <div className=" grid grid-cols-2 gap-2">
        <Select
          value={clientId}
          onValueChange={(v) => {
            setClientId(v ?? ALL_CLIENTS);
            setBranchId(ALL_BRANCHES); // branches belong to a client — reset on change
          }}
        >
          <SelectTrigger aria-label="Cliente" size="default" className="min-w-44">
            <SelectValue placeholder="Cliente">
              {(value) =>
                value === ALL_CLIENTS
                  ? "Todos los clientes"
                  : data.find((c) => c.clientId === value)?.clientName ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={ALL_CLIENTS}>Todos los clientes</SelectItem>
            {data.map((c) => (
              <SelectItem key={c.clientId} value={c.clientId}>
                {c.clientName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClient && branches.length > 0 && (
          <Select value={branchId} onValueChange={(v) => setBranchId(v ?? ALL_BRANCHES)}>
            <SelectTrigger aria-label="Sucursal" size="default" className="min-w-44">
              <SelectValue placeholder="Sucursal">
                {(value) =>
                  value === ALL_BRANCHES
                    ? "Todas las sucursales"
                    : branches.find((b) => b.branchId === value)?.branchName ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value={ALL_BRANCHES}>Todas las sucursales</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.branchId} value={b.branchId}>
                  {b.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    );
  } else if (!hasData) {
    body = (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Sin datos de historial de estados</p>
      </div>
    );
  } else {
    const chartConfig: ChartConfig = Object.fromEntries(
      rows.map((r) => [r.status, { label: r.label, color: r.fill }])
    );
    body = (
      <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="status"
              className="min-w-[150px]"
              formatter={(value, name, item) => {
                const num = Number(value);
                return (
                  <>
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ background: item?.payload?.fill ?? item?.color }}
                    />
                    <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                      <span className="text-muted-foreground truncate max-w-[110px]">
                        {chartConfig[name as string]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {fmtHours(num)}
                      </span>
                    </div>
                  </>
                );
              }}
            />
          }
        />
        <Pie
          data={rows}
          dataKey="value"
          nameKey="status"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={2}
        >
          {rows.map((r) => (
            <Cell key={r.status} fill={r.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="status" />} className="flex-wrap" />
      </PieChart>
    </ChartContainer>
    );
  }

  return (
    <div className="space-y-3">
      {selector}
      {body}
    </div>
  );
}
