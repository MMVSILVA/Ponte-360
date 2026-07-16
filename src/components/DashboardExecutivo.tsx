import React, { useState, useMemo } from "react";
import { Atendimento, METADATA_LABELS, BLOCOS_CONFIG } from "../types";
import { 
  filtrarRegistros, 
  calcularMetricasGerais, 
  calcularIndicadoresAgregados, 
  getClassificacao 
} from "../utils";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar
} from "recharts";
import { 
  Filter, Award, ShieldAlert, Users, TrendingUp, Clock, Calendar, 
  Activity, RefreshCw, BarChart4, Grid, AlertTriangle, ToggleLeft, ToggleRight,
  Download
} from "lucide-react";
import { jsPDF } from "jspdf";

interface DashboardExecutivoProps {
  registros: Atendimento[];
  onResetDatabase: () => void;
}

export default function DashboardExecutivo({ registros, onResetDatabase }: DashboardExecutivoProps) {
  // Filter States
  const [unidade, setUnidade] = useState("");
  const [area, setArea] = useState("");
  const [setor, setSetor] = useState("");
  const [cargo, setCargo] = useState("");
  const [turno, setTurno] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [tempoEmpresa, setTempoEmpresa] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Toggle View State: "Risco" (Higher is Worse, red is critical) vs "Proteção" (Higher is Better, green is positive)
  const [viewType, setViewType] = useState<"Risco" | "Proteção">("Risco");

  // Filter values
  const filtros = useMemo(() => ({
    unidade,
    area,
    setor,
    cargo,
    turno,
    ciclo,
    tempoEmpresa,
    dataInicio,
    dataFim
  }), [unidade, area, setor, cargo, turno, ciclo, tempoEmpresa, dataInicio, dataFim]);

  // Filtered list
  const registrosFiltrados = useMemo(() => {
    return filtrarRegistros(registros, filtros);
  }, [registros, filtros]);

  // Is sample too small to display? (Preserve absolute anonymity)
  const isSampleTooSmall = registrosFiltrados.length < 3;

  // Metadata labels
  const setoresDisponiveis = area ? METADATA_LABELS.setores[area as keyof typeof METADATA_LABELS.setores] || [] : [];

  const handleAreaChange = (selectedArea: string) => {
    setArea(selectedArea);
    setSetor("");
  };

  const clearFilters = () => {
    setUnidade("");
    setArea("");
    setSetor("");
    setCargo("");
    setTurno("");
    setCiclo("");
    setTempoEmpresa("");
    setDataInicio("");
    setDataFim("");
  };

  // Metrics
  const metricas = useMemo(() => {
    return calcularMetricasGerais(registrosFiltrados);
  }, [registrosFiltrados]);

  // Aggregate indicators
  const indicadores = useMemo(() => {
    return calcularIndicadoresAgregados(registrosFiltrados);
  }, [registrosFiltrados]);

  // Classification info for the general risk
  const geralClassificacao = getClassificacao(metricas.indiceRiscoGeral);

  // Recharts Data - 7 Dimensions Radar
  const radarChartData = useMemo(() => {
    return indicadores.map(ind => ({
      bloco: ind.nome.length > 25 ? ind.nome.substring(0, 25) + "..." : ind.nome,
      fullNome: ind.nome,
      val: viewType === "Risco" ? ind.indiceRisco : ind.indiceFavorabilidade,
    }));
  }, [indicadores, viewType]);

  // Recharts Data - Time-series trend of General Risk across Cycles
  const trendChartData = useMemo(() => {
    const cycles = Array.from(new Set(registros.map(r => r.ciclo))).sort();
    return cycles.map(c => {
      const recordsInCycle = filtrarRegistros(registros, { ...filtros, ciclo: c });
      const m = calcularMetricasGerais(recordsInCycle);
      return {
        ciclo: c,
        "Índice de Risco Geral": recordsInCycle.length >= 3 ? m.indiceRiscoGeral : null,
        "Favorabilidade Média": recordsInCycle.length >= 3 ? (100 - m.indiceRiscoGeral) : null,
      };
    }).filter(d => d["Índice de Risco Geral"] !== null);
  }, [registros, filtros]);

  // Recharts Data - Risk ranking of units
  const unitRankingData = useMemo(() => {
    return METADATA_LABELS.unidades.map(u => {
      const recordsInUnit = filtrarRegistros(registros, { ...filtros, unidade: u });
      const m = calcularMetricasGerais(recordsInUnit);
      return {
        unidade: u,
        "Índice de Risco": recordsInUnit.length >= 3 ? m.indiceRiscoGeral : 0,
        "Quantidade": recordsInUnit.length,
      };
    }).sort((a, b) => b["Índice de Risco"] - a["Índice de Risco"]);
  }, [registros, filtros]);

  // Sector Heatmap Grid calculation
  const sectorHeatmapData = useMemo(() => {
    const list: { sector: string; area: string; risk: number; total: number; classif: any }[] = [];
    
    // For all areas and sectors, calculate risk
    Object.entries(METADATA_LABELS.setores).forEach(([ar, secs]) => {
      secs.forEach(sec => {
        const recordsInSec = filtrarRegistros(registros, { ...filtros, area: ar, setor: sec });
        if (recordsInSec.length >= 3) {
          const m = calcularMetricasGerais(recordsInSec);
          list.push({
            sector: sec,
            area: ar,
            risk: m.indiceRiscoGeral,
            total: recordsInSec.length,
            classif: getClassificacao(m.indiceRiscoGeral)
          });
        }
      });
    });
    
    return list.sort((a, b) => b.risk - a.risk);
  }, [registros, filtros]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header Colors
    const primaryColor = [15, 76, 129]; // #0F4C81
    const secondaryColor = [245, 130, 32]; // #F58220

    // Header Background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, "F");

    // Decorative Orange Accent Line
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 40, 210, 3, "F");

    // Logo Text or Icon representation in Header
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Ponte 360", 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("FIRJAN SESI SENAI (Educacao e Saude)", 15, 28);
    
    doc.setFont("helvetica", "italic");
    doc.text("Da escuta a transformacao", 15, 33);

    // Title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RELATORIO DE SAUDE PSICOSSOCIAL", 15, 55);

    // Subtitle / Date
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    doc.text(`Gerado em: ${dateStr} | Base de Dados Local Ponte 360`, 15, 61);

    // Divider
    doc.setDrawColor(220, 225, 230);
    doc.line(15, 65, 195, 65);

    // Filter section
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Filtros Ativos do Relatorio:", 15, 73);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let filterLines = [
      `Unidade: ${unidade || "Todas"}`,
      `Area: ${area || "Todas"}`,
      `Setor: ${setor || "Todos"}`,
      `Cargo: ${cargo || "Todos"}`,
      `Ciclo: ${ciclo || "Todos"}`,
      `Turno: ${turno || "Todos"}`
    ];
    
    if (dataInicio || dataFim) {
      filterLines.push(`Periodo: ${dataInicio || "Inicio"} ate ${dataFim || "Fim"}`);
    }

    // Print filters in 2 columns
    let col1 = filterLines.slice(0, 4).join("  |  ");
    let col2 = filterLines.slice(4).join("  |  ");
    doc.text(col1, 15, 79);
    doc.text(col2, 15, 84);

    // Divider
    doc.line(15, 88, 195, 88);

    // Key Metrics Dashboard
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Indicadores de Desempenho e Sinais Organizacionais:", 15, 96);

    // Metrics Box
    doc.setFillColor(248, 250, 252); // light slate background
    doc.rect(15, 100, 180, 26, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 100, 180, 26, "D");

    // Metric items
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Amostra Atendimentos", 20, 107);
    doc.text("Indice Risco Geral", 65, 107);
    doc.text("Absenteismo Medio", 110, 107);
    doc.text("Horas Extras Medias", 155, 107);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${metricas.totalAvaliacoes}`, 20, 115);
    doc.text(`${metricas.indiceRiscoGeral}%`, 65, 115);
    doc.text(`${metricas.absenteismoMedio}%`, 110, 115);
    doc.text(`${metricas.horasExtrasMedia} h/mes`, 155, 115);

    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Preservacao do Anonimato", 20, 121);
    doc.text(geralClassificacao.label.toUpperCase(), 65, 121);
    doc.text("Taxa Mensal Media", 110, 121);
    doc.text("Indicador de Sobrecarga", 155, 121);

    // Sub-title for Blocks Table
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detalhamento por Bloco de Saude Psicossocial (Metodo Fatores de Risco e Protecao):", 15, 136);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 140, 180, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(15, 140, 195, 140);
    doc.line(15, 148, 195, 148);

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Bloco Tematico Avaliado", 18, 145);
    doc.text("Fator de Risco", 130, 145);
    doc.text("Fator de Protecao", 155, 145);
    doc.text("Classificacao", 180, 145);

    // Render 7 Indicators
    let startY = 154;
    indicadores.forEach((ind, i) => {
      // Alternating background
      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(15, startY - 4, 180, 7, "F");
      }
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`${ind.id}. ${ind.nome}`, 18, startY);

      doc.setFont("helvetica", "normal");
      doc.text(`${ind.indiceRisco}%`, 130, startY);
      doc.text(`${ind.indiceFavorabilidade}%`, 155, startY);

      const rating = getClassificacao(ind.indiceRisco);
      doc.text(rating.label, 180, startY);

      doc.setDrawColor(241, 245, 249);
      doc.line(15, startY + 3, 195, startY + 3);

      startY += 7.5;
    });

    // Recommendations Box
    startY += 3;
    doc.setFillColor(255, 247, 237); // Light orange background for recommendation
    doc.rect(15, startY, 180, 32, "F");
    doc.setDrawColor(254, 215, 170);
    doc.rect(15, startY, 180, 32, "D");

    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RECOMENDACOES DA PLATAFORMA PONTE 360:", 18, startY + 6);

    doc.setTextColor(80, 70, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    let recs = [];
    if (metricas.indiceRiscoGeral >= 50) {
      recs = [
        "- ALERTA CRITICO: Indices de risco geral elevados requerem acao preventiva urgente.",
        "- Realizar escuta ativa ativa focada nas areas com maior pontuacao de risco.",
        "- Rever metas e sobrecarga laboral com a equipe de engenharia e producao de servicos.",
        "- Fortalecer os canais eticos de denuncia e promover rodas de dialogo com a coordenacao."
      ];
    } else if (metricas.indiceRiscoGeral >= 30) {
      recs = [
        "- ALERTA DE ACOMPANHAMENTO: Riscos psicossociais moderados detectados.",
        "- Recomenda-se realizar reunioes de alinhamento com foco no apoio da lideranca e acolhimento.",
        "- Avaliar a incidencia de horas extras elevadas e cansaco mental nos setores afetados.",
        "- Incentivar atividades de integracao social e suporte de saude e bem-estar ocupacional."
      ];
    } else {
      recs = [
        "- RISCO BAIXO: Ambiente equilibrado com fortes fatores protetores.",
        "- Manter as boas praticas de gestao humanizada e escuta ativa ativa desenvolvidas.",
        "- Monitorar a estabilidade dos indicadores e divulgar resultados positivos para o time.",
        "- Continuar com a sensibilizacao etica e prevencao de burnout de forma integrada."
      ];
    }
    
    recs.forEach((rec, idx) => {
      doc.text(rec, 18, startY + 12 + (idx * 5));
    });

    // Signature Block & Footer
    doc.setDrawColor(220, 225, 230);
    doc.line(15, 275, 195, 275);
    
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Ponte 360 - Transformando Dados de Escuta em Planos de Acao Preventiva", 15, 281);
    doc.text("Pagina 1 de 1", 180, 281);

    // Save PDF
    doc.save(`Relatorio_Saude_Psicossocial_Ponte360_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6" id="dashboard-executivo">
      
      {/* Executive Header Banner with PDF Export action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">Painel Executivo de Saúde Psicossocial</h2>
          <p className="text-xs text-slate-400 mt-0.5">Visão consolidada e agregada baseada nos pilares do método de escuta ativa Ponte 360.</p>
        </div>
        {!isSampleTooSmall && (
          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F58220] hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Exportar Relatório PDF
          </button>
        )}
      </div>
      
      {/* 1. Painel de Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Filter className="h-4 w-4 text-orange-500" />
            Filtros Executivos (Múltiplas Dimensões)
          </h3>
          <button 
            id="btn-limpar-filtros"
            onClick={clearFilters}
            className="text-xs text-orange-500 hover:text-orange-600 font-bold uppercase tracking-wider cursor-pointer font-sans"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Unidade */}
          <div>
            <label htmlFor="filter-unidade" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Unidade</label>
            <select
              id="filter-unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todas</option>
              {METADATA_LABELS.unidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Área */}
          <div>
            <label htmlFor="filter-area" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Área Corporativa</label>
            <select
              id="filter-area"
              value={area}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todas</option>
              {METADATA_LABELS.areas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label htmlFor="filter-setor" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Setor Operacional</label>
            <select
              id="filter-setor"
              value={setor}
              disabled={!area}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 disabled:text-slate-400"
            >
              <option value="">Todos</option>
              {setoresDisponiveis.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Cargo */}
          <div>
            <label htmlFor="filter-cargo" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Cargo</label>
            <select
              id="filter-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos</option>
              {METADATA_LABELS.cargos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Ciclo */}
          <div>
            <label htmlFor="filter-ciclo" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Ciclo Evaluativo</label>
            <select
              id="filter-ciclo"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos</option>
              <option value="Ciclo 2025">Ciclo 2025</option>
              <option value="Ciclo 2026">Ciclo 2026</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Turno */}
          <div>
            <label htmlFor="filter-turno" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Turno de Trabalho</label>
            <select
              id="filter-turno"
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos</option>
              {METADATA_LABELS.turnos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Tempo de empresa */}
          <div>
            <label htmlFor="filter-tempo" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Tempo de Empresa</label>
            <select
              id="filter-tempo"
              value={tempoEmpresa}
              onChange={(e) => setTempoEmpresa(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Todos</option>
              {METADATA_LABELS.temposEmpresa.map(te => (
                <option key={te} value={te}>{te}</option>
              ))}
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label htmlFor="filter-data-inicio" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Data de Início</label>
            <input
              id="filter-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label htmlFor="filter-data-fim" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Data de Fim</label>
            <input
              id="filter-data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Bloqueio Ético de Privacidade (Preservação de Anonymity) */}
      {isSampleTooSmall ? (
        <div className="bg-rose-50/85 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto shadow-sm" id="anonymity-blocker">
          <div className="inline-flex bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 p-3 rounded-full border border-rose-200 dark:border-rose-900/30">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Acesso Restrito - Princípio de Anonimato Absoluto</h3>
          <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
            Para garantir a privacidade e impossibilitar qualquer rastreabilidade de respostas individuais de colaboradores, o sistema PONTE 360 **não exibe dados agregados para amostras com menos de 3 atendimentos**.
          </p>
          <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 rounded-lg py-2.5 px-4 inline-block">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Amostra Encontrada no Filtro:</span>{" "}
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">{registrosFiltrados.length} atendimento(s)</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Por favor, remova filtros ou selecione uma área/período mais amplo para liberar a visualização estatística coletiva.
          </p>
          <div className="pt-2">
            <button
              id="btn-desfazer-filtros"
              onClick={clearFilters}
              className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer font-sans"
            >
              Remover Todos os Filtros
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 3. Indicadores de KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" id="kpi-cards">
            {/* Total Atendimentos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-500 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Amostra Coletiva</span>
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
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Risco Geral</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-slate-850 dark:text-white leading-none">{metricas.indiceRiscoGeral}%</span>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${geralClassificacao.badgeClass}`}>
                    {geralClassificacao.label}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">média blocos</span>
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
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Média Mensal</span>
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
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Taxa Média</span>
              </div>
            </div>

            {/* Rotatividade */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="bg-teal-50 dark:bg-teal-950/20 text-teal-500 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/30">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Rotatividade</span>
                <span className="text-xl font-black text-slate-850 dark:text-white block leading-none mt-1">{metricas.rotatividadeMedia}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Turnover Área</span>
              </div>
            </div>

            {/* Registros Sentinela */}
            <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-4 ${metricas.totalProcuraSaude > 3 ? 'border-r-4 border-r-orange-500' : ''}`}>
              <div className={`p-2.5 rounded-lg border ${metricas.totalProcuraSaude > 3 ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-500 border-orange-100 dark:border-orange-900/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-700'}`}>
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Sinal Sentinela</span>
                <span className="text-xl font-black text-slate-850 dark:text-white block leading-none mt-1">{metricas.totalProcuraSaude}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">demandas ambul.</span>
              </div>
            </div>
          </div>

          {/* 4. Toggles e Gráficos Principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico de Radar de 7 Dimensões */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <BarChart4 className="h-4 w-4 text-orange-500" />
                    Radar de Dimensões Psicossociais
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                    Visão: {viewType === "Risco" ? "Riscos Críticos" : "Fatores de Proteção Favoráveis"}
                  </p>
                </div>
                
                {/* Toggle para inverter escala */}
                <button
                  id="toggle-tipo-visualizacao"
                  onClick={() => setViewType(viewType === "Risco" ? "Proteção" : "Risco")}
                  className="flex items-center gap-1.5 text-[10px] text-orange-500 hover:text-orange-600 font-bold uppercase tracking-wider bg-orange-500/10 py-1.5 px-3 rounded-lg border border-orange-200/50 cursor-pointer font-sans"
                >
                  {viewType === "Risco" ? (
                    <>
                      <ToggleLeft className="h-4 w-4 text-orange-500" />
                      Visualizar Risco
                    </>
                  ) : (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                      Visualizar Proteção
                    </>
                  )}
                </button>
              </div>

              {/* Responsive Container for Radar Chart */}
              <div className="h-[320px]" id="radar-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                    <PolarGrid stroke="#475569" strokeWidth={0.5} strokeDasharray="3 3" />
                    <PolarAngleAxis 
                      dataKey="bloco" 
                      tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 8 }} />
                    <Radar
                      name={viewType === "Risco" ? "Índice de Risco (%)" : "Favorabilidade (%)"}
                      dataKey="val"
                      stroke={viewType === "Risco" ? "#f97316" : "#10b981"}
                      fill={viewType === "Risco" ? "#ffedd5" : "#ecfdf5"}
                      fillOpacity={0.4}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 text-white rounded-lg p-2.5 text-xs shadow-lg max-w-xs border border-slate-800">
                              <p className="font-bold mb-1">{data.fullNome}</p>
                              <p>
                                {viewType === "Risco" ? "Índice de Risco:" : "Nível Favorável:"}{" "}
                                <span className="font-bold">{payload[0].value}%</span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {viewType === "Risco" 
                                  ? "Escala unificada: quanto maior o índice, maior a necessidade de plano preventivo." 
                                  : "Escala positiva: maior índice representa melhor proteção e acolhimento."}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução Histórica Temporal */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Tendência e Evolução entre Ciclos
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                  Análise comparativa temporal do índice médio sob os mesmos filtros
                </p>
              </div>

              <div className="h-[320px]" id="line-chart-container">
                {trendChartData.length <= 1 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <AlertTriangle className="h-6 w-6 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Histórico de Comparação Indisponível</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs">
                      Não há ciclos de atendimentos anteriores cadastrados na base que satisfaçam os filtros ativos.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="ciclo" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                      <Line 
                        type="monotone" 
                        dataKey="Índice de Risco Geral" 
                        stroke="#f43f5e" 
                        strokeWidth={3}
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Favorabilidade Média" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 5. Heatmap por Setor e Ranking de Unidades */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Heatmap Grid por Setor */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs lg:col-span-2 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Grid className="h-4 w-4 text-orange-500" />
                  Painel de Calor de Setores (Heatmap)
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                  Classificação de risco instantânea por setor operacional (Mínimo de 3 respostas por célula)
                </p>
              </div>

              {sectorHeatmapData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                  Nenhum setor possui amostragem suficiente (min. 3) nos filtros atuais.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" id="sector-heatmap-grid">
                  {sectorHeatmapData.map((sec, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border flex flex-col justify-between h-24 transition-all shadow-2xs hover:shadow-xs ${sec.classif.bgClass} ${sec.classif.borderClass}`}
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider leading-none">{sec.area}</span>
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-100 line-clamp-1">{sec.sector}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amostra: {sec.total}</span>
                        <div className="text-right leading-none">
                          <span className={`text-xs font-extrabold block ${sec.classif.textClass}`}>
                            {sec.risk}%
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">{sec.classif.label}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ranking de Unidades */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Award className="h-4 w-4 text-orange-500" />
                  Ranking de Unidades por Risco
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                  Ordenado por nível crítico de risco psicossocial geral
                </p>
              </div>

              <div className="h-[180px]" id="bar-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitRankingData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="unidade" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 8 }} />
                    <Tooltip />
                    <Bar dataKey="Índice de Risco" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 border-t border-slate-150 dark:border-slate-800 pt-3">
                {unitRankingData.map((unit, idx) => {
                  const classif = getClassificacao(unit["Índice de Risco"]);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-4">#{idx+1}</span>
                        <span className="text-slate-700 dark:text-slate-300">{unit.unidade}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500 font-normal">({unit.Quantidade} atend.)</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${classif.badgeClass}`}>
                          {unit["Índice de Risco"]}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* 6. Alerta Metodológico */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-3 text-slate-600 dark:text-slate-400 text-xs">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold uppercase tracking-wide text-xs text-slate-800 dark:text-slate-200 block mb-1">Nota de Governança e Estatística (NR-1 / ISO 45003):</span>
              Os dados e relatórios acima são representações numéricas agregadas. Eles servem de bússola ética para planos de intervenção organizacionais (ex: melhoria de maquinários, dinâmicas de feedback, reestruturação de horários, etc.). Este painel nunca deve ser utilizado para avaliar a produtividade de colaboradores específicos ou justificar processos demissionais ou correcionais baseados na saúde mental percebida.
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
