"use client";

import { useState, useEffect } from "react";
import {
  X, ChevronLeft, ChevronRight, AlertTriangle, Plus, Trash2,
  Bell, CalendarDays, BookOpen, Clock, Loader2, MessageSquare,
} from "lucide-react";
import type { Task, TaskStatus, TaskPriority, Subtask } from "@/types";
import { CATEGORIES } from "@/types";
import { useUpdateTask } from "@/hooks/useTasks";
import { useProjectsQuery } from "@/hooks/useProjects";
import { useNotasQuery, useCreateNota } from "@/hooks/useNotas";
import { NOTE_TYPE_COLOR, NOTE_TYPE_LABEL, DIAS_SEMANA } from "@/types/note";
import type { NoteType } from "@/types/note";
import TimeInput from "./TimeInput";

// ── constants ────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pendente",     label: "Pendente"      },
  { value: "em_andamento", label: "Em andamento"  },
  { value: "concluido",    label: "Concluído"     },
  { value: "cancelado",    label: "Cancelado"     },
];
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "alta",  label: "Alta"  },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];
const STATUS_BAR: Record<TaskStatus, string> = {
  pendente: "#94a3b8", em_andamento: "#3b82f6", concluido: "#f39519", cancelado: "#ef4444",
};
const STATUS_PILL: Record<TaskStatus, string> = {
  pendente: "bg-surface-100 text-surface-600",
  em_andamento: "bg-blue-50 text-blue-700 border border-blue-200",
  concluido: "bg-brand-50 text-brand-700 border border-brand-200",
  cancelado: "bg-red-50 text-red-600 border border-red-200",
};
const PRIORITY_PILL: Record<TaskPriority, string> = {
  alta: "bg-red-50 text-red-600 border border-red-200",
  media: "bg-amber-50 text-amber-600 border border-amber-200",
  baixa: "bg-surface-50 text-surface-500 border border-surface-200",
};

function generateSubId() {
  return `st_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

// ── section label ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-surface-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

// ── quick note form ───────────────────────────────────────────────────
function QuickNoteForm({ tarefaId, tarefaTitulo }: { tarefaId: string; tarefaTitulo: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<NoteType>("anotacao");
  const [titulo, setTitulo] = useState("");
  const [data] = useState(new Date().toISOString().split("T")[0]);
  const create = useCreateNota();

  async function handleSave() {
    if (!titulo.trim()) return;
    await create.mutateAsync({
      titulo: titulo.trim(), tipo, data,
      tarefaId, tarefaTitulo, conteudo: "",
    } as any);
    setTitulo("");
    setTipo("anotacao");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[12px] text-brand-600 border border-dashed border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
      >
        <Plus size={12} /> Adicionar nota / lembrete
      </button>
    );
  }

  return (
    <div className="border border-surface-200 rounded-xl p-3 space-y-2.5 bg-surface-50">
      <div className="flex gap-1.5">
        {(["reuniao", "anotacao", "lembrete"] as NoteType[]).map((t) => {
          const c = NOTE_TYPE_COLOR[t];
          return (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                tipo === t ? `${c.bg} ${c.text} border-current` : "bg-white text-surface-400 border-surface-200"
              }`}
            >
              {c.icon} {NOTE_TYPE_LABEL[t]}
            </button>
          );
        })}
      </div>
      <input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder={
          tipo === "lembrete" ? "ex: Envio de relatório..." :
          tipo === "reuniao"  ? "ex: Reunião de alinhamento..." :
          "Título da anotação..."
        }
        className="w-full px-2.5 py-1.5 text-xs border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setTitulo(""); }}
          className="flex-1 py-1.5 text-xs text-surface-500 border border-surface-200 rounded-lg hover:bg-white"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!titulo.trim() || create.isPending}
          className="flex-1 py-1.5 text-xs font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-60 flex items-center justify-center gap-1"
        >
          {create.isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          Salvar
        </button>
      </div>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────
interface Props {
  task: Task;
  taskIndex: number;
  taskCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  readOnly?: boolean;
}

export default function TaskDetailPanel({ task, taskIndex, taskCount, onClose, onPrev, onNext, readOnly = false }: Props) {
  const update = useUpdateTask();
  const { data: projects = [] } = useProjectsQuery();
  const { data: allNotas = [] } = useNotasQuery();

  // local state for text fields (save on blur)
  const [title, setTitle] = useState(task.title);
  const [situacaoAtual, setSituacaoAtual] = useState(task.situacaoAtual ?? "");
  const [impeditivo, setImpeditivo] = useState(task.impeditivo ?? "");
  const [tempoEstimado, setTempoEstimado] = useState(task.tempoEstimado?.toString() ?? "");
  const [tempoPrevisto, setTempoPrevisto] = useState(task.tempoPrevisto?.toString() ?? "");
  const [progress, setProgress] = useState(task.progress);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks ?? []);
  const [newSub, setNewSub] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    setSubtasks(task.subtasks ?? []);
  }, [task.id, task.subtasks]);

  function save(updates: Record<string, unknown>) {
    update.mutate({ id: task.id, updates: updates as any });
  }

  async function saveSubtasks(updated: Subtask[]) {
    setSubtasks(updated);
    setSavingSub(true);
    try {
      await update.mutateAsync({ id: task.id, updates: { subtasks: updated } });
    } finally {
      setSavingSub(false);
    }
  }

  function addSubtask() {
    if (!newSub.trim()) return;
    const updated = [...subtasks, { id: generateSubId(), title: newSub.trim(), status: "pendente" as TaskStatus }];
    setNewSub("");
    void saveSubtasks(updated);
  }

  function toggleSub(id: string) {
    const updated = subtasks.map((s) =>
      s.id === id ? { ...s, status: (s.status === "concluido" ? "pendente" : "concluido") as TaskStatus } : s
    );
    void saveSubtasks(updated);
  }

  function removeSub(id: string) {
    const updated = subtasks.filter((s) => s.id !== id);
    void saveSubtasks(updated);
  }

  const taskNotas = allNotas.filter((n) => n.tarefaId === task.id);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();

  const subDone = subtasks.filter((s) => s.status === "concluido").length;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Panel */}
      <div
        key={task.id}
        className="fixed right-0 top-0 bottom-0 z-40 w-[480px] max-w-[95vw] bg-white shadow-2xl flex flex-col border-l border-surface-200"
      >
        {/* Sticky header */}
        <div className="flex-shrink-0 border-b border-surface-200">
          {/* Status bar */}
          <div className="h-1 w-full" style={{ background: STATUS_BAR[task.status] }} />

          {/* Nav + close */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-50">
            <div className="flex items-center gap-1">
              <button
                onClick={onPrev}
                disabled={taskIndex === 0}
                className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 disabled:opacity-30 transition-colors"
                title="Tarefa anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] text-surface-400 tabular-nums px-1">
                {taskIndex + 1} / {taskCount}
              </span>
              <button
                onClick={onNext}
                disabled={taskIndex === taskCount - 1}
                className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 disabled:opacity-30 transition-colors"
                title="Próxima tarefa"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-surface-400">
              <Clock size={11} />
              atualizado {relTime(task.updatedAt)}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 hover:text-surface-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <div className="px-4 pb-3">
            {readOnly && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Somente visualização
                </span>
                <span className="text-[11px] text-surface-500">Responsável: <strong className="text-surface-700">{task.assignedToName}</strong></span>
              </div>
            )}
            {readOnly ? (
              <h2 className="text-base font-bold text-surface-900 px-1 py-0.5">{title}</h2>
            ) : (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title.trim() && title !== task.title) save({ title }); }}
              className="w-full text-base font-bold text-surface-900 bg-transparent border-none outline-none focus:bg-surface-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
            />
            )}

            {/* Pills */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {readOnly ? (
                <>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[task.status]}`}>
                    {STATUS_OPTIONS.find((o) => o.value === task.status)?.label}
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${PRIORITY_PILL[task.priority]}`}>
                    {PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label}
                  </span>
                </>
              ) : (
              <>
              <select
                value={task.status}
                onChange={(e) => save({ status: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border-none outline-none cursor-pointer ${STATUS_PILL[task.status]}`}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <select
                value={task.priority}
                onChange={(e) => save({ priority: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border-none outline-none cursor-pointer ${PRIORITY_PILL[task.priority]}`}
              >
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {task.projeto && (
                <span className="text-[11px] bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full font-medium">{task.projeto}</span>
              )}
              </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Situação atual */}
          <Section title="Situação atual">
            {readOnly ? (
              <p className="text-sm text-surface-700 whitespace-pre-wrap">{situacaoAtual || "—"}</p>
            ) : (
            <textarea
              value={situacaoAtual}
              onChange={(e) => setSituacaoAtual(e.target.value)}
              onBlur={() => save({ situacaoAtual })}
              rows={3}
              placeholder="O que está acontecendo com essa tarefa agora?"
              className="w-full px-3 py-2 text-sm text-surface-700 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
            />
            )}
          </Section>

          {/* Impeditivo */}
          <Section title="Impeditivo">
            {readOnly ? (
              <p className={`text-sm ${impeditivo ? "text-amber-700" : "text-surface-400"}`}>{impeditivo || "—"}</p>
            ) : (
            <div className="relative">
              {impeditivo && (
                <AlertTriangle size={13} className="absolute left-3 top-2.5 text-amber-500 shrink-0" />
              )}
              <input
                value={impeditivo}
                onChange={(e) => setImpeditivo(e.target.value)}
                onBlur={() => save({ impeditivo })}
                placeholder="Algum bloqueio? Deixe em branco se não houver."
                className={`w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${impeditivo ? "pl-8 text-amber-700" : ""}`}
              />
            </div>
            )}
          </Section>

          {/* Projeto / Categoria */}
          <Section title="Classificação">
            {readOnly ? (
              <div className="flex gap-2 text-xs text-surface-600">
                <span>{task.projeto || "Sem projeto"}</span>
                <span className="text-surface-300">·</span>
                <span>{task.category || "Sem categoria"}</span>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={task.projeto ?? ""}
                onChange={(e) => save({ projeto: e.target.value || undefined })}
                className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <select
                value={task.category ?? ""}
                onChange={(e) => save({ category: e.target.value || undefined })}
                className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Sem categoria</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            )}
          </Section>

          {/* Datas */}
          <Section title="Datas">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Prazo", field: "dueDate", value: task.dueDate },
                { label: "Entrega", field: "dataEntrega", value: task.dataEntrega },
                { label: "Conclusão", field: "dataConclusao", value: task.dataConclusao },
              ].map(({ label, field, value }) => (
                <div key={field}>
                  <p className="text-[10px] text-surface-400 mb-1">{label}</p>
                  {readOnly ? (
                    <p className="text-xs text-surface-600">{value || "—"}</p>
                  ) : (
                  <input
                    type="date"
                    defaultValue={value ?? ""}
                    onChange={(e) => save({ [field]: e.target.value || undefined })}
                    className="w-full text-xs border border-surface-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Tempo */}
          <Section title="Tempo (horas)">
            {readOnly ? (
              <div className="flex gap-4 text-xs text-surface-600">
                <span>Estimado: {tempoEstimado ? `${tempoEstimado}h` : "—"}</span>
                <span>Previsto: {tempoPrevisto ? `${tempoPrevisto}h` : "—"}</span>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-surface-400 mb-1">Estimado</p>
                <TimeInput
                  value={tempoEstimado}
                  onChange={setTempoEstimado}
                  onBlur={() => save({ tempoEstimado: tempoEstimado ? Number(tempoEstimado) : undefined })}
                  inputClassName="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="ex: 40"
                />
              </div>
              <div>
                <p className="text-[10px] text-surface-400 mb-1">Previsto</p>
                <TimeInput
                  value={tempoPrevisto}
                  onChange={setTempoPrevisto}
                  onBlur={() => save({ tempoPrevisto: tempoPrevisto ? Number(tempoPrevisto) : undefined })}
                  inputClassName={`text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                    tempoPrevisto && tempoEstimado && Number(tempoPrevisto) > Number(tempoEstimado)
                      ? "border-amber-300 text-amber-700 bg-amber-50"
                      : "border-surface-200"
                  }`}
                  placeholder="ex: 48"
                />
              </div>
            </div>
            )}
          </Section>

          {/* Progresso */}
          <Section title={`Progresso — ${progress}%`}>
            <div className="flex items-center gap-3">
              {!readOnly && (
              <input
                type="range" min={0} max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                onPointerUp={() => save({ progress })}
                className="flex-1 accent-brand-500 h-2"
              />
              )}
              {readOnly && <div className="flex-1" />}
              <span className="text-sm font-bold text-brand-600 tabular-nums w-10 text-right">{progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </Section>

          {/* Subtarefas */}
          <Section title={`Subtarefas ${subtasks.length > 0 ? `(${subDone}/${subtasks.length})` : ""}${savingSub ? " · salvando…" : ""}`}>
            <div className="space-y-1.5 mb-2">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  {readOnly ? (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sub.status === "concluido" ? "bg-brand-500 border-brand-500" : "border-surface-300"}`}>
                      {sub.status === "concluido" && (
                        <svg width="9" height="7" fill="none" viewBox="0 0 9 7">
                          <path d="M1 3.5l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  ) : (
                  <button onClick={() => toggleSub(sub.id)} type="button" className="shrink-0">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${sub.status === "concluido" ? "bg-brand-500 border-brand-500" : "border-surface-300"}`}>
                      {sub.status === "concluido" && (
                        <svg width="9" height="7" fill="none" viewBox="0 0 9 7">
                          <path d="M1 3.5l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                  )}
                  <span className={`flex-1 text-xs ${sub.status === "concluido" ? "line-through text-surface-400" : "text-surface-700"}`}>{sub.title}</span>
                  {!readOnly && (
                  <button
                    onClick={() => removeSub(sub.id)}
                    type="button"
                    className="p-1 rounded hover:bg-red-50 text-surface-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                  )}
                </div>
              ))}
            </div>
            {!readOnly && (
            <div className="flex gap-2">
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                placeholder="Adicionar subtarefa..."
                className="flex-1 text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                onClick={addSubtask}
                type="button"
                className="px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-600 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus size={11} /> Add
              </button>
            </div>
            )}
          </Section>

          {/* Notas vinculadas */}
          <Section title={`Notas vinculadas${taskNotas.length > 0 ? ` (${taskNotas.length})` : ""}`}>
            {taskNotas.length === 0 ? (
              <p className="text-[12px] text-surface-400 italic mb-2">Nenhuma nota ainda</p>
            ) : (
              <div className="space-y-2 mb-3">
                {taskNotas.map((nota) => {
                  const c = NOTE_TYPE_COLOR[nota.tipo];
                  const isHoje = nota.data === todayStr ||
                    (nota.recorrencia === "semanal" && nota.diasSemana?.includes(todayDow));
                  const recLabel = nota.recorrencia === "semanal" && nota.diasSemana?.length
                    ? "🔁 Toda " + nota.diasSemana.map((d) => DIAS_SEMANA[d]).join(", ")
                    : null;

                  return (
                    <div
                      key={nota.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${
                        nota.tipo === "lembrete"
                          ? "bg-purple-50 border-purple-100"
                          : nota.tipo === "reuniao"
                          ? "bg-blue-50 border-blue-100"
                          : "bg-amber-50 border-amber-100"
                      }`}
                    >
                      <span className="text-base shrink-0 mt-0.5">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[12px] font-semibold text-surface-800">{nota.titulo}</p>
                          {isHoje && (
                            <span className="text-[9px] font-bold bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">HOJE</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                            {NOTE_TYPE_LABEL[nota.tipo]}
                          </span>
                          {recLabel ? (
                            <span className="text-[10px] text-purple-600 font-medium">{recLabel}</span>
                          ) : (
                            <span className="text-[10px] text-surface-400">{nota.data}</span>
                          )}
                        </div>
                        {nota.conteudo && (
                          <p className="text-[11px] text-surface-600 mt-1 leading-relaxed line-clamp-2">{nota.conteudo}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!readOnly && <QuickNoteForm tarefaId={task.id} tarefaTitulo={task.title} />}
          </Section>

          {/* Meta */}
          <p className="text-[10px] text-surface-300 pb-2">
            Criado em {task.createdAt} · ID: {task.id.slice(0, 12)}…
          </p>
        </div>
      </div>
    </>
  );
}
