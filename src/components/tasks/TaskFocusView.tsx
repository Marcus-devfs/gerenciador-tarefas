"use client";

import { useMemo } from "react";
import { AlertTriangle, FolderOpen } from "lucide-react";
import type { Task } from "@/types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  tasks: Task[];
  selectedTaskId?: string | null;
  onSelect: (task: Task) => void;
}

function updatedAtMs(task: Task): number {
  return new Date(task.updatedAt).getTime() || 0;
}

function groupByProject(tasks: Task[]): { project: string; tasks: Task[] }[] {
  const map = new Map<string, Task[]>();

  for (const task of tasks) {
    const key = task.projeto?.trim() || "Sem projeto";
    const list = map.get(key);
    if (list) list.push(task);
    else map.set(key, [task]);
  }

  for (const list of map.values()) {
    list.sort((a, b) => updatedAtMs(b) - updatedAtMs(a));
  }

  return Array.from(map.entries())
    .map(([project, grouped]) => ({ project, tasks: grouped }))
    .sort((a, b) => updatedAtMs(b.tasks[0]) - updatedAtMs(a.tasks[0]));
}

export default function TaskFocusView({ tasks, selectedTaskId, onSelect }: Props) {
  const groups = useMemo(() => groupByProject(tasks), [tasks]);

  return (
    <div className="space-y-4">
      {groups.map(({ project, tasks: projectTasks }) => {
        const blockedCount = projectTasks.filter((t) => t.impeditivo).length;

        return (
          <section
            key={project}
            className="bg-white rounded-xl border border-surface-200 overflow-hidden"
          >
            <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-100 bg-surface-50/80">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen size={14} className="text-brand-600 shrink-0" />
                <h2 className="text-sm font-semibold text-surface-900 truncate">{project}</h2>
                <span className="text-[11px] text-surface-400 font-medium shrink-0">
                  {projectTasks.length} tarefa{projectTasks.length !== 1 ? "s" : ""}
                </span>
              </div>
              {blockedCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
                  <AlertTriangle size={11} />
                  {blockedCount} impeditivo{blockedCount !== 1 ? "s" : ""}
                </span>
              )}
            </header>

            <ul className="divide-y divide-surface-100">
              {projectTasks.map((task) => {
                const selected = selectedTaskId === task.id;
                const blocked = Boolean(task.impeditivo);

                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(task)}
                      className={`w-full text-left px-4 py-3.5 transition-colors
                        ${selected ? "bg-brand-50/70" : "hover:bg-surface-50"}
                        ${blocked ? "border-l-2 border-l-amber-400" : "border-l-2 border-l-transparent"}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-surface-900 leading-snug">
                          {task.title}
                        </h3>
                        <StatusBadge status={task.status} />
                      </div>

                      {task.description ? (
                        <p className="text-xs text-surface-500 leading-relaxed mb-2.5 line-clamp-3">
                          {task.description}
                        </p>
                      ) : (
                        <p className="text-xs text-surface-300 italic mb-2.5">Sem descrição</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-0.5">
                            Situação atual
                          </p>
                          <p className="text-xs text-surface-700 leading-relaxed">
                            {task.situacaoAtual?.trim() || (
                              <span className="text-surface-300">—</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-0.5">
                            Impeditivo
                          </p>
                          {task.impeditivo?.trim() ? (
                            <p className="flex items-start gap-1.5 text-xs text-amber-700 leading-relaxed">
                              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                              <span>{task.impeditivo}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-surface-300">Nenhum</p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
