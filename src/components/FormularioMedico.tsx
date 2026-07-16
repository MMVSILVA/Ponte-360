/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BLOCOS_CONFIG, METADATA_LABELS, Atendimento } from "../types";
import { ClipboardList, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, ShieldCheck, HeartPulse } from "lucide-react";
import { DataService } from "../services/dataService";

interface FormularioMedicoProps {
  onSuccess: () => void;
}

export default function FormularioMedico({ onSuccess }: FormularioMedicoProps) {
  // Metadata states
  const [unidade, setUnidade] = useState("");
  const [area, setArea] = useState("");
  const [setor, setSetor] = useState("");
  const [cargo, setCargo] = useState("");
  const [turno, setTurno] = useState("");
  const [ciclo, setCiclo] = useState("Ciclo 2026");
  const [tempoEmpresa, setTempoEmpresa] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState("Exame Periódico");
  const [faixaEtaria, setFaixaEtaria] = useState("");
  const [sexo, setSexo] = useState("");
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);

  // Questions state (21 numbers, default to null)
  const [respostas, setRespostas] = useState<(number | null)[]>(Array(21).fill(null));
  
  // Simulated organizational signals (entered optionally or random-filled behind the scenes)
  const [horasExtras, setHorasExtras] = useState<number>(0);
  const [absenteismo, setAbsenteismo] = useState<number>(0);
  const [rotatividade, setRotatividade] = useState<number>(0);
  const [procuraSaude, setProcuraSaude] = useState<number>(0);

  // Active Wizard step
  // Step 0: Metadata Selection
  // Step 1 to 7: Blocks 1 to 7
  // Step 8: Final review and submit
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get sectors based on selected Area
  const setoresDisponiveis = area ? METADATA_LABELS.setores[area as keyof typeof METADATA_LABELS.setores] || [] : [];

  const handleAreaChange = (selectedArea: string) => {
    setArea(selectedArea);
    setSetor(""); // reset sector
  };

  const setRespostaParaQuestao = (index: number, value: number | null) => {
    const novasRespostas = [...respostas];
    novasRespostas[index] = value;
    setRespostas(novasRespostas);
    setErrorMsg("");
  };

  const nextStep = () => {
    // Validation
    if (step === 0) {
      if (!unidade || !area || !setor || !cargo || !turno || !tempoEmpresa || !tipoAtendimento) {
        setErrorMsg("Por favor, preencha todos os metadados obrigatórios do atendimento.");
        return;
      }
    } else if (step >= 1 && step <= 7) {
      // Validate that all 3 questions in the active block are answered (or answered with N/A)
      const startIdx = (step - 1) * 3;
      const blockAnswers = respostas.slice(startIdx, startIdx + 3);
      const hasUnanswered = blockAnswers.some(ans => ans === null);
      if (hasUnanswered) {
        setErrorMsg("Por favor, responda a todas as 3 perguntas do bloco antes de avançar (ou selecione 'Não se aplica / N/A').");
        return;
      }
    }
    setErrorMsg("");
    setStep(step + 1);
  };

  const prevStep = () => {
    setErrorMsg("");
    setStep(Math.max(0, step - 1));
  };

  const handleSubmeter = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      // Create record
      const novoRegistro: Atendimento = {
        id: `atend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        data,
        ciclo,
        unidade,
        area,
        setor,
        cargo,
        turno,
        tipoAtendimento,
        tempoEmpresa,
        faixaEtaria: faixaEtaria || undefined,
        sexo: sexo || undefined,
        respostas: respostas.map(r => r === 0 ? null : r), // convert 0 to null (representing N/A) in database
        
        // Populate signals with reasonable random bounds or form input
        horasExtras: horasExtras || Math.floor(Math.random() * 6),
        absenteismo: absenteismo || parseFloat((Math.random() * 4).toFixed(1)),
        rotatividade: rotatividade || parseFloat((Math.random() * 3).toFixed(1)),
        procuraSaude: procuraSaude || (Math.random() > 0.85 ? 1 : 0)
      };

      await DataService.salvarRegistro(novoRegistro);
      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg("Erro ao salvar o atendimento: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUnidade("");
    setArea("");
    setSetor("");
    setCargo("");
    setTurno("");
    setCiclo("Ciclo 2026");
    setTempoEmpresa("");
    setTipoAtendimento("Exame Periódico");
    setFaixaEtaria("");
    setSexo("");
    setRespostas(Array(21).fill(null));
    setHorasExtras(0);
    setAbsenteismo(0);
    setRotatividade(0);
    setProcuraSaude(0);
    setStep(0);
    setSubmitSuccess(false);
    setErrorMsg("");
  };

  const renderFaseMetadados = () => {
    return (
      <div className="space-y-6" id="form-metadados">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            Passo 1: Metadados Agregados (Sem Identificação)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Esta seção cataloga os dados de enquadramento coletivo. Nenhum campo de nome, ID ou credencial individual é solicitado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Unidade */}
          <div>
            <label htmlFor="select-unidade" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Unidade *</label>
            <select
              id="select-unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {METADATA_LABELS.unidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Área */}
          <div>
            <label htmlFor="select-area" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Área Corporativa *</label>
            <select
              id="select-area"
              value={area}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {METADATA_LABELS.areas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label htmlFor="select-setor" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Setor Operacional *</label>
            <select
              id="select-setor"
              value={setor}
              disabled={!area}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-950 disabled:text-slate-400"
            >
              <option value="">Selecione a área primeiro...</option>
              {setoresDisponiveis.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Cargo */}
          <div>
            <label htmlFor="select-cargo" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Cargo *</label>
            <select
              id="select-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {METADATA_LABELS.cargos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Turno */}
          <div>
            <label htmlFor="select-turno" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Turno *</label>
            <select
              id="select-turno"
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {METADATA_LABELS.turnos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Tempo Empresa */}
          <div>
            <label htmlFor="select-tempo-empresa" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Tempo de Empresa *</label>
            <select
              id="select-tempo-empresa"
              value={tempoEmpresa}
              onChange={(e) => setTempoEmpresa(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {METADATA_LABELS.temposEmpresa.map(te => (
                <option key={te} value={te}>{te}</option>
              ))}
            </select>
          </div>

          {/* Tipo Atendimento */}
          <div>
            <label htmlFor="select-tipo-atendimento" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Tipo de Atendimento *</label>
            <select
              id="select-tipo-atendimento"
              value={tipoAtendimento}
              onChange={(e) => setTipoAtendimento(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {METADATA_LABELS.tiposAtendimento.map(ta => (
                <option key={ta} value={ta}>{ta}</option>
              ))}
            </select>
          </div>

          {/* Ciclo */}
          <div>
            <label htmlFor="select-ciclo" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Ciclo Avaliativo *</label>
            <select
              id="select-ciclo"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="Ciclo 2025">Ciclo 2025</option>
              <option value="Ciclo 2026">Ciclo 2026</option>
              <option value="Ciclo 2027">Ciclo 2027</option>
            </select>
          </div>

          {/* Data */}
          <div>
            <label htmlFor="input-data" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Data de Atendimento *</label>
            <input
              id="input-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Faixa Etária (Optional) */}
          <div>
            <label htmlFor="select-faixa-etaria" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Faixa Etária (Opcional)</label>
            <select
              id="select-faixa-etaria"
              value={faixaEtaria}
              onChange={(e) => setFaixaEtaria(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Não informar</option>
              {METADATA_LABELS.faixasEtarias.map(fe => (
                <option key={fe} value={fe}>{fe}</option>
              ))}
            </select>
          </div>

          {/* Sexo (Optional) */}
          <div>
            <label htmlFor="select-sexo" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Sexo Biológico (Opcional)</label>
            <select
              id="select-sexo"
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Não informar</option>
              {METADATA_LABELS.sexos.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Informative Security Disclaimer */}
        <div className="bg-orange-50/80 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-xl p-4 flex gap-3 text-orange-900 dark:text-orange-200 text-sm">
          <ShieldCheck className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block mb-0.5 uppercase tracking-wide text-xs text-orange-600 dark:text-orange-400">Política de Confidencialidade Absoluta:</span>
            Este protótipo foi desenhado sob as diretrizes rígidas da NR-1 e ISO 45003. As informações servem estritamente para compor a análise de tendências de riscos organizacionais coletivos. Nenhum dado de cunho clínico individual ou prontuário médico sensível é arquivado.
          </div>
        </div>
      </div>
    );
  };

  const renderBlocoPerguntas = (blocoId: number) => {
    const bloco = BLOCOS_CONFIG.find(b => b.id === blocoId);
    if (!bloco) return null;

    const scaleOptions = [
      { val: 1, text: "Nunca" },
      { val: 2, text: "Raramente" },
      { val: 3, text: "Às vezes" },
      { val: 4, text: "Frequentemente" },
      { val: 5, text: "Sempre" },
      { val: 0, text: "Não se aplica / NA" },
    ];

    return (
      <div className="space-y-6" id={`bloco-${blocoId}`}>
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 px-2.5 py-1 bg-orange-500/10 rounded-full">
              Bloco {blocoId} de 7
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tipo: {bloco.tipo === "Risco" ? "🔴 Avaliação de Risco" : "🟢 Fator de Proteção"}
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">{bloco.nome}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {bloco.tipo === "Risco" 
              ? "Perguntas direcionadas para identificar estressores, sobrecargas ou pressões inadequadas na jornada." 
              : "Perguntas focadas em fatores saudáveis, canais de diálogo e recursos protetores oferecidos pela empresa."}
          </p>
        </div>

        <div className="space-y-6">
          {bloco.perguntas.map((pergunta, qIdx) => {
            const globalIdx = (blocoId - 1) * 3 + qIdx;
            const activeVal = respostas[globalIdx];

            return (
              <div key={globalIdx} className="space-y-3 bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                  <span className="text-orange-500 font-extrabold mr-2">{qIdx + 1}.</span>
                  {pergunta}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                  {scaleOptions.map((opt) => {
                    const isSelected = activeVal === opt.val;
                    let activeBtnClass = "";
                    
                    if (isSelected) {
                      if (opt.val === 0) {
                        activeBtnClass = "bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-800 dark:text-white shadow-sm font-bold scale-[1.02]";
                      } else if (bloco.tipo === "Risco") {
                        if (opt.val >= 4) activeBtnClass = "bg-rose-500 border-rose-600 text-white shadow-sm font-bold scale-[1.02]";
                        else if (opt.val === 3) activeBtnClass = "bg-amber-500 border-amber-600 text-white shadow-sm font-bold scale-[1.02]";
                        else activeBtnClass = "bg-emerald-500 border-emerald-600 text-white shadow-sm font-bold scale-[1.02]";
                      } else {
                        if (opt.val >= 4) activeBtnClass = "bg-emerald-500 border-emerald-600 text-white shadow-sm font-bold scale-[1.02]";
                        else if (opt.val === 3) activeBtnClass = "bg-amber-500 border-amber-600 text-white shadow-sm font-bold scale-[1.02]";
                        else activeBtnClass = "bg-rose-500 border-rose-600 text-white shadow-sm font-bold scale-[1.02]";
                      }
                    } else {
                      activeBtnClass = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
                    }

                    return (
                      <button
                        key={opt.val}
                        id={`btn-q${globalIdx}-opt${opt.val}`}
                        type="button"
                        onClick={() => setRespostaParaQuestao(globalIdx, opt.val)}
                        className={`text-[11px] uppercase tracking-wider py-2.5 px-2 border rounded-lg transition-all font-bold focus:outline-none cursor-pointer ${activeBtnClass}`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReviewSubmit = () => {
    return (
      <div className="space-y-6" id="form-revisao">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Passo final: Revisão e Registro Coletivo
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifique as informações preenchidas antes de consolidar os dados na base estatística.
          </p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-5 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Enquadramento de Origem</h4>
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
              <p><span className="font-extrabold text-slate-900 dark:text-white">Unidade:</span> {unidade}</p>
              <p><span className="font-extrabold text-slate-900 dark:text-white">Área:</span> {area}</p>
              <p><span className="font-extrabold text-slate-900 dark:text-white">Setor:</span> {setor}</p>
              <p><span className="font-extrabold text-slate-900 dark:text-white">Cargo:</span> {cargo}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Dados do Atendimento</h4>
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
              <p><span className="font-extrabold text-slate-900 dark:text-white">Ciclo:</span> {ciclo}</p>
              <p><span className="font-extrabold text-slate-900 dark:text-white">Turno:</span> {turno}</p>
              <p><span className="font-extrabold text-slate-900 dark:text-white">Tipo:</span> {tipoAtendimento}</p>
              <p><span className="font-extrabold text-slate-900 dark:text-white">Tempo de Empresa:</span> {tempoEmpresa}</p>
            </div>
          </div>
        </div>

        {/* Optional input for Sentinel / Organizational Signals to match with the record */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-500" />
            Metadados Organizacionais Complementares (Opcional - para correlação)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estes indicadores organizacionais agregados dão suporte contextual e correlacionam os índices com dados objetivos da área.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="input-horas-extras" className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Média Horas Extras (Área)</label>
              <input
                id="input-horas-extras"
                type="number"
                min="0"
                value={horasExtras || ""}
                onChange={(e) => setHorasExtras(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Ex: 5"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label htmlFor="input-absenteismo" className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Média Absenteísmo (Área %)</label>
              <input
                id="input-absenteismo"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={absenteismo || ""}
                onChange={(e) => setAbsenteismo(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Ex: 2.5"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label htmlFor="input-rotatividade" className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Média Rotatividade (Área %)</label>
              <input
                id="input-rotatividade"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rotatividade || ""}
                onChange={(e) => setRotatividade(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Ex: 1.8"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label htmlFor="select-procura-saude" className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Registro Sentinela Saúde?</label>
              <select
                id="select-procura-saude"
                value={procuraSaude}
                onChange={(e) => setProcuraSaude(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              >
                <option value="0">Não (Normal)</option>
                <option value="1">Sim (Demanda elevada no ambulatório)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 rounded-xl p-4 flex gap-3 text-yellow-850 dark:text-yellow-200 text-sm">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            Confirmando o envio, as respostas do formulário serão convertidas em vetores agregados de pesquisa. Elas se tornarão acessíveis no Dashboard apenas sob filtros coletivos de estatística.
          </div>
        </div>
      </div>
    );
  };

  const getFaseNome = () => {
    if (step === 0) return "Enquadramento Coletivo";
    if (step === 8) return "Revisão Final";
    return `Bloco ${step}: ${BLOCOS_CONFIG[step - 1].nome}`;
  };

  const pctProgresso = (step / 8) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-4xl mx-auto overflow-hidden">
      {/* Header do Wizard */}
      <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-400" />
            Lançamento de Escuta Estruturada (Medicina do Trabalho)
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Fase atual: {getFaseNome()}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Progresso Geral</span>
          <span className="text-lg font-black">{Math.round(pctProgresso)}%</span>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full bg-slate-800 h-1">
        <div 
          id="wizard-progresso"
          className="bg-orange-500 h-1 transition-all duration-300"
          style={{ width: `${pctProgresso}%` }}
        />
      </div>

      {/* Conteúdo Ativo */}
      <div className="p-6 sm:p-8 min-h-[400px]">
        {submitSuccess ? (
          <div className="flex flex-col items-center justify-center text-center py-12 space-y-4" id="success-message">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-full border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Formulário Consolidado com Sucesso!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Os índices foram processados de forma anônima e já alimentaram o banco de dados do painel do gestor e executivo.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {step === 0 && renderFaseMetadados()}
            {step >= 1 && step <= 7 && renderBlocoPerguntas(step)}
            {step === 8 && renderReviewSubmit()}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-lg p-3 text-red-750 dark:text-red-300 text-sm flex items-center gap-2" id="error-validation">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botoes de Acao */}
            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
              <button
                id="btn-voltar"
                type="button"
                onClick={prevStep}
                disabled={step === 0 || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              {step === 0 && (
                <button
                  id="btn-reset"
                  type="button"
                  onClick={resetForm}
                  className="text-xs uppercase tracking-wider text-slate-500 hover:text-rose-600 transition-colors font-bold cursor-pointer"
                >
                  Limpar Formulário
                </button>
              )}

              {step < 8 ? (
                <button
                  id="btn-avancar"
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  id="btn-salvar"
                  type="button"
                  onClick={handleSubmeter}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Enviando..." : "Consolidar Instrumento"}
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
