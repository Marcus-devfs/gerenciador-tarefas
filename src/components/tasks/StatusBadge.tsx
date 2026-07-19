import type { TaskStatus, TaskPriority } from "@/types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  pendente: "bg-surface-100 text-surface-500",
  em_andamento: "bg-blue-50 text-blue-600",
  concluido: "bg-brand-50 text-brand-600",
  cancelado: "bg-red-50 text-red-500",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  alta: "bg-red-50 text-red-500 border border-red-200",
  media: "bg-amber-50 text-amber-600 border border-amber-200",
  baixa: "bg-surface-50 text-surface-400 border border-surface-200",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
