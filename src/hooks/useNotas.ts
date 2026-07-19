"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@/types/note";

export function useNotasQuery() {
  return useQuery<Note[]>({
    queryKey: ["notas"],
    queryFn: async () => {
      const res = await fetch("/api/notas");
      if (!res.ok) throw new Error("Erro ao buscar notas");
      return res.json();
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nota: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nota),
      });
      if (!res.ok) throw new Error("Erro ao criar nota");
      return res.json() as Promise<Note>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notas"] }),
  });
}

export function useUpdateNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      const res = await fetch(`/api/notas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nota");
      return res.json() as Promise<Note>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notas"] }),
  });
}

export function useDeleteNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir nota");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notas"] }),
  });
}
