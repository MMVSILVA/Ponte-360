import React, { useState, useMemo } from "react";
import { Atendimento, PlanoDeAcao, METADATA_LABELS } from "../types";
import { 
  filtrarRegistros, 
  calcularMetricasGerais, 
  calcularIndicadoresAgregados, 
  getClassificacao 
} from "../utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { 
  Users, TrendingUp, Clock, Calendar, 
  Activity, BarChart4, AlertTriangle, ShieldCheck, ClipboardList, Briefcase
} from "lucide-react";

interface DashboardGestorProps {
  registros: Atendimento[];
  planos: PlanoDeAcao[];
  onAdicionarPlano: () => void;
}

const GESTORES_PROFILES = [
  { nome: "Carlos Mendes", cargo: "Gerente de Operações", area: "Operações" },
  { nome: "Fernanda Rocha", cargo: "Gerente de Administrativo", area: "Administrativo" },
  { nome: "Alexandre Silva", cargo: "Gerente de Manutenção", area: "Manutenção" },
  { nome: "Dra. Patrícia Lima", cargo: "Coordenadora de Qualidade & HSE", area: "Qualidade & HSE" }
];

export default function DashboardGestor({ registros, planos, onAdicionarPlano }: DashboardGestorProps) {
  // Gestor Profile State (defaults to Carlos Mendes)
  const [gestorIdx, setGestorIdx] = useState(0);
  const activeGestor = GESTORES_PROFILES[gestorIdx];

  // Filters available to Gestor (restricted area is locked to activeGestor.area)
  const [unidade, setUnidade] = useState("");
  const [setor, setSetor] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [turno, setTurno] = useState("");

  const setoresDisponiveis = METADATA_LABELS.setores[activeGestor.area as keyof typeof METADATA_LABELS.setores] || [];

  // Filter package
  const filtros = useMemo(() => ({
    unidade,
    area: activeGestor.area, // LOCKED!
    setor,
    cargo: "",
    turno,
    ciclo,
    tempoEmpresa: "",
    dataInicio: "",
    dataFim: ""
  }), [unidade, activeGestor.area, setor, turno, ciclo]);

  const registrosFiltrados = useMemo(() => {
    return filtrarRegistros(registros, filtros);
  }, [registros, filtros]);

  // Is sample too small to display? (Sigilo absoluto)
  const isSampleTooSmall = registrosFiltrados.length < 3;

  const metricas = useMemo(() => {
    return calcularMetricasGerais(registrosFiltrados);
  }, [registrosFiltrados]);

  const indicadores = useMemo(() => {
    return calcularIndicadoresAgregados(registrosFiltrados);
  }, [registrosFiltrados]);

  // Active general risk details
  const geralClassificacao = getClassificacao(metricas.indiceRiscoGeral);

  // Recharts Data - 7 Dimensions comparison
  const chartsData = useMemo(() => {
    return indicadores.map(ind => ({
      bloco: ind.nome.length > 20 ? ind.nome.substring(0, 20) + "..." : ind.nome,
      fullNome: ind.nome,
      "Risco (%)": ind.indiceRisco,
      "Fator Protetor (%)": ind.indiceFavorabilidade,
    }));
  }, [indicadores]);

  // Filter plans linked to this specific gestor's Area
  const planosLocais = useMemo(() => {
    return planos.filter(p => p.area === activeGestor.area);
  }, [planos, activeGestor.area]);

  const handleGestorChange = (idx: number) => {
    setGestorIdx(idx);
    setSetor(""); // reset sector
  };

  return (
    <div className="space-y-6" id="dashboard-gestor">
      
      {/* Selector de Perfil de Gestor (Para simulação no protótipo) */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Briefcase className="h-4 w-4" />
            Perfil do Gestor (Simulação de Escopo)
          </span>
          <h3 className="text-lg font-black mt-1">Olá, {activeGestor.nome}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Seu escopo de acesso está restrito à área: <span className="text-orange-500 font-bold">{activeGestor.area}</span>. Você só pode visualizar índices agregados e planos preventivos deste setor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="select-perfil-simulacao" className="text-xs text-slate-300 whitespace-nowrap font-bold uppercase tracking-wider">Trocar Perfil:</label>
          <select
            id="select-perfil-simulacao"
            value={gestorIdx}
            onChange={(e) => handleGestorChange(parseInt(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer"
          >
            {GESTORES_PROFILES.map((g, idx) => (
              <option key={idx} value={idx}>{g.nome} ({g.area})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Painel de Filtros Restritos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Filtros Disponíveis no seu Escopo ({activeGestor.area})
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Unidade */}
          <div>
            <label htmlFor="gestor-filter-unidade" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Unidade</label>
            <select
              id="gestor-filter-unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todas as Unidades</option>
              {METADATA_LABELS.unidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label htmlFor="gestor-filter-setor" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Setor Operacional</label>
            <select
              id="gestor-filter-setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos os Setores</option>
              {setoresDisponiveis.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Ciclo */}
          <div>
            <label htmlFor="gestor-filter-ciclo" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Ciclo Evaluativo</label>
            <select
              id="gestor-filter-ciclo"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos os Ciclos</option>
              <option value="Ciclo 2025">Ciclo 2025</option>
              <option value="Ciclo 2026">Ciclo 2026</option>
            </select>
          </div>

          {/* Turno */}
          <div>
            <label htmlFor="gestor-filter-turno" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Turno</label>
            <select
              id="gestor-filter-turno"
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos os Turnos</option>
              {METADATA_LABELS.turnos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bloqueio Ético de Privacidade */}
      {isSampleTooSmall ? (
        <div className="bg-rose-50/85 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto shadow-sm" id="gestor-anonymity-blocker">
          <div className="inline-flex bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 p-3 rounded-full border border-rose-200 dark:border-rose-900/30">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Amostra Insuficiente para Análise</h3>
          <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
            Seus filtros ativos retornaram apenas <span className="font-bold text-rose-600 dark:text-rose-400">{registrosFiltrados.length} atendimento(s)</span>. 
            Para impossibilitar de forma cabal o reconhecimento de respostas individuais na sua área, o painel restringe a exibição estatística para amostras contendo no mínimo **3 atendimentos**.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Dica: Amplie os filtros para abranger todos os setores ou unidades sob sua gestão.
          </p>
        </div>
      ) : (
        <>
          {/* Métricas e KPIs Restritos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="gestor-kpi-cards">
            {/* Amostra */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-500 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Amostra da Área</span>
                <span className="text-xl font-black text-slate-850 dark:text-white block leading-none mt-1">{metricas.totalAvaliacoes}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">atendimentos</span>
              </div>
            </div>

            {/* Risco Geral */}
            <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4 border-l-4`} style={{ borderLeftColor: generalRiskColor(metricas.indiceRiscoGeral) }}>
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700" style={{ color: generalRiskColor(metricas.indiceRiscoGeral) }}>
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Risco de Área</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-slate-850 dark:text-white leading-none">{metricas.indiceRiscoGeral}%</span>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${geralClassificacao.badgeClass}`}>
                    {geralClassificacao.label}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">média local</span>
              </div>
            </div>

            {/* Horas Extras */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-500 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Horas Extras</span>
                <span className="text-xl font-black text-slate-850 dark:text-white block leading-none mt-1">{metricas.horasExtrasMedia} h</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">média mensal</span>
              </div>
            </div>

            {/* Absenteísmo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="bg-sky-50 dark:bg-sky-950/20 text-sky-500 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/30">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Absenteísmo</span>
                <span className="text-xl font-black text-slate-850 dark:text-white block leading-none mt-1">{metricas.absenteismoMedio}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">ausências locais</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Radar local */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs lg:col-span-2 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <BarChart4 className="h-4 w-4 text-orange-500" />
                  Comparativo de Dimensões Psicossociais na Área
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                  Análise lado a lado de risco (barra escura) versus proteção favorável (barra colorida)
                </p>
              </div>

              <div className="h-[280px]" id="gestor-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="bloco" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
                    <Tooltip />
                    <Legend />
                    <Bar name="Risco (%)" dataKey="Risco (%)" fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar name="Fator Protetor (%)" dataKey="Fator Protetor (%)" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Planos de Ação e Alertas Preventivos */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  Planos de Ação Locais
                </h4>
                <button
                  id="btn-gestor-criar-plano"
                  onClick={onAdicionarPlano}
                  className="text-[9px] font-extrabold text-orange-500 hover:text-orange-600 border border-orange-200 dark:border-orange-900/40 hover:bg-orange-500/10 rounded px-2.5 py-1 uppercase tracking-wider font-sans cursor-pointer"
                >
                  Criar Plano
                </button>
              </div>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1" id="gestor-plans-list">
                {planosLocais.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500">
                    Nenhum plano de ação registrado para a área {activeGestor.area} ainda.
                  </div>
                ) : (
                  planosLocais.map((plano) => {
                    let statusColor = "bg-yellow-100 dark:bg-yellow-950/45 text-yellow-850 dark:text-yellow-400";
                    if (plano.status === "Concluído") statusColor = "bg-green-100 dark:bg-green-950/45 text-green-850 dark:text-green-400";
                    if (plano.status === "Pendente") statusColor = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";

                    return (
                      <div key={plano.id} className="p-3 border border-slate-150 dark:border-slate-800 rounded-lg space-y-2 text-xs bg-slate-50/50 dark:bg-slate-950/20">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-750 dark:text-slate-200 line-clamp-1">{plano.blocoNome}</span>
                          <span className={`px-2 py-0.5 rounded-[4px] font-bold text-[9px] uppercase ${statusColor}`}>
                            {plano.status}
                          </span>
                        </div>
                        <p className="text-slate-650 dark:text-slate-400 text-[11px] line-clamp-2">{plano.descricao}</p>
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-150 dark:border-slate-850">
                          <span>Prazo: {plano.prazo}</span>
                          <span className="font-bold text-slate-500 dark:text-slate-400">{plano.responsavel.split(" ")[0]}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Nota Ética de Escopo */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-3 text-slate-600 dark:text-slate-400 text-xs">
            <ShieldCheck className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold uppercase tracking-wide text-xs text-slate-800 dark:text-slate-200 block mb-1">Garantia Ética de Governança:</span>
              Como gerente de {activeGestor.area}, você **não possui acesso a respostas individuais de questionários ou metadados de correspondência pessoal**. Todo dado apresentado é resultado de médias matemáticas de pesquisa amostral sigilosa. O objetivo do instrumento é o aprimoramento contínuo dos nossos processos e do clima organizacional.
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// Helper colors for risk status cards
function generalRiskColor(risk: number): string {
  if (risk >= 70) return "#f43f5e"; // Rose / High Critical
  if (risk >= 40) return "#f59e0b"; // Amber / Warning
  return "#10b981"; // Emerald / Stable
}
