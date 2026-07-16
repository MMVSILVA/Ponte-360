/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Atendimento, BLOCOS_CONFIG, BlocoConfig } from "./types";

export interface ClassificacaoInfo {
  label: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  colorCode: string;
}

/**
 * Returns color codes and labels according to the PONTE 360 Risk index classification
 */
export function getClassificacao(riskIndex: number): ClassificacaoInfo {
  if (riskIndex <= 39) {
    return {
      label: "Acompanhamento",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      bgClass: "bg-emerald-50",
      textClass: "text-emerald-700",
      borderClass: "border-emerald-100",
      colorCode: "#10b981", // emerald-500
    };
  } else if (riskIndex <= 59) {
    return {
      label: "Atenção",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      bgClass: "bg-amber-50",
      textClass: "text-amber-700",
      borderClass: "border-amber-100",
      colorCode: "#f59e0b", // amber-500
    };
  } else if (riskIndex <= 79) {
    return {
      label: "Prioridade",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
      bgClass: "bg-orange-50",
      textClass: "text-orange-700",
      borderClass: "border-orange-100",
      colorCode: "#f97316", // orange-500
    };
  } else {
    return {
      label: "Prioridade Elevada",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
      bgClass: "bg-rose-50",
      textClass: "text-rose-700",
      borderClass: "border-rose-100",
      colorCode: "#f43f5e", // rose-500
    };
  }
}

/**
 * Calculates raw and risk index for a single block in a single record.
 * respostas is 21 items. blocoId is 1 to 7.
 */
export function calcularIndiceBlocoUnitario(
  respostas: (number | null)[],
  blocoId: number,
  tipo: "Risco" | "Proteção"
): { score: number | null; risco: number | null; respostasValidasCount: number } {
  const startIndex = (blocoId - 1) * 3;
  const blockAnswers = respostas.slice(startIndex, startIndex + 3);
  
  const validAnswers = blockAnswers.filter((a): a is number => a !== null && a !== undefined);
  if (validAnswers.length === 0) {
    return { score: null, risco: null, respostasValidasCount: 0 };
  }
  
  const sum = validAnswers.reduce((acc, val) => acc + val, 0);
  const average = sum / validAnswers.length;
  
  // Scale formula: Index = ((Average - 1) / 4) * 100
  const score = ((average - 1) / 4) * 100;
  
  let risco: number;
  if (tipo === "Risco") {
    // High score is bad (high risk)
    risco = score;
  } else {
    // High score is good (high protection -> low risk)
    risco = 100 - score;
  }
  
  return { 
    score: parseFloat(score.toFixed(1)), 
    risco: parseFloat(risco.toFixed(1)),
    respostasValidasCount: validAnswers.length 
  };
}

export interface BlocoResultadoAgregado {
  blocoId: number;
  nome: string;
  tipo: "Risco" | "Proteção";
  /** Percentage of favorable responses (for protection blocks, higher is good. For risk blocks, lower is good) */
  indiceFavorabilidade: number;
  /** Converted standard psychosocial risk index (higher is always more risky, matching the 4 risk color levels) */
  indiceRisco: number;
  respostasValidasTotal: number;
}

/**
 * Calculates aggregated statistics for each of the 7 blocks across a list of Atendimento records.
 */
export function calcularIndicadoresAgregados(registros: Atendimento[]): BlocoResultadoAgregado[] {
  return BLOCOS_CONFIG.map((bloco) => {
    let sumScore = 0;
    let sumRisk = 0;
    let count = 0;
    let totalValidAnswers = 0;
    
    for (const reg of registros) {
      const calc = calcularIndiceBlocoUnitario(reg.respostas, bloco.id, bloco.tipo);
      if (calc.score !== null && calc.risco !== null) {
        sumScore += calc.score;
        sumRisk += calc.risco;
        count++;
        totalValidAnswers += calc.respostasValidasCount;
      }
    }
    
    const avgScore = count > 0 ? sumScore / count : 0;
    const avgRisk = count > 0 ? sumRisk / count : 0;
    
    return {
      blocoId: bloco.id,
      nome: bloco.nome,
      tipo: bloco.tipo,
      indiceFavorabilidade: parseFloat(avgScore.toFixed(1)),
      indiceRisco: parseFloat(avgRisk.toFixed(1)),
      respostasValidasTotal: totalValidAnswers
    };
  });
}

export interface MetricasGerais {
  totalAvaliacoes: number;
  indiceRiscoGeral: number; // Average risk of the 7 blocks
  horasExtrasMedia: number;
  absenteismoMedio: number;
  rotatividadeMedia: number;
  totalProcuraSaude: number;
}

/**
 * Computes general executive metric cards from list of records.
 */
export function calcularMetricasGerais(registros: Atendimento[]): MetricasGerais {
  const total = registros.length;
  if (total === 0) {
    return {
      totalAvaliacoes: 0,
      indiceRiscoGeral: 0,
      horasExtrasMedia: 0,
      absenteismoMedio: 0,
      rotatividadeMedia: 0,
      totalProcuraSaude: 0
    };
  }
  
  const blocoAgregados = calcularIndicadoresAgregados(registros);
  const avgRiskGeral = blocoAgregados.reduce((acc, b) => acc + b.indiceRisco, 0) / blocoAgregados.length;
  
  let sumOvertime = 0;
  let sumAbsent = 0;
  let sumTurnover = 0;
  let sumHealth = 0;
  
  for (const reg of registros) {
    sumOvertime += reg.horasExtras || 0;
    sumAbsent += reg.absenteismo || 0;
    sumTurnover += reg.rotatividade || 0;
    sumHealth += reg.procuraSaude || 0;
  }
  
  return {
    totalAvaliacoes: total,
    indiceRiscoGeral: parseFloat(avgRiskGeral.toFixed(1)),
    horasExtrasMedia: parseFloat((sumOvertime / total).toFixed(1)),
    absenteismoMedio: parseFloat((sumAbsent / total).toFixed(2)),
    rotatividadeMedia: parseFloat((sumTurnover / total).toFixed(2)),
    totalProcuraSaude: sumHealth
  };
}

/**
 * Filter Atendimento list based on multiple dashboard filters.
 */
export function filtrarRegistros(
  registros: Atendimento[],
  filtros: {
    unidade: string;
    area: string;
    setor: string;
    cargo: string;
    turno: string;
    ciclo: string;
    tempoEmpresa: string;
    dataInicio: string;
    dataFim: string;
  }
): Atendimento[] {
  return registros.filter((reg) => {
    if (filtros.unidade && reg.unidade !== filtros.unidade) return false;
    if (filtros.area && reg.area !== filtros.area) return false;
    if (filtros.setor && reg.setor !== filtros.setor) return false;
    if (filtros.cargo && reg.cargo !== filtros.cargo) return false;
    if (filtros.turno && reg.turno !== filtros.turno) return false;
    if (filtros.ciclo && reg.ciclo !== filtros.ciclo) return false;
    if (filtros.tempoEmpresa && reg.tempoEmpresa !== filtros.tempoEmpresa) return false;
    
    if (filtros.dataInicio) {
      if (new Date(reg.data) < new Date(filtros.dataInicio)) return false;
    }
    if (filtros.dataFim) {
      if (new Date(reg.data) > new Date(filtros.dataFim)) return false;
    }
    
    return true;
  });
}
