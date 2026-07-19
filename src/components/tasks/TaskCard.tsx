"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckSquare, Square, Trash2, Edit3 } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { StatusBadge, PriorityBadge } from "./StatusBadge";
import { useUpdateSubtask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  canDelete?: boolean;
  readOnly?: boolean;
}

export default function TaskCard({ task, onEdit, canDelete, readOnly = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const updateSubtask = useUpdateSubtask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  function toggleSubtask(subtaskId: string, current: TaskStatus) {
    const next: TaskStatus = current === "concluido" ? "pendente" : "concluido";
    updateSubtask.mutate({ taskId: task.id, subtaskId, updates: { status: next } });
  }

  function handleDelete() {
    if (confirm(`Excluir "${task.title}"?`)) {
      deleteTask.mutate(task.id);
    }
  }

  const doneSubs = task.subtasks.filter((s) => s.status === "concluido").length;

  return (
    <div className="bg-white rounded-xl border border-surface-200 hover:border-surface-300 transition-all">
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.category && (
                <span className="text-[10px] text-surface-400 font-medium">{task.category}</span>
              )}
            </div>
            <h3 className="font-semibold text-surface-900 text-sm leading-snug">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-surface-500 mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
              <span>{task.assignedToName}</span>
              {task.dueDate && <span>· Prazo: {task.dueDate}</span>}
              {task.subtasks.length > 0 && (
                <span>· {doneSubs}/{task.subtasks.length} subtarefas</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!readOnly && (
            <>
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
              title="Editar"
            >
              <Edit3 size={14} />
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            )}
            </>
            )}
            {readOnly && (
              <button
                onClick={() => onEdit(task)}
                className="px-2 py-1 text-[10px] font-medium text-brand-600 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors"
              >
                Ver detalhes
              </button>
            )}
          </div>
        </div>

        {task.subtasks.length === 0 && task.progress > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-surface-400 mb-1">
              <span>Progresso</span>
              <span>{task.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-brand-500 rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {task.subtasks.length > 0 && (
          <>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-surface-400 mb-1">
                <span>Progresso</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-brand-500 rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-500 font-medium transition-colors"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Ocultar" : "Ver"} subtarefas ({task.subtasks.length})
            </button>
          </>
        )}
      </div>

      {expanded && task.subtasks.length > 0 && (
        <div className="border-t border-surface-100 px-4 md:px-5 py-3 space-y-2">
          {task.subtasks.map((sub) => (
            <div
              key={sub.id}
              className={`flex items-start gap-2.5 group ${readOnly ? "" : "cursor-pointer"}`}
              onClick={readOnly ? undefined : () => toggleSubtask(sub.id, sub.status)}
            >
              {sub.status === "concluido" ? (
                <CheckSquare size={15} className="text-brand-500 shrink-0 mt-0.5" />
              ) : (
                <Square size={15} className="text-surface-300 group-hover:text-surface-400 shrink-0 mt-0.5 transition-colors" />
              )}
              <span className={`text-xs leading-snug ${sub.status === "concluido" ? "line-through text-surface-400" : "text-surface-700"}`}>
                {sub.title}
              </span>
              {sub.dueDate && (
                <span className="ml-auto text-[10px] text-surface-400 shrink-0">{sub.dueDate}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
