"use client";

import { useState } from "react";
import { Plus, Users, Zap, KeyRound, UserCheck, UserX, ShieldAlert, Activity, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StatsCard } from "@/components/shared/stats-card";
import { PlanLimitBadge } from "@/components/shared/plan-limit-badge";
import { useTechnicians } from "@/lib/hooks/use-technicians";
import { useTickets } from "@/lib/hooks/use-tickets";
import { usePlanFeatures } from "@/lib/hooks/use-plan-features";
import { createTechnician, updateUser, resetUserPassword } from "@/lib/services/users";
import { Pagination } from "@/components/ui/pagination";
import { Ticket } from "@/lib/types";

// ── Schemas ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:      z.string().min(2, "Mínimo 2 caracteres"),
  email:     z.string().email("Email inválido"),
  password:  z.string().min(8, "Mínimo 8 caracteres"),
  phone:     z.string().optional(),
  expertise: z.string().optional(),
});

const resetSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const editSchema = z.object({
  name:      z.string().min(2, "Mínimo 2 caracteres"),
  email:     z.string().email("Email inválido"),
  phone:     z.string().optional(),
  expertise: z.string().optional(),
});

type FormValues  = z.infer<typeof schema>;
type ResetValues = z.infer<typeof resetSchema>;
type EditValues  = z.infer<typeof editSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const BUSY_STATUSES = new Set(["ASSIGNED", "ON_SITE", "IN_PROGRESS", "PENDING_REPORT"]);

const AVATAR_STYLES = [
  { bg: "bg-primary/20",   text: "text-primary"   },
  { bg: "bg-secondary/20", text: "text-secondary"  },
  { bg: "bg-tertiary/20",  text: "text-tertiary"   },
];

// ── Reset password inline form ────────────────────────────────────────────────

function ResetPasswordForm({ techId, onDone }: { techId: string; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(values: ResetValues) {
    setSaving(true);
    try {
      await resetUserPassword(techId, values.password);
      toast({ title: "Contraseña actualizada" });
      reset();
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex items-end gap-2 mt-3 pt-3 border-t border-outline-variant/30"
    >
      <div className="flex-1 grid gap-1">
        <Label className="text-xs text-on-surface-variant">Nueva contraseña temporal</Label>
        <Input
          type="password"
          placeholder="Mínimo 8 caracteres"
          {...register("password")}
          className={cn("h-8 text-sm", errors.password && "border-destructive")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" size="sm" disabled={saving} className="h-8">
        {saving ? "Guardando..." : "Guardar"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onDone} className="h-8">
        Cancelar
      </Button>
    </form>
  );
}

// ── Full edit inline form ─────────────────────────────────────────────────────

function EditTechnicianForm({ tech, onDone }: {
  tech: { id: string; name: string; email: string; phone?: string; expertise?: string };
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:      tech.name,
      email:     tech.email,
      phone:     tech.phone ?? "",
      expertise: tech.expertise ?? "",
    },
  });

  async function onSubmit(values: EditValues) {
    setSaving(true);
    try {
      await updateUser(tech.id, {
        name:      values.name,
        email:     values.email,
        phone:     values.phone || null,
        expertise: values.expertise || null,
      });
      toast({ title: "Técnico actualizado" });
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 pt-3 border-t border-outline-variant/30 grid gap-3 sm:grid-cols-2"
    >
      <div className="grid gap-1.5">
        <Label className="text-xs text-on-surface-variant">Nombre *</Label>
        <Input className={cn("h-8 text-sm", errors.name && "border-destructive")} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-on-surface-variant">Email *</Label>
        <Input type="email" className={cn("h-8 text-sm", errors.email && "border-destructive")} {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-on-surface-variant">Teléfono</Label>
        <Input className="h-8 text-sm" placeholder="+52 55 0000 0000" {...register("phone")} />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-on-surface-variant">Especialidad</Label>
        <Input className="h-8 text-sm" placeholder="Ej. HVAC, Refrigeración..." {...register("expertise")} />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone} className="h-8">Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving} className="h-8">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

// ── Load bar ──────────────────────────────────────────────────────────────────

function LoadBar({ ticket }: { ticket: Ticket | undefined }) {
  const pct = !ticket ? 0
    : ticket.status === "PENDING_REPORT" ? 100
    : ticket.status === "IN_PROGRESS"   ? 75
    : ticket.status === "ON_SITE"       ? 50
    : ticket.status === "ASSIGNED"      ? 25
    : 0;

  const color = pct === 100 ? "bg-violet-400"
    : pct >= 75 ? "bg-tertiary"
    : pct >= 50 ? "bg-cyan-400"
    : pct >= 25 ? "bg-primary"
    : "bg-outline-variant";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-on-surface-variant font-label-caps">{pct}%</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TechniciansPage() {
  const { technicians, total, page, limit, loading, refetch, goToPage } = useTechnicians();
  const { tickets: activeTickets } = useTickets({ limit: 100 });
  const { features } = usePlanFeatures();
  const atTechLimit = features?.techMax !== null && features?.techMax !== undefined && total >= features.techMax;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetingId, setResetingId]       = useState<string | null>(null);
  const [editExpertiseId, setEditExpertiseId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Map technicianId → active ticket
  const techTicketMap = new Map<string, Ticket>();
  for (const t of activeTickets) {
    if (BUSY_STATUSES.has(t.status)) {
      for (const tech of (t.technicians ?? [])) {
        if (!techTicketMap.has(tech.id)) techTicketMap.set(tech.id, t);
      }
    }
  }

  const activeTechs  = technicians.filter((t) => t.isActive).length;
  const inServiceNow = [...techTicketMap.keys()].filter((id) =>
    technicians.some((t) => t.id === id)
  ).length;
  const utilizationPct = activeTechs > 0 ? Math.round((inServiceNow / activeTechs) * 100) : 0;
  const mustChangePw   = technicians.filter((t) => t.mustChangePassword).length;

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await createTechnician(values);
      toast({ title: "Técnico creado exitosamente" });
      reset();
      setShowForm(false);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updateUser(id, { isActive: !isActive });
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div>
                    <div className="flex items-center gap-2 mt-0.5">
            <p className="text-on-surface-variant text-sm">Monitoreo de disponibilidad en tiempo real</p>
            <PlanLimitBadge used={total} max={features?.techMax} />
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} disabled={atTechLimit}>
          <Plus className="h-4 w-4 mr-1.5" />Nuevo técnico
        </Button>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatsCard title="Total técnicos"   value={total}                icon={Users}       color="text-primary" />
        <StatsCard title="Técnicos activos" value={activeTechs}          icon={UserCheck}   color="text-tertiary" />
        <StatsCard title="En servicio"      value={inServiceNow}         icon={Zap}         color="text-secondary" />
        <StatsCard title="Utilización"      value={`${utilizationPct}%`} icon={Activity}    color="text-primary"
          progress={utilizationPct} progressColor="bg-primary" />
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input placeholder="Carlos Mendoza" {...register("name")} className={cn(errors.name && "border-destructive")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="tecnico@empresa.com" {...register("email")} className={cn(errors.email && "border-destructive")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Contraseña temporal</Label>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...register("password")} className={cn(errors.password && "border-destructive")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Teléfono (opcional)</Label>
                <Input placeholder="+52 55 0000 0000" {...register("phone")} />
              </div>
              <div className="sm:col-span-2 grid gap-2">
                <Label>Especialidad (opcional)</Label>
                <Input placeholder="Ej. HVAC, Refrigeración comercial, Electrónica..." {...register("expertise")} />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Roster table */}
      {loading ? (
        <div className="glass-card rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-on-surface-variant">Cargando...</p>
        </div>
      ) : !technicians.length ? (
        <div className="glass-card rounded-xl px-6 py-14 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center">
            <Users className="h-6 w-6 text-on-surface-variant" />
          </div>
          <p className="font-semibold text-on-surface">Sin técnicos registrados</p>
          <p className="text-sm text-on-surface-variant">Agrega tu primer técnico para comenzar</p>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-xl overflow-hidden">
            {/* Warning banner */}
            {mustChangePw > 0 && (
              <div className="px-6 py-3 bg-secondary/10 border-b border-secondary/20 flex items-center gap-2 text-sm text-secondary">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {mustChangePw} técnico{mustChangePw !== 1 ? "s" : ""} debe{mustChangePw !== 1 ? "n" : ""} cambiar su contraseña
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    {["Técnico", "Estado", "Tarea actual", "Carga", "Acciones"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 font-label-caps text-on-surface-variant border-b border-outline-variant/30"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {technicians.map((tech, i) => {
                    const activeTicket = techTicketMap.get(tech.id);
                    const avatar = AVATAR_STYLES[i % AVATAR_STYLES.length];
                    const initials = tech.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                    const isOnTask = !!activeTicket;

                    return (
                      <>
                        <tr key={tech.id} className="hover:bg-white/5 transition-colors">
                          {/* Technician */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                avatar.bg, avatar.text
                              )}>
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-on-surface">{tech.name}</p>
                                  {tech.mustChangePassword && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-caps">
                                      CLAVE TEMP.
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-on-surface-variant">{tech.email}</p>
                                {tech.phone && (
                                  <p className="text-xs text-on-surface-variant">{tech.phone}</p>
                                )}
                                {tech.expertise && (
                                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-caps">
                                    {tech.expertise}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {!tech.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-highest font-label-caps text-on-surface-variant text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-outline-variant inline-flex" />
                                INACTIVO
                              </span>
                            ) : isOnTask ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-tertiary/10 font-label-caps text-tertiary text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping inline-flex" />
                                EN SERVICIO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 font-label-caps text-primary text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-flex" />
                                DISPONIBLE
                              </span>
                            )}
                          </td>

                          {/* Active task */}
                          <td className="px-6 py-4 text-sm max-w-[200px]">
                            {activeTicket ? (
                              <span className="text-on-surface truncate block">{activeTicket.title}</span>
                            ) : (
                              <span className="text-on-surface-variant italic">Sin tarea activa</span>
                            )}
                          </td>

                          {/* Load bar */}
                          <td className="px-6 py-4">
                            <LoadBar ticket={activeTicket} />
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Editar especialidad"
                                onClick={() => {
                                  setEditExpertiseId(editExpertiseId === tech.id ? null : tech.id);
                                  setResetingId(null);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-on-surface-variant" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Restablecer contraseña"
                                onClick={() => {
                                  setResetingId(resetingId === tech.id ? null : tech.id);
                                  setEditExpertiseId(null);
                                }}
                              >
                                <KeyRound className="h-3.5 w-3.5 text-on-surface-variant" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={tech.isActive ? "Desactivar" : "Activar"}
                                onClick={() => toggleActive(tech.id, tech.isActive)}
                              >
                                {tech.isActive
                                  ? <UserX className="h-3.5 w-3.5 text-destructive" />
                                  : <UserCheck className="h-3.5 w-3.5 text-tertiary" />}
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {resetingId === tech.id && (
                          <tr key={`${tech.id}-reset`}>
                            <td colSpan={5} className="px-6 pb-4">
                              <ResetPasswordForm techId={tech.id} onDone={() => setResetingId(null)} />
                            </td>
                          </tr>
                        )}
                        {editExpertiseId === tech.id && (
                          <tr key={`${tech.id}-edit`}>
                            <td colSpan={5} className="px-6 pb-4">
                              <EditTechnicianForm
                                tech={tech}
                                onDone={() => { setEditExpertiseId(null); refetch(); }}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} total={total} limit={limit} onPage={goToPage} />
        </>
      )}
    </div>
  );
}
