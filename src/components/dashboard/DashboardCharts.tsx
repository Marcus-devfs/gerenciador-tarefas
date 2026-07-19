"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import type { Task } from "@/types";
import { STATUS_LABELS } from "@/types";
import { buildCollaboratorData, buildProjectData } from "@/lib/reportMetrics";

const STATUS_COLORS: Record<string, string> = {
  pendente: "#94a3b8",
  em_andamento: "#3b82f6",
  concluido: "#f39519",
  cancelado: "#ef4444",
};

interface Props {
  tasks: Task[];
  showCollaboratorChart?: boolean;
}

export default function DashboardCharts({ tasks, showCollaboratorChart = false }: Props) {
  const statusData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: tasks.filter((t) => t.status === key).length,
    color: STATUS_COLORS[key],
  })).filter((d) => d.value > 0);

  const projectData = buildProjectData(tasks);
  const collaboratorData = buildCollaboratorData(tasks);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Distribuição por status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v} tarefa(s)`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Tarefas por projeto</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectData} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="pendente" name="Pendente" fill="#94a3b8" stackId="a" />
              <Bar dataKey="em_andamento" name="Em andamento" fill="#3b82f6" stackId="a" />
              <Bar dataKey="concluido" name="Concluído" fill="#f39519" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showCollaboratorChart && collaboratorData.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Tarefas por colaborador</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, collaboratorData.length * 48)}>
            <BarChart data={collaboratorData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Legend iconSize={8} />
              <Bar dataKey="pendente" name="Pendente" fill="#94a3b8" stackId="a" />
              <Bar dataKey="em_andamento" name="Em andamento" fill="#3b82f6" stackId="a" />
              <Bar dataKey="concluido" name="Concluído" fill="#f39519" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
