"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, AlertTriangle, MessageSquare, ListChecks } from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { StatusBadge, PriorityBadge } from "./StatusBadge";
import { useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { useNotasQuery } from "@/hooks/useNotas";

// ── Inline dropdown helpers ───────────────────────────────────────────
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pendente",     label: "Pendente"     },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido",    label: "Concluído"    },
  { value: "cancelado",    label: "Cancelado"    },
];
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "alta",  label: "Alta"  },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

function InlinePill<T extends string>({
  value, options, onChange, renderLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  renderLabel: () => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function down(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full focus:outline-none hover:ring-2 hover:ring-brand-300/60 transition-all"
        title="Clique para alterar"
      >
        {renderLabel()}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-surface-200 rounded-xl shadow-lg py-1 min-w-[148px]">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-50 flex items-center justify-between transition-colors ${
                value === o.value ? "text-brand-600 font-semibold" : "text-surface-700"
              }`}
            >
              {o.label}
              {value === o.value && <span className="text-brand-500 text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline text cell (situação atual) ─────────────────────────────────
function InlineTextCell({
  value, onSave, maxLen = 60,
}: {
  value?: string; onSave: (v: string) => void; maxLen?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  function start(e: React.MouseEvent) {
    e.stopPropagation();
    setLocal(value ?? "");
    setEditing(true);
  }

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (local !== (value ?? "")) onSave(local);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
        rows={2}
        className="w-full text-xs border border-brand-400 rounded-md px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white shadow-sm"
        style={{ minWidth: 180 }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  const text = value?.trim();
  return (
    <span
      onClick={start}
      title={text ? text : "Clique para adicionar situação atual"}
      className={`block cursor-text hover:bg-surface-100 rounded px-1 py-0.5 -mx-1 transition-colors ${text ? "text-surface-600" : "text-surface-300 italic text-[11px]"}`}
    >
      {text ? (text.length > maxLen ? text.slice(0, maxLen) + "…" : text) : "— clique para editar"}
    </span>
  );
}

// ── Main table ────────────────────────────────────────────────────────
interface Props {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelect: (task: Task) => void;
  canDeleteFn: (task: Task) => boolean;
  readOnly?: boolean;
  showAssignee?: boolean;
}

export default function TaskTable({ tasks, selectedTaskId, onSelect, canDeleteFn, readOnly = false, showAssignee = false }: Props) {
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const { data: notas = [] } = useNotasQuery();

  const notaCount: Record<string, number> = {};
  for (const n of notas) {
    if (n.tarefaId) notaCount[n.tarefaId] = (notaCount[n.tarefaId] ?? 0) + 1;
  }

  function handleUpdate(id: string, updates: Partial<Task>) {
    updateTask.mutate({ id, updates });
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    if (!selectedTaskId) return;
    const idx = tasks.findIndex((t) => t.id === selectedTaskId);
    if (e.key === "ArrowDown" && idx < tasks.length - 1) {
      e.preventDefault();
      onSelect(tasks[idx + 1]);
    }
    if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      onSelect(tasks[idx - 1]);
    }
    if (e.key === "Escape") {
      onSelect(tasks[idx]); // re-emit to trigger close in parent
    }
  }, [selectedTaskId, tasks, onSelect]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-surface-200">
        <p className="text-sm text-surface-400">Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-50">
              {[
                { label: "Título",         w: "min-w-[220px]" },
                ...(showAssignee ? [{ label: "Colaborador", w: "min-w-[130px]" }] : []),
                { label: "Status",         w: "min-w-[120px]" },
                { label: "Prioridade",     w: "min-w-[90px]"  },
                { label: "Projeto",        w: "min-w-[120px]" },
                { label: "Situação atual", w: "min-w-[210px]" },
                { label: "Impeditivo",     w: "min-w-[160px]" },
                { label: "Prazo",          w: "min-w-[90px]"  },
                { label: "Progresso",      w: "min-w-[100px]" },
                ...(!readOnly ? [{ label: "", w: "min-w-[50px]" }] : []),
              ].map((c) => (
                <th
                  key={c.label}
                  className={`${c.w} px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400 border-b border-surface-200 whitespace-nowrap`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody onKeyDown={handleKeyDown}>
            {tasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              const count = notaCount[task.id] ?? 0;
              return (
                <tr
                  key={task.id}
                  tabIndex={0}
                  onClick={() => onSelect(task)}
                  className={`cursor-pointer transition-colors group border-l-2 outline-none focus:bg-brand-50 ${
                    isSelected
                      ? "bg-brand-50 border-l-brand-500"
                      : "hover:bg-surface-50/70 border-l-transparent"
                  }`}
                >
                  {/* Título + note badge */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-surface-900 leading-snug">
                        {task.title.length > 42 ? task.title.slice(0, 42) + "…" : task.title}
                      </span>
                      {task.subtasks.length > 0 && (
                        <span
                          title={`${task.subtasks.filter((s) => s.status === "concluido").length}/${task.subtasks.length} subtarefa${task.subtasks.length > 1 ? "s" : ""}`}
                          className="inline-flex items-center gap-1 text-[10px] bg-surface-100 text-surface-600 border border-surface-200 px-2 py-0.5 rounded-full font-medium shrink-0"
                        >
                          <ListChecks size={10} />
                          {task.subtasks.filter((s) => s.status === "concluido").length}/{task.subtasks.length}
                        </span>
                      )}
                      {count > 0 && (
                        <span
                          title={`${count} nota${count > 1 ? "s" : ""} vinculada${count > 1 ? "s" : ""}`}
                          className="inline-flex items-center gap-0.5 text-[10px] bg-brand-50 text-brand-600 border border-brand-200 px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        >
                          <MessageSquare size={9} />
                          {count}
                        </span>
                      )}
                    </div>
                  </td>

                  {showAssignee && (
                    <td className="px-3 py-2.5 border-b border-surface-100 align-middle text-xs text-surface-700 font-medium whitespace-nowrap">
                      {task.assignedToName}
                    </td>
                  )}

                  {/* Status — inline dropdown */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle">
                    {readOnly ? (
                      <StatusBadge status={task.status} />
                    ) : (
                    <InlinePill
                      value={task.status}
                      options={STATUS_OPTIONS}
                      onChange={(v) => handleUpdate(task.id, { status: v })}
                      renderLabel={() => <StatusBadge status={task.status} />}
                    />
                    )}
                  </td>

                  {/* Priority — inline dropdown */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle">
                    {readOnly ? (
                      <PriorityBadge priority={task.priority} />
                    ) : (
                    <InlinePill
                      value={task.priority}
                      options={PRIORITY_OPTIONS}
                      onChange={(v) => handleUpdate(task.id, { priority: v })}
                      renderLabel={() => <PriorityBadge priority={task.priority} />}
                    />
                    )}
                  </td>

                  {/* Projeto */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle text-xs text-surface-600">
                    {task.projeto
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 text-[11px] font-medium">{task.projeto}</span>
                      : <span className="text-surface-300">—</span>
                    }
                  </td>

                  {/* Situação atual — inline editable */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle text-xs">
                    {readOnly ? (
                      <span className="text-surface-600">{task.situacaoAtual || "—"}</span>
                    ) : (
                    <InlineTextCell
                      value={task.situacaoAtual}
                      onSave={(v) => handleUpdate(task.id, { situacaoAtual: v })}
                    />
                    )}
                  </td>

                  {/* Impeditivo */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle text-xs">
                    {task.impeditivo ? (
                      <span className="flex items-start gap-1 text-amber-600">
                        <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                        <span title={task.impeditivo}>
                          {task.impeditivo.length > 42 ? task.impeditivo.slice(0, 42) + "…" : task.impeditivo}
                        </span>
                      </span>
                    ) : (
                      <span className="text-surface-300">—</span>
                    )}
                  </td>

                  {/* Prazo */}
                  <td
                    className="px-3 py-2.5 border-b border-surface-100 align-middle text-xs tabular-nums text-surface-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {readOnly ? (
                      task.dueDate || "—"
                    ) : (
                    <input
                      type="date"
                      defaultValue={task.dueDate ?? ""}
                      onChange={(e) => handleUpdate(task.id, { dueDate: e.target.value || undefined })}
                      className="text-xs border-none bg-transparent outline-none cursor-pointer text-surface-600 w-28"
                    />
                    )}
                  </td>

                  {/* Progresso */}
                  <td className="px-3 py-2.5 border-b border-surface-100 align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden min-w-[50px]">
                        <div className="h-1.5 bg-brand-500 rounded-full" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="text-[11px] text-surface-500 tabular-nums shrink-0 w-8 text-right">{task.progress}%</span>
                    </div>
                  </td>

                  {/* Delete */}
                  {!readOnly && (
                  <td className="px-2 py-2.5 border-b border-surface-100 align-middle" onClick={(e) => e.stopPropagation()}>
                    {canDeleteFn(task) && (
                      <button
                        onClick={() => { if (confirm(`Excluir "${task.title}"?`)) deleteTask.mutate(task.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-surface-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
