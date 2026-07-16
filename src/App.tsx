/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DataService } from "./services/dataService";
import { Atendimento, PlanoDeAcao } from "./types";
import FormularioMedico from "./components/FormularioMedico";
import DashboardExecutivo from "./components/DashboardExecutivo";
import DashboardGestor from "./components/DashboardGestor";
import PlanosAcao from "./components/PlanosAcao";
import PonteIA from "./components/PonteIA";
import { 
  ClipboardList, BarChart3, ShieldCheck, Heart, 
  Settings, Download, Upload, Moon, Sun, RefreshCw, Brain, Trash2 
} from "lucide-react";
import * as XLSX from "xlsx";
import LogoPonte360 from "./components/LogoPonte360";

export default function App() {
  const [activeTab, setActiveTab] = useState<"formulario" | "executivo" | "gestor" | "planos" | "ia">("formulario");
  const [registros, setRegistros] = useState<Atendimento[]>([]);
  const [planos, setPlanos] = useState<PlanoDeAcao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Hidden file input ref for Excel import
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const regs = await DataService.getRegistros();
      const pls = await DataService.getPlanosDeAcao();
      setRegistros(regs);
      setPlanos(pls);
    } catch (error) {
      console.error("Erro ao carregar dados do Ponte 360:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initDb = async () => {
      // Force a programmatic complete clear once to satisfy "zerar todos os dados" on immediate load
      const hasClearedOnce = localStorage.getItem("ponte360_force_clear_v4") === "true";
      if (!hasClearedOnce) {
        try {
          await DataService.zerarBancoTotalmente();
          localStorage.setItem("ponte360_force_clear_v4", "true");
        } catch (e) {
          console.error("Erro no clear programático inicial:", e);
        }
      }
      refreshData();
    };
    initDb();
  }, []);

  const handleResetBanco = async () => {
    if (confirm("Deseja redefinir o banco local para o estado padrão? Todos os atendimentos adicionados manualmente serão limpos e os dados de teste (50+ registros, 2 ciclos) serão restaurados.")) {
      setIsLoading(true);
      try {
        await DataService.resetarBanco();
        await refreshData();
        alert("Banco de dados local restaurado com sucesso!");
      } catch (err: any) {
        alert("Erro ao redefinir banco: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleZerarBanco = async () => {
    if (confirm("ATENÇÃO: Deseja ZERAR completamente o banco de dados? Todos os registros de atendimentos e planos de ação serão removidos permanentemente. Esta ação é recomendada para iniciar o uso real do sistema de escuta ativa.")) {
      setIsLoading(true);
      try {
        await DataService.zerarBancoTotalmente();
        await refreshData();
        alert("Banco de dados local zerado com sucesso! Agora o sistema está pronto para receber novos atendimentos.");
      } catch (err: any) {
        alert("Erro ao zerar banco: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExportarExcel = () => {
    if (registros.length === 0) {
      alert("Não há dados de atendimentos para exportar.");
      return;
    }

    try {
      // Flatten attendance records
      const rowsAtendimentos = registros.map(r => {
        const flatRow: any = {
          "ID": r.id,
          "Data": r.data,
          "Ciclo": r.ciclo,
          "Unidade": r.unidade,
          "Área": r.area,
          "Setor": r.setor,
          "Cargo": r.cargo,
          "Turno": r.turno,
          "Tipo Atendimento": r.tipoAtendimento,
          "Tempo Empresa": r.tempoEmpresa,
          "Faixa Etária": r.faixaEtaria || "Não Informado",
          "Sexo": r.sexo || "Não Informado",
          "Horas Extras (Média)": r.horasExtras,
          "Absenteísmo (%)": r.absenteismo,
          "Rotatividade (%)": r.rotatividade,
          "Registro Sentinela Saúde": r.procuraSaude ? "Sim" : "Não"
        };
        
        // Add 21 questions
        r.respostas.forEach((resp, idx) => {
          flatRow[`Questão ${idx + 1}`] = resp === null ? "N/A" : resp;
        });
        
        return flatRow;
      });
      
      const worksheetAtendimentos = XLSX.utils.json_to_sheet(rowsAtendimentos);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetAtendimentos, "Atendimentos Coletivos");
      
      // Flatten action plans
      const rowsPlanos = planos.map(p => ({
        "ID": p.id,
        "Indicador ID": p.indicadorId,
        "Bloco": p.blocoNome,
        "Ação Preventiva": p.descricao,
        "Responsável": p.responsavel,
        "Prazo": p.prazo,
        "Status": p.status,
        "Resultados": p.resultados,
        "Notas / Evidências": p.comentarios,
        "Unidade": p.unidade,
        "Área": p.area,
        "Data Criação": p.dataCriacao
      }));
      const worksheetPlanos = XLSX.utils.json_to_sheet(rowsPlanos);
      XLSX.utils.book_append_sheet(workbook, worksheetPlanos, "Planos de Ação");
      
      XLSX.writeFile(workbook, "Ponte360_Dados_Corporativos.xlsx");
    } catch (err: any) {
      alert("Erro ao exportar dados para Excel: " + err.message);
    }
  };

  const handleImportarExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Parse Atendimentos
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        if (jsonRows.length === 0) {
          throw new Error("A aba de Atendimentos está vazia ou no formato incorreto.");
        }

        const novosAtendimentos: Atendimento[] = jsonRows.map((row, idx) => {
          const respostas: (number | null)[] = [];
          for (let q = 1; q <= 21; q++) {
            const val = row[`Questão ${q}`];
            if (val === "N/A" || val === undefined || val === null) {
              respostas.push(null);
            } else {
              respostas.push(parseInt(val) || null);
            }
          }
          
          return {
            id: row["ID"] || `import-atend-${Date.now()}-${idx}`,
            data: row["Data"] || new Date().toISOString().split('T')[0],
            ciclo: row["Ciclo"] || "Ciclo 2026",
            unidade: row["Unidade"] || "Volta Redonda",
            area: row["Área"] || "Operações",
            setor: row["Setor"] || "Linha de Montagem A",
            cargo: row["Cargo"] || "Operador(a)",
            turno: row["Turno"] || "Turno A (Matutino)",
            tipoAtendimento: row["Tipo Atendimento"] || "Exame Periódico",
            tempoEmpresa: row["Tempo Empresa"] || "< 1 ano",
            faixaEtaria: row["Faixa Etária"] === "Não Informado" ? undefined : row["Faixa Etária"],
            sexo: row["Sexo"] === "Não Informado" ? undefined : row["Sexo"],
            respostas,
            horasExtras: parseInt(row["Horas Extras (Média)"]) || 0,
            absenteismo: parseFloat(row["Absenteísmo (%)"]) || 0,
            rotatividade: parseFloat(row["Rotatividade (%)"]) || 0,
            procuraSaude: row["Registro Sentinela Saúde"] === "Sim" ? 1 : 0
          };
        });
        
        await DataService.salvarVariosRegistros(novosAtendimentos);
        
        // Parse Planos de Ação if sheet exists
        if (workbook.SheetNames.length > 1) {
          const sheetPlanos = workbook.Sheets[workbook.SheetNames[1]];
          const jsonPlanos = XLSX.utils.sheet_to_json(sheetPlanos) as any[];
          
          const novosPlanos: PlanoDeAcao[] = jsonPlanos.map((row, idx) => ({
            id: row["ID"] || `import-plano-${Date.now()}-${idx}`,
            indicadorId: parseInt(row["Indicador ID"]) || 1,
            blocoNome: row["Bloco"] || "Geral",
            descricao: row["Ação Preventiva"] || "",
            responsavel: row["Responsável"] || "Comitê",
            prazo: row["Prazo"] || "",
            status: (row["Status"] as any) || "Pendente",
            resultados: row["Resultados"] || "",
            comentarios: row["Notas / Evidências"] || "",
            unidade: row["Unidade"] || "Volta Redonda",
            area: row["Área"] || "Operações",
            dataCriacao: row["Data Criação"] || new Date().toISOString().split('T')[0]
          }));
          
          await DataService.salvarVariosPlanos(novosPlanos);
        }
        
        alert("Dados do Ponte 360 e Planos de Ação importados com sucesso!");
        await refreshData();
      } catch (err: any) {
        alert("Erro ao decodificar planilha: " + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden antialiased ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* SIDEBAR NAVIGATION - Geometric Balance style */}
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 text-slate-300">
        {/* Top Branding Section */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-center shrink-0 w-full">
          <LogoPonte360 className="w-full" />
        </div>
        
        {/* Navigation Categories */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          <div className="px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operação</div>
          <button
            id="tab-formulario"
            onClick={() => setActiveTab("formulario")}
            className={`w-full flex items-center px-6 py-3 text-xs font-bold transition-all ${
              activeTab === "formulario"
                ? "bg-orange-500/10 text-orange-400 border-r-4 border-orange-500"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <ClipboardList className="w-4 h-4 mr-3 shrink-0" />
            Escuta Médica (Atendimento)
          </button>

          <div className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estratégico</div>
          
          <button
            id="tab-executivo"
            onClick={() => setActiveTab("executivo")}
            className={`w-full flex items-center px-6 py-3 text-xs font-bold transition-all ${
              activeTab === "executivo"
                ? "bg-orange-500/10 text-orange-400 border-r-4 border-orange-500"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-3 shrink-0" />
            Dashboard Executivo
          </button>

          <button
            id="tab-gestor"
            onClick={() => setActiveTab("gestor")}
            className={`w-full flex items-center px-6 py-3 text-xs font-bold transition-all ${
              activeTab === "gestor"
                ? "bg-orange-500/10 text-orange-400 border-r-4 border-orange-500"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-3 shrink-0" />
            Painel do Gestor (Restrito)
          </button>

          <button
            id="tab-planos"
            onClick={() => setActiveTab("planos")}
            className={`w-full flex items-center px-6 py-3 text-xs font-bold transition-all ${
              activeTab === "planos"
                ? "bg-orange-500/10 text-orange-400 border-r-4 border-orange-500"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <ClipboardList className="w-4 h-4 mr-3 shrink-0" />
            Planos de Ação
          </button>

          <button
            id="tab-ia"
            onClick={() => setActiveTab("ia")}
            className={`w-full flex items-center px-6 py-3 text-xs font-bold transition-all ${
              activeTab === "ia"
                ? "bg-orange-500/10 text-orange-400 border-r-4 border-orange-500"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Brain className="w-4 h-4 mr-3 shrink-0" />
            Assistente PONTE IA
          </button>
        </nav>

        {/* Dynamic Privacy Indicator */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sessão Anônima Protegida
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* TOP HEADER */}
        <header className={`h-16 px-8 flex items-center justify-between shrink-0 border-b transition-colors ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex items-center gap-4">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              {activeTab === "formulario" && "NOVO ATENDIMENTO / ESCUTA CLÍNICA"}
              {activeTab === "executivo" && "DASHBOARD EXECUTIVO MULTIDIMENSIONAL"}
              {activeTab === "gestor" && "PAINEL DE GESTÃO E CLIMA SOCIAL"}
              {activeTab === "planos" && "GESTÃO DE PLANOS DE INTERVENÇÃO"}
              {activeTab === "ia" && "DIAGNÓSTICO E RECOMENDAÇÕES COM IA"}
            </h2>
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[9px] font-extrabold border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
              Ciclo 2026
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* Unit Details */}
            <div className="text-right hidden sm:block">
              <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Unidade</p>
              <p className="text-xs font-black text-slate-700 dark:text-slate-300">FIRJAN SESI SENAI (Educação)</p>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-exportar-excel"
                onClick={handleExportarExcel}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold transition-colors text-[10px] uppercase tracking-wider"
                title="Exportar base local de atendimentos e planos de ação para planilha Excel"
              >
                <Download className="h-3.5 w-3.5 text-[#F58220]" />
                <span className="hidden lg:inline">Exportar XLS</span>
              </button>
              
              <button
                id="btn-trigger-importar-excel"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold transition-colors text-[10px] uppercase tracking-wider"
                title="Importar base de dados externa em formato Excel"
              >
                <Upload className="h-3.5 w-3.5 text-[#F58220]" />
                <span className="hidden lg:inline">Importar XLS</span>
              </button>
              <input 
                id="input-arquivo-excel-import"
                type="file"
                ref={fileInputRef}
                onChange={handleImportarExcel}
                accept=".xlsx,.xls"
                className="hidden"
              />

              <button
                id="btn-zerar-banco-dados"
                onClick={handleZerarBanco}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer font-bold transition-colors text-[10px] uppercase tracking-wider"
                title="Zerar banco de dados totalmente (0 atendimentos, 0 planos)"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span className="hidden md:inline">Zerar Banco</span>
              </button>

              <button
                id="btn-redefinir-banco-dados"
                onClick={handleResetBanco}
                className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#F58220] cursor-pointer"
                title="Restaurar Dados de Simulação do SESI/SENAI"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              <button
                id="btn-toggle-modo-escuro"
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-500"
                title="Alternar Modo Claro / Escuro"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-orange-500" />}
              </button>
            </div>
          </div>
        </header>

        {/* SCROLLABLE INNER PAGE */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 h-full" id="app-loading-screen">
              <RefreshCw className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Acessando base estatística local...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === "formulario" && (
                <FormularioMedico onSuccess={() => { refreshData(); setActiveTab("executivo"); }} />
              )}
              
              {activeTab === "executivo" && (
                <DashboardExecutivo registros={registros} onResetDatabase={refreshData} />
              )}

              {activeTab === "gestor" && (
                <DashboardGestor 
                  registros={registros} 
                  planos={planos} 
                  onAdicionarPlano={() => setActiveTab("planos")} 
                />
              )}

              {activeTab === "planos" && (
                <PlanosAcao planos={planos} onRefresh={refreshData} />
              )}

              {activeTab === "ia" && (
                <PonteIA registros={registros} planos={planos} />
              )}
            </div>
          )}
        </main>

        {/* BOTTOM STATUS FOOTER */}
        <footer className={`h-12 border-t px-8 flex items-center justify-between text-[10px] font-bold tracking-wider shrink-0 transition-colors ${
          darkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
        }`}>
          <div className="flex gap-6 items-center">
            <span className="uppercase">FIRJAN SESI SENAI (EDUCAÇÃO)</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              BASE LOCAL ATIVA (INDEXEDDB)
            </span>
          </div>
          <div className="hidden sm:flex gap-4">
            <span className="uppercase">CONFORMIDADE GRO NR-1 • ISO 45003</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
