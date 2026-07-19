"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Task, TaskStatus, TaskPriority, Subtask } from "@/types";
import { CATEGORIES } from "@/types";
import { useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useProjectsQuery } from "@/hooks/useProjects";

interface Props {
  task?: Task | null;
  userId: string;
  userName: string;
  isAdmin: boolean;
  users: { id: string; email: string; name: string }[];
  onClose: () => void;
}

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

function generateSubId() {
  return `st_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400">{children}</span>
      <div className="flex-1 h-px bg-surface-100" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-surface-600 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";
const SELECT = `${INPUT} bg-white`;

export default function TaskModal({ task, userId, userName, isAdmin, users, onClose }: Props) {
  const create = useCreateTask();
  const update = useUpdateTask();
  const { data: projects = [] } = useProjectsQuery();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "pendente");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "media");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [dataEntrega, setDataEntrega] = useState(task?.dataEntrega ?? "");
  const [dataConclusao, setDataConclusao] = useState(task?.dataConclusao ?? "");
  const [category, setCategory] = useState(task?.category ?? "");
  const [projeto, setProjeto] = useState(task?.projeto ?? "");
  const [situacaoAtual, setSituacaoAtual] = useState(task?.situacaoAtual ?? "");
  const [impeditivo, setImpeditivo] = useState(task?.impeditivo ?? "");
  const [tempoEstimado, setTempoEstimado] = useState<string>(task?.tempoEstimado?.toString() ?? "");
  const [tempoPrevisto, setTempoPrevisto] = useState<string>(task?.tempoPrevisto?.toString() ?? "");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [assignedUserId, setAssignedUserId] = useState(task?.assignedUserId ?? userId);
  const [assignedToName, setAssignedToName] = useState(task?.assignedToName ?? userName);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);
  const [newSubtitle, setNewSubtitle] = useState("");

  useEffect(() => {
    const u = users.find((u) => u.id === assignedUserId);
    if (u) setAssignedToName(u.name);
  }, [assignedUserId, users]);

  function addSubtask() {
    if (!newSubtitle.trim()) return;
    setSubtasks((prev) => [...prev, { id: generateSubId(), title: newSubtitle.trim(), status: "pendente" }]);
    setNewSubtitle("");
  }

  function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  function toggleSubStatus(id: string) {
    setSubtasks((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: s.status === "concluido" ? "pendente" : "concluido" } : s)
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate,
      dataEntrega,
      dataConclusao,
      category,
      projeto,
      situacaoAtual: situacaoAtual.trim(),
      impeditivo: impeditivo.trim(),
      tempoEstimado: tempoEstimado ? Number(tempoEstimado) : undefined,
      tempoPrevisto: tempoPrevisto ? Number(tempoPrevisto) : undefined,
      progress,
      assignedUserId,
      assignedToName,
      subtasks,
    };

    if (task) {
      update.mutate({ id: task.id, updates: payload });
    } else {
      create.mutate(payload);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold text-surface-900 text-sm">
            {task ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ── Informações básicas ── */}
          <SectionTitle>Informações básicas</SectionTitle>

          <Field label="Título *">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={INPUT} placeholder="Título da tarefa" />
          </Field>

          <Field label="Descrição">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="Descreva a tarefa..." />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={SELECT}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Prioridade">
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={SELECT}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Projeto">
              <select value={projeto} onChange={(e) => setProjeto(e.target.value)} className={SELECT}>
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT}>
                <option value="">Sem categoria</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {isAdmin && (
            <Field label="Responsável">
              <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className={SELECT}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          )}

          {/* ── Andamento ── */}
          <SectionTitle>Andamento</SectionTitle>

          <Field label="Situação atual">
            <textarea value={situacaoAtual} onChange={(e) => setSituacaoAtual(e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="Descreva o status atual da tarefa..." />
          </Field>

          <Field label="Impeditivo (se houver)">
            <input value={impeditivo} onChange={(e) => setImpeditivo(e.target.value)} className={INPUT} placeholder="Ex: Aguardando acesso ao ambiente de produção" />
          </Field>

          {/* ── Datas ── */}
          <SectionTitle>Datas</SectionTitle>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Prazo (deadline)">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Data de entrega">
              <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Data de conclusão">
              <input type="date" value={dataConclusao} onChange={(e) => setDataConclusao(e.target.value)} className={INPUT} />
            </Field>
          </div>

          {/* ── Tempo ── */}
          <SectionTitle>Tempo (horas)</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tempo estimado">
              <input type="number" min="0" step="0.5" value={tempoEstimado} onChange={(e) => setTempoEstimado(e.target.value)} className={INPUT} placeholder="Ex: 40" />
            </Field>
            <Field label="Tempo previsto">
              <input type="number" min="0" step="0.5" value={tempoPrevisto} onChange={(e) => setTempoPrevisto(e.target.value)} className={INPUT} placeholder="Ex: 48" />
            </Field>
          </div>

          {/* ── Progresso ── */}
          {subtasks.length === 0 && (
            <>
              <SectionTitle>Progresso</SectionTitle>
              <Field label={`Progresso manual — ${progress}%`}>
                <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-brand-500" />
              </Field>
            </>
          )}

          {/* ── Subtarefas ── */}
          <SectionTitle>Subtarefas</SectionTitle>

          <div className="space-y-1.5 mb-2">
            {subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2 group">
                <button type="button" onClick={() => toggleSubStatus(sub.id)} className="shrink-0">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${sub.status === "concluido" ? "bg-brand-500 border-brand-500" : "border-surface-300"}`}>
                    {sub.status === "concluido" && (
                      <svg width="9" height="7" fill="none" viewBox="0 0 9 7">
                        <path d="M1 3.5l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
                <span className={`flex-1 text-xs ${sub.status === "concluido" ? "line-through text-surface-400" : "text-surface-700"}`}>{sub.title}</span>
                <button type="button" onClick={() => removeSubtask(sub.id)} className="p-1 rounded hover:bg-red-50 text-surface-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())} placeholder="Adicionar subtarefa..." className={`flex-1 ${INPUT} text-xs py-1.5`} />
            <button type="button" onClick={addSubtask} className="px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-600 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
              <Plus size={12} />
              Add
            </button>
          </div>

          {/* ── Ações ── */}
          <div className="flex gap-2 pt-3 border-t border-surface-100">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-surface-200 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
              {task ? "Salvar alterações" : "Criar tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
