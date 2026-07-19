"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTaskStore } from "@/store/taskStore";
import type { Task, Subtask } from "@/types";
import type { UserListItem } from "@/types/user";

export function useTasksQuery() {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Erro ao buscar tarefas");
      return res.json();
    },
    staleTime: 1000 * 30,
  });
}

export function useUsersQuery() {
  return useQuery<UserListItem[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Erro ao buscar usuários");
      return res.json();
    },
    staleTime: 1000 * 60,
  });
}

export function useFilteredTasks(userId?: string, canViewTeam?: boolean) {
  const { data: allTasks = [] } = useTasksQuery();
  const filters = useTaskStore((s) => s.filters);

  return allTasks.filter((task) => {
    if (!canViewTeam && userId && task.assignedUserId !== userId) return false;
    if (filters.assignedUserId && task.assignedUserId !== filters.assignedUserId) return false;
    if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !task.title.toLowerCase().includes(q) &&
        !task.description?.toLowerCase().includes(q) &&
        !task.assignedToName.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });
}

/** @deprecated Use useUsersQuery */
export function useAllUsersQuery() {
  return useUsersQuery();
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error("Erro ao criar tarefa");
      return res.json() as Promise<Task>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Erro ao atualizar tarefa");
      return res.json() as Promise<Task>;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks"]);
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir tarefa");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
      updates,
    }: {
      taskId: string;
      subtaskId: string;
      updates: Partial<Omit<Subtask, "id">>;
    }) => {
      const tasks = queryClient.getQueryData<Task[]>(["tasks"]) ?? [];
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error("Tarefa não encontrada");

      const updatedSubtasks = task.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, ...updates } : s
      );
      const progress =
        updatedSubtasks.length > 0
          ? Math.round(
              (updatedSubtasks.filter((s) => s.status === "concluido").length /
                updatedSubtasks.length) *
                100
            )
          : task.progress;

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtasks: updatedSubtasks, progress }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar subtarefa");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
