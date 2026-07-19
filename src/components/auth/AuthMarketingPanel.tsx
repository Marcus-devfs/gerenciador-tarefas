import { ShieldCheck, ListChecks, BarChart3, FileSpreadsheet, Clock } from "lucide-react";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Gestão de Tarefas",
    desc: "Crie, priorize e acompanhe tarefas com status, prazos, progresso e subtarefas.",
  },
  {
    icon: Clock,
    title: "Horas Contratadas",
    desc: "Acompanhe horas feitas e restantes no mês, com alerta antes de ultrapassar o limite.",
  },
  {
    icon: BarChart3,
    title: "Dashboards & Relatórios",
    desc: "Métricas consolidadas em painel diário com gráficos e lembretes.",
  },
  {
    icon: FileSpreadsheet,
    title: "Exportação Excel",
    desc: "Relatórios semanais completos para compartilhar com a gestão ou arquivar histórico.",
  },
];

export default function AuthMarketingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden bg-white border-r border-surface-200 flex-col">
      <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-brand-500/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-brand-300/15 blur-[110px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-12 py-11">
        <div className="flex items-center gap-3 mb-auto">
          <img src="/favicon.png" alt="Méliès" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-surface-900 font-bold text-[15px] leading-tight tracking-tight">Méliès</p>
            <p className="text-surface-400 text-[10px] uppercase tracking-widest font-medium">Sistema Interno</p>
          </div>
        </div>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full px-3 py-1 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-brand-700 text-[11px] font-medium tracking-wide uppercase">Ferramenta interna</span>
          </div>
          <h1 className="text-[42px] xl:text-5xl font-bold text-surface-900 leading-[1.12] mb-5 tracking-tight">
            Central de
            <br />
            <span className="text-brand-500">Gestão Operacional</span>
          </h1>
          <p className="text-surface-500 text-[15px] leading-relaxed max-w-[360px]">
            Acompanhe tarefas, horas contratadas e acesse métricas em tempo real — tudo em uma plataforma integrada.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-12">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={15} className="text-brand-600" />
              </div>
              <div>
                <p className="text-surface-800 font-semibold text-[13px] leading-tight mb-0.5">{title}</p>
                <p className="text-surface-400 text-[11px] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-brand-500/70" />
          <span className="text-surface-400 text-[11px]">Acesso restrito · apenas colaboradores autorizados</span>
        </div>
      </div>
    </div>
  );
}

export function AuthMobileBrand() {
  return (
    <div className="flex lg:hidden items-center gap-3 mb-10">
      <img src="/favicon.png" alt="Méliès" className="w-9 h-9 object-contain" />
      <div>
        <p className="font-bold text-surface-900 text-[15px] leading-tight">Méliès</p>
        <p className="text-surface-400 text-[10px] uppercase tracking-widest">Sistema Interno</p>
      </div>
    </div>
  );
}
