export type TaskStatus = "pendente" | "em_andamento" | "concluido" | "cancelado";
export type TaskPriority = "baixa" | "media" | "alta";

export interface Subtask {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedUserId: string;
  assignedToName: string;
  projeto?: string;
  category?: string;
  situacaoAtual?: string;
  impeditivo?: string;
  dueDate?: string;
  dataEntrega?: string;
  dataConclusao?: string;
  tempoEstimado?: number;
  tempoPrevisto?: number;
  createdAt: string;
  updatedAt: string;
  progress: number;
  subtasks: Subtask[];
}

export interface TasksData {
  tasks: Task[];
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const CATEGORIES = [
  "Desenvolvimento",
  "Infraestrutura",
  "Reunião",
  "Documentação",
  "Testes",
  "Suporte",
  "Outros",
];

