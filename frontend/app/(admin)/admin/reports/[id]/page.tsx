"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, GripVertical, Star, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReportTemplateField, FieldType } from "@/lib/types";
import { useReportTemplate } from "@/lib/hooks/use-report-template";
import { usePageTitle } from "@/lib/page-title";
import {
  updateTemplate, deleteTemplate as deleteTemplateService, setDefaultTemplate,
  addTemplateField, updateTemplateField, deleteTemplateField, reorderTemplateField,
} from "@/lib/services/report-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const nameSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
});

const fieldSchema = z.object({
  label: z.string().min(1, "Requerido"),
  type: z.enum(["TEXT", "TEXTAREA", "DATE", "NUMBER", "PHOTO", "MULTISELECT", "SIGNATURE"]),
  required: z.boolean(),
});

type NameForm = z.infer<typeof nameSchema>;
type FieldForm = z.infer<typeof fieldSchema>;
type FieldPayload = FieldForm & { options: string[] };

const fieldTypeLabel: Record<FieldType, string> = {
  TEXT: "Texto corto",
  TEXTAREA: "Texto largo",
  DATE: "Fecha",
  NUMBER: "Número",
  PHOTO: "Foto",
  MULTISELECT: "Selección múltiple",
  SIGNATURE: "Firma",
};

export default function ReportTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [localFields, setLocalFields] = useState<ReportTemplateField[]>([]);

  const nameForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const { template, loading, refetch } = useReportTemplate(id);
  usePageTitle(template?.name ?? "Plantilla");

  useEffect(() => {
    if (template) {
      nameForm.reset({ name: template.name, description: template.description ?? "" });
      setLocalFields([...template.fields].sort((a, b) => a.order - b.order));
    }
  }, [template, nameForm]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f.id === active.id);
    const newIndex = localFields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(localFields, oldIndex, newIndex);
    setLocalFields(reordered);

    try {
      await Promise.all(reordered.map((f, i) => reorderTemplateField(id, f.id, i + 1)));
      refetch();
    } catch {
      toast({ variant: "destructive", title: "Error al reordenar" });
      setLocalFields([...template!.fields].sort((a, b) => a.order - b.order));
    }
  }

  async function saveName(data: NameForm) {
    setActing(true);
    try {
      await updateTemplate(id, data);
      toast({ title: "Plantilla actualizada" });
      setEditingName(false);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function setDefault() {
    setActing(true);
    try {
      await setDefaultTemplate(id);
      toast({ title: "Plantilla establecida como predeterminada" });
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function deleteTemplate() {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    try {
      await deleteTemplateService(id);
      toast({ title: "Plantilla eliminada" });
      router.replace("/admin/reports");
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  async function addField(payload: FieldPayload) {
    setActing(true);
    try {
      await addTemplateField(id, { ...payload, order: localFields.length + 1 });
      toast({ title: "Campo agregado" });
      setAddingField(false);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function saveField(fieldId: string, payload: FieldPayload) {
    setActing(true);
    try {
      const currentOrder = (localFields.findIndex((f) => f.id === fieldId) + 1) || 1;
      await updateTemplateField(id, fieldId, { ...payload, order: currentOrder });
      toast({ title: "Campo actualizado" });
      setEditingFieldId(null);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function deleteField(fieldId: string) {
    if (!confirm("¿Eliminar este campo?")) return;
    try {
      await deleteTemplateField(id, fieldId);
      toast({ title: "Campo eliminado" });
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  const dndDisabled = editingFieldId !== null || addingField;

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!template) return null;

  return (
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reports"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1" />
        {template.isDefault ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
            <Star className="h-3 w-3" />Predeterminada
          </span>
        ) : (
          <Button variant="outline" size="sm" onClick={setDefault} disabled={acting}>
            <Star className="h-3.5 w-3.5 mr-1" />Establecer predeterminada
          </Button>
        )}
        {!template.isDefault && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={deleteTemplate}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
          </Button>
        )}
      </div>

      {/* Name / description */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Información</CardTitle>
            {!editingName && (
              <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>Editar</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingName ? (
            <form onSubmit={nameForm.handleSubmit(saveName)} className="grid gap-3">
              <div className="grid gap-2">
                <Label>Nombre *</Label>
                <Input className={cn(nameForm.formState.errors.name && "border-destructive")} {...nameForm.register("name")} />
                {nameForm.formState.errors.name && <p className="text-xs text-destructive">{nameForm.formState.errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Input {...nameForm.register("description")} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingName(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={acting}>{acting ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          ) : (
            <div className="text-sm space-y-1">
              <p className="font-medium">{template.name}</p>
              {template.description && <p className="text-muted-foreground">{template.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Asociada a {template._count.clients} cliente{template._count.clients !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Campos
              <span className="ml-2 text-sm font-normal text-muted-foreground">({localFields.length})</span>
            </CardTitle>
            {!addingField && (
              <Button variant="outline" size="sm" onClick={() => setAddingField(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Agregar campo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {localFields.length === 0 && !addingField && (
            <p className="text-sm text-muted-foreground">Sin campos. Agrega el primero.</p>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3">
                {localFields.map((field, index) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    index={index}
                    editingFieldId={editingFieldId}
                    setEditingFieldId={setEditingFieldId}
                    saveField={saveField}
                    deleteField={deleteField}
                    acting={acting}
                    disabled={dndDisabled}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {addingField && (
            <div className="border border-primary/40 rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Nuevo campo</p>
              <FieldFormInner
                initialValues={{ type: "TEXTAREA", required: false, options: [] }}
                onSubmit={addField}
                onCancel={() => setAddingField(false)}
                acting={acting}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── SortableField ─────────────────────────────────────────────────────────────

function SortableField({
  field,
  index,
  editingFieldId,
  setEditingFieldId,
  saveField,
  deleteField,
  acting,
  disabled,
}: {
  field: ReportTemplateField;
  index: number;
  editingFieldId: string | null;
  setEditingFieldId: (id: string | null) => void;
  saveField: (fieldId: string, payload: FieldPayload) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  acting: boolean;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="border border-border rounded-lg"
    >
      {editingFieldId === field.id ? (
        <div className="p-4">
          <FieldFormInner
            initialValues={{ label: field.label, type: field.type, required: field.required, options: field.options }}
            onSubmit={(payload) => saveField(field.id, payload)}
            onCancel={() => setEditingFieldId(null)}
            acting={acting}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            className={cn("touch-none text-muted-foreground shrink-0", disabled ? "cursor-default opacity-40" : "cursor-grab")}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{field.label}</span>
              {field.required && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Requerido</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fieldTypeLabel[field.type as FieldType]}
              {field.type === "MULTISELECT" && ` · ${field.options.length} opciones`}
              {" · "}{index + 1}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setEditingFieldId(field.id)}>Editar</Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteField(field.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FieldFormInner owns its own form + options state ─────────────────────────

function FieldFormInner({
  initialValues,
  onSubmit,
  onCancel,
  acting,
}: {
  initialValues?: { label?: string; type?: FieldType; required?: boolean; options?: string[] };
  onSubmit: (payload: FieldPayload) => void;
  onCancel: () => void;
  acting: boolean;
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FieldForm>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: initialValues?.label ?? "",
      type: initialValues?.type ?? "TEXTAREA",
      required: initialValues?.required ?? false,
    },
  });

  const [options, setOptions] = useState<string[]>(initialValues?.options ?? []);
  const [newOption, setNewOption] = useState("");
  const watchedType = useWatch({ control, name: "type" });

  function addOption() {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  }

  function handleFormSubmit(data: FieldForm) {
    onSubmit({ ...data, options: data.type === "MULTISELECT" ? options : [] });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 grid gap-1.5">
        <Label>Etiqueta *</Label>
        <Input
          placeholder="Ej. Observaciones del técnico"
          className={cn(errors.label && "border-destructive")}
          {...register("label")}
        />
        {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label>Tipo</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register("type")}
        >
          <option value="TEXTAREA">Texto largo</option>
          <option value="TEXT">Texto corto</option>
          <option value="DATE">Fecha</option>
          <option value="NUMBER">Número</option>
          <option value="PHOTO">Foto</option>
          <option value="MULTISELECT">Selección múltiple</option>
          <option value="SIGNATURE">Firma</option>
        </select>
      </div>

      <div className="flex items-end pb-1">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="req-field" className="h-4 w-4 rounded" {...register("required")} />
          <Label htmlFor="req-field">Campo requerido</Label>
        </div>
      </div>

      {/* Options editor — only for MULTISELECT */}
      {watchedType === "MULTISELECT" && (
        <div className="sm:col-span-2 grid gap-2">
          <Label>Opciones</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Escribir opción y presionar Enter o +"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
            />
            <Button type="button" variant="outline" size="icon" onClick={addOption}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {options.length === 0 && (
            <p className="text-xs text-muted-foreground">Agrega al menos una opción.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted border border-border"
              >
                {opt}
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="sm:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={acting}>{acting ? "Guardando..." : "Guardar campo"}</Button>
      </div>
    </form>
  );
}
