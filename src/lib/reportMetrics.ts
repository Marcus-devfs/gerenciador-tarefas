import type { Task } from "@/types";

export function buildCollaboratorData(tasks: Task[]) {
  const map = new Map<string, { name: string; pendente: number; em_andamento: number; concluido: number; total: number }>();
  tasks.forEach((t) => {
    if (!map.has(t.assignedUserId)) {
      map.set(t.assignedUserId, { name: t.assignedToName, pendente: 0, em_andamento: 0, concluido: 0, total: 0 });
    }
    const c = map.get(t.assignedUserId)!;
    c.total++;
    if (t.status === "pendente") c.pendente++;
    else if (t.status === "em_andamento") c.em_andamento++;
    else if (t.status === "concluido") c.concluido++;
  });
  return Array.from(map.values()).map(({ name, ...rest }) => ({ name, ...rest }));
}

export function buildProjectData(tasks: Task[]) {
  const map = new Map<string, { pendente: number; em_andamento: number; concluido: number }>();
  tasks.forEach((t) => {
    const key = t.projeto || "Sem projeto";
    if (!map.has(key)) map.set(key, { pendente: 0, em_andamento: 0, concluido: 0 });
    const p = map.get(key)!;
    if (t.status !== "cancelado") p[t.status as keyof typeof p]++;
  });
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
}
