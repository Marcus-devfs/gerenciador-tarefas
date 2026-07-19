"use client";



import { useState, useCallback } from "react";

import { Plus, Search, X, Filter, Eye, Focus, Table2 } from "lucide-react";

import { useTaskStore, DEFAULT_FILTERS } from "@/store/taskStore";

import { useFilteredTasks, useUsersQuery } from "@/hooks/useTasks";

import { useUserRole } from "@/hooks/useUserRole";

import TaskTable from "@/components/tasks/TaskTable";

import TaskFocusView from "@/components/tasks/TaskFocusView";

import TaskModal from "@/components/tasks/TaskModal";

import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";

import type { Task, TaskStatus, TaskPriority } from "@/types";



interface Props {

  isAdmin: boolean;

  userId: string;

  userEmail: string;

  userName: string;

}



type ViewMode = "tabela" | "foco";



const STATUS_PILLS: { value: TaskStatus; label: string }[] = [

  { value: "pendente",     label: "Pendente"     },

  { value: "em_andamento", label: "Em andamento" },

  { value: "concluido",    label: "Concluído"    },

  { value: "cancelado",    label: "Cancelado"    },

];



const PRIORITY_PILLS: { value: TaskPriority; label: string }[] = [

  { value: "alta",  label: "Alta"  },

  { value: "media", label: "Média" },

  { value: "baixa", label: "Baixa" },

];



const PILL_ON  = "bg-brand-700 text-white border-brand-700 shadow-sm";

const PILL_OFF = "bg-transparent text-surface-600 border-surface-200 hover:bg-surface-50 hover:border-surface-300 hover:text-surface-800";



export default function TarefasClient({ isAdmin, userId, userEmail, userName }: Props) {

  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [view, setView] = useState<ViewMode>("foco");



  const { filters, setFilters, resetFilters } = useTaskStore();

  const { isTeamLeader, canViewTeam, subordinates, canEditTask, teamLabel } = useUserRole(isAdmin);

  const tasks = useFilteredTasks(userId, canViewTeam);

  const { data: users = [] } = useUsersQuery();



  const teamMembers = isTeamLeader ? subordinates : [];



  function toggleStatus(s: TaskStatus) {

    const next = filters.status.includes(s)

      ? filters.status.filter((x) => x !== s)

      : [...filters.status, s];

    setFilters({ status: next });

  }



  function togglePriority(p: TaskPriority) {

    const next = filters.priority.includes(p)

      ? filters.priority.filter((x) => x !== p)

      : [...filters.priority, p];

    setFilters({ priority: next });

  }



  const isDefaultStatus =

    filters.status.length === DEFAULT_FILTERS.status.length &&

    filters.status.every((s) => DEFAULT_FILTERS.status.includes(s));



  const hasActiveFilter =

    !isDefaultStatus ||

    filters.priority.length > 0 ||

    filters.assignedUserId !== "" ||

    filters.search !== "";



  const canDelete = (task: Task) => !isTeamLeader && (isAdmin || task.assignedUserId === userId);



  const selectedTaskLive = selectedTask

    ? tasks.find((t) => t.id === selectedTask.id) ?? selectedTask

    : null;



  const selectedIndex = selectedTaskLive ? tasks.findIndex((t) => t.id === selectedTaskLive.id) : -1;

  const panelReadOnly = selectedTaskLive ? !canEditTask(selectedTaskLive, userId) : false;



  const handleSelect = useCallback((task: Task) => setSelectedTask(task), []);

  const handlePrev = useCallback(() => {

    if (selectedIndex > 0) setSelectedTask(tasks[selectedIndex - 1]);

  }, [selectedIndex, tasks]);

  const handleNext = useCallback(() => {

    if (selectedIndex < tasks.length - 1) setSelectedTask(tasks[selectedIndex + 1]);

  }, [selectedIndex, tasks]);



  return (

    <>

      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div>

            <h1 className="text-xl font-bold text-surface-900">Tarefas</h1>

            {teamLabel && (

              <p className="text-xs text-brand-600 font-medium mt-0.5 flex items-center gap-1">

                <Eye size={12} /> {teamLabel}

              </p>

            )}

            <div className="mt-2.5 flex items-center bg-surface-100 rounded-lg p-0.5 gap-0.5 w-fit">

              <button

                type="button"

                onClick={() => setView("tabela")}

                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                  ${view === "tabela" ? "bg-white shadow-sm text-surface-900" : "text-surface-400 hover:text-surface-700"}`}

              >

                <Table2 size={12} /> Visão geral

              </button>

              <button

                type="button"

                onClick={() => setView("foco")}

                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                  ${view === "foco" ? "bg-white shadow-sm text-surface-900" : "text-surface-400 hover:text-surface-700"}`}

              >

                <Focus size={12} /> Foco

              </button>

            </div>

          </div>

          {!isTeamLeader && (

            <button

              onClick={() => setNewTaskOpen(true)}

              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"

            >

              <Plus size={16} /> Nova tarefa

            </button>

          )}

        </div>



        <div className="bg-white rounded-xl border border-surface-200 p-4 space-y-4">

          <div className="relative">

            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />

            <input

              type="text"

              placeholder="Buscar tarefas..."

              value={filters.search}

              onChange={(e) => setFilters({ search: e.target.value })}

              className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"

            />

          </div>



          <div className="h-px bg-surface-100" />



          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">

            {isTeamLeader && teamMembers.length > 0 && (

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">

                  Colaborador

                </p>

                <select

                  value={filters.assignedUserId}

                  onChange={(e) => setFilters({ assignedUserId: e.target.value })}

                  className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"

                >

                  <option value="">Todos</option>

                  {teamMembers.map((u) => (

                    <option key={u.id} value={u.id}>{u.name}</option>

                  ))}

                </select>

              </div>

            )}



            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">

                Status da tarefa

              </p>

              <div className="flex flex-wrap gap-1">

                {STATUS_PILLS.map(({ value, label }) => {

                  const active = filters.status.includes(value);

                  return (

                    <button

                      key={value}

                      onClick={() => toggleStatus(value)}

                      className={`px-3 py-1 rounded-md text-[12px] font-medium border transition-all ${active ? PILL_ON : PILL_OFF}`}

                    >

                      {label}

                    </button>

                  );

                })}

              </div>

            </div>



            <div className="w-px self-stretch bg-surface-100 shrink-0" />



            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">

                Prioridade

              </p>

              <div className="flex flex-wrap gap-1">

                {PRIORITY_PILLS.map(({ value, label }) => {

                  const active = filters.priority.includes(value);

                  return (

                    <button

                      key={value}

                      onClick={() => togglePriority(value)}

                      className={`px-3 py-1 rounded-md text-[12px] font-medium border transition-all ${active ? PILL_ON : PILL_OFF}`}

                    >

                      {label}

                    </button>

                  );

                })}

              </div>

            </div>



            <div className="ml-auto flex flex-col items-end gap-1.5 self-center">

              {hasActiveFilter && (

                <button

                  onClick={resetFilters}

                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-surface-400 hover:text-surface-700 border border-surface-200 rounded-md hover:bg-surface-50 transition-colors"

                >

                  <X size={11} /> Resetar

                </button>

              )}

            </div>

          </div>

        </div>



        {tasks.length === 0 ? (

          <div className="text-center py-16 bg-white rounded-xl border border-surface-200">

            <Filter size={32} className="mx-auto text-surface-300 mb-3" />

            <p className="text-sm font-medium text-surface-500">Nenhuma tarefa encontrada</p>

            <p className="text-xs text-surface-400 mt-1">

              {hasActiveFilter

                ? "Tente ajustar os filtros"

                : isTeamLeader

                ? "Nenhum colaborador vinculado possui tarefas ainda"

                : "Crie sua primeira tarefa"}

            </p>

          </div>

        ) : view === "foco" ? (

          <TaskFocusView

            tasks={tasks}

            selectedTaskId={selectedTaskLive?.id ?? null}

            onSelect={handleSelect}

          />

        ) : (

          <TaskTable

            tasks={tasks}

            selectedTaskId={selectedTaskLive?.id ?? null}

            onSelect={handleSelect}

            canDeleteFn={canDelete}

            readOnly={isTeamLeader}

            showAssignee={canViewTeam}

          />

        )}

      </div>



      {selectedTaskLive && (

        <TaskDetailPanel

          key={selectedTaskLive.id}

          task={selectedTaskLive}

          taskIndex={selectedIndex}

          taskCount={tasks.length}

          onClose={() => setSelectedTask(null)}

          onPrev={handlePrev}

          onNext={handleNext}

          readOnly={panelReadOnly}

        />

      )}



      {newTaskOpen && (

        <TaskModal

          task={null}

          userId={userId}

          userName={userName}

          isAdmin={isAdmin}

          users={users.length > 0 ? users : [{ id: userId, email: userEmail, name: userName }]}

          onClose={() => setNewTaskOpen(false)}

        />

      )}

    </>

  );

}


