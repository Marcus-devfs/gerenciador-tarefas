"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserSettingsResponse } from "@/types/project";

export function useSettingsQuery() {
  return useQuery<UserSettingsResponse>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Erro ao buscar configurações");
      return res.json();
    },
    staleTime: 1000 * 60,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      managerEmail?: string;
      managerName?: string;
      emailSignature?: string;
      emailSignatureImage?: string | null;
      emailSignatureImageMime?: string;
      horasContratadasMes?: number | null;
    }) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao salvar configurações");
      }
      return res.json() as Promise<UserSettingsResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: {
      newPassword: string;
      confirmPassword: string;
    }) => {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao alterar senha");
      }
      return res.json();
    },
  });
}
