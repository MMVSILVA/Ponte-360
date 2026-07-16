/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Atendimento, PlanoDeAcao, METADATA_LABELS } from "../types";

const DB_NAME = "Ponte360DB";
const DB_VERSION = 1;
const STORE_ATENDIMENTOS = "atendimentos";
const STORE_PLANOS = "planos";

/**
 * Opens connection to IndexedDB database and ensures stores are created.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ATENDIMENTOS)) {
        db.createObjectStore(STORE_ATENDIMENTOS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PLANOS)) {
        db.createObjectStore(STORE_PLANOS, { keyPath: "id" });
      }
    };
  });
}

/**
 * Seed mock data into the database if empty.
 */
function generateMockData(): Atendimento[] {
  const atendimentos: Atendimento[] = [];
  const cycles = ["Ciclo 2025", "Ciclo 2026"];
  const units = METADATA_LABELS.unidades;
  const areas = METADATA_LABELS.areas;
  
  let idCounter = 1;

  for (const ciclo of cycles) {
    const is2026 = ciclo === "Ciclo 2026";
    for (const unidade of units) {
      for (const area of areas) {
        const sectors = METADATA_LABELS.setores[area as keyof typeof METADATA_LABELS.setores] || [];
        const count = area === "Educação Profissional" ? 4 : 2;
        
        for (let i = 0; i < count; i++) {
          const sector = sectors[i % sectors.length];
          const cargo = METADATA_LABELS.cargos[i % METADATA_LABELS.cargos.length];
          const turno = METADATA_LABELS.turnos[(i + idCounter) % METADATA_LABELS.turnos.length];
          const tipoAtendimento = METADATA_LABELS.tiposAtendimento[(i * 3) % METADATA_LABELS.tiposAtendimento.length];
          const tempoEmpresa = METADATA_LABELS.temposEmpresa[(i + 2) % METADATA_LABELS.temposEmpresa.length];
          const faixaEtaria = METADATA_LABELS.faixasEtarias[(i + 1) % METADATA_LABELS.faixasEtarias.length];
          const sexo = METADATA_LABELS.sexos[i % METADATA_LABELS.sexos.length];
          
          const respostas: (number | null)[] = [];
          
          // Block 1: Metas, demandas (Risco).
          let b1Base = 2.5;
          if (unidade.includes("Volta Redonda") && area === "Educação Profissional") {
            b1Base = is2026 ? 2.8 : 4.4; // Improved from 4.4 (high overload) to 2.8 in 2026
          } else if (unidade.includes("Resende")) {
            b1Base = 3.3;
          } else {
            b1Base = 2.2;
          }
          
          // Block 2: Autonomia (Proteção).
          let b2Base = area === "Administrativo & Operações" ? 4.4 : 3.4;
          if (unidade.includes("Volta Redonda") && !is2026) {
            b2Base -= 0.8; // Worse in 2025
          }
          
          // Block 3: Liderança & Segurança (Proteção).
          let b3Base = 4.0;
          if (unidade.includes("Volta Redonda") && !is2026) b3Base = 2.9;
          if (unidade.includes("Resende") && is2026) b3Base = 3.2; // Drop in safety in Resende 2026
          
          // Block 4: Reconhecimento (Proteção).
          let b4Base = 3.6;
          if (unidade.includes("Barra Mansa")) b4Base = 4.3; // Barra Mansa scores high
          
          // Block 5: Respeito (Proteção).
          let b5Base = 4.4;
          if (unidade.includes("Resende") && is2026 && area === "Educação Profissional") {
            b5Base = 2.6; // High tension/conflict in Resende 2026!
          }
          
          // Block 6: Equilíbrio (Proteção).
          let b6Base = 3.7;
          if (area === "Saúde & Lazer") b6Base = 3.0; // Lots of emergency tasks
          if (unidade.includes("Volta Redonda") && area === "Educação Profissional" && !is2026) {
            b6Base = 2.5; // Burnout warning in 2025
          }
          
          // Block 7: Recursos (Proteção).
          let b7Base = 4.1;
          if (unidade.includes("Volta Redonda") && !is2026) b7Base = 3.2;
          
          const bases = [b1Base, b2Base, b3Base, b4Base, b5Base, b6Base, b7Base];
          
          for (let b = 0; b < 7; b++) {
            const base = bases[b];
            for (let q = 0; q < 3; q++) {
              // Sine wave for deterministic yet realistic fluctuations
              const noise = Math.sin(idCounter * 9 + b * 5 + q * 3) * 0.9;
              let val = Math.round(base + noise);
              val = Math.max(1, Math.min(5, val));
              
              // Random N/A entries
              if ((idCounter + q) % 19 === 0) {
                respostas.push(null);
              } else {
                respostas.push(val);
              }
            }
          }
          
          // Organizational signals matching the profile
          let horasExtras = area === "Saúde & Lazer" ? 14 + (idCounter % 7) : 2 + (idCounter % 5);
          if (unidade.includes("Volta Redonda") && area === "Educação Profissional" && !is2026) {
            horasExtras += 15; // VR worked extreme hours in 2025
          }
          
          let absenteismo = 1.2 + (idCounter % 4) * 0.6;
          if (unidade.includes("Volta Redonda") && !is2026) {
            absenteismo += 4.2; // High absenteeism in VR 2025
          }
          
          let rotatividade = 1.5 + (idCounter % 5) * 0.8;
          if (unidade.includes("Resende") && is2026) {
            rotatividade += 5.5; // High turnover in Resende 2026
          }
          
          let procuraSaude = (idCounter % 7 === 0) ? 1 : 0;
          if (unidade.includes("Volta Redonda") && area === "Educação Profissional" && !is2026) {
            procuraSaude += 2;
          }
          
          const day = String((idCounter % 25) + 1).padStart(2, '0');
          const dataStr = is2026 ? `2026-04-${day}` : `2025-05-${day}`;
          
          atendimentos.push({
            id: `atend-${ciclo.replace(/\s+/g, "")}-${idCounter}`,
            data: dataStr,
            ciclo,
            unidade,
            area,
            setor: sector,
            cargo,
            turno,
            tipoAtendimento,
            tempoEmpresa,
            faixaEtaria,
            sexo,
            respostas,
            horasExtras,
            absenteismo: parseFloat(absenteismo.toFixed(1)),
            rotatividade: parseFloat(rotatividade.toFixed(1)),
            procuraSaude
          });
          
          idCounter++;
        }
      }
    }
  }
  
  return atendimentos;
}

function generateMockPlans(): PlanoDeAcao[] {
  return [
    {
      id: "plano-1",
      indicadorId: 1,
      blocoNome: "Metas, demandas e ritmo de trabalho",
      descricao: "Programa de Redução de Sobrecarga: Revisão de metas de atendimento de alunos, contratação de professores substitutos para gargalos de aulas e instituição de folgas de recuperação programadas.",
      responsavel: "Dra. Eliane Santos (Saúde Ocupacional) & Mariana Souza (Coordenação)",
      prazo: "2025-11-30",
      status: "Concluído",
      resultados: "Sucesso. No Ciclo 2026, o índice de risco do bloco caiu de 85% para 45%. Absenteísmo na área de Educação Profissional caiu pela metade.",
      comentarios: "Ação realizada em parceria direta com o sindicato local e comitê de ética após o diagnóstico de burnout no Ciclo 2025.",
      unidade: "Senai Volta Redonda",
      area: "Educação Profissional",
      dataCriacao: "2025-06-15"
    },
    {
      id: "plano-2",
      indicadorId: 5,
      blocoNome: "Respeito, relações e violência no trabalho",
      descricao: "Mediação ativa e ciclo de rodas de conversa ética: Aplicação de sensibilização sobre assédio moral e violência verbal na equipe de Educação Profissional do Senai Resende, devido a alertas sentinela e queda do índice de respeito.",
      responsavel: "Roberto Alencar (Recursos Humanos)",
      prazo: "2026-08-15",
      status: "Em Andamento",
      resultados: "Rodas de escuta iniciadas em Junho/2026. Comitê de acompanhamento neutro estabelecido.",
      comentarios: "Meta de elevar o índice de respeito favorável de 40% para pelo menos 75% no próximo ciclo monitorado.",
      unidade: "Senai Resende",
      area: "Educação Profissional",
      dataCriacao: "2026-05-10"
    },
    {
      id: "plano-3",
      indicadorId: 3,
      blocoNome: "Liderança, apoio e segurança para falar",
      descricao: "Treinamento de Liderança Facilitadora: Capacitação obrigatória de diretores e coordenadores escolares em liderança humanizada, segurança psicológica de times (ISO 45003) e canais éticos anônimos.",
      responsavel: "Comitê de Ética & Diretoria Escolar",
      prazo: "2026-09-30",
      status: "Em Andamento",
      resultados: "50% dos líderes de Volta Redonda e Resende já completaram o módulo básico.",
      comentarios: "Ação iniciada após feedback dos canais de Ouvidoria e o monitoramento ético do Ponte 360.",
      unidade: "Sesi Volta Redonda",
      area: "Educação Básica",
      dataCriacao: "2026-04-18"
    }
  ];
}

/**
 * Data Access Service (Isolation Layer).
 * All Reads/Writes pass through this class.
 */
export class DataService {
  /**
   * PONTO DE MIGRAÇÃO FUTURA
   * Para conectar com um backend real (NestJS / Postgres), basta substituir as chamadas IndexedDB por `fetch` na API.
   * Exemplo:
   * async getRegistros(): Promise<Atendimento[]> {
   *   const res = await fetch(`${process.env.APP_URL}/api/atendimentos`);
   *   return res.json();
   * }
   */

  static async getRegistros(): Promise<Atendimento[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ATENDIMENTOS, "readonly");
      const store = transaction.objectStore(STORE_ATENDIMENTOS);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  static async salvarRegistro(registro: Atendimento): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ATENDIMENTOS, "readwrite");
      const store = transaction.objectStore(STORE_ATENDIMENTOS);
      const request = store.put(registro);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  static async salvarVariosRegistros(registros: Atendimento[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ATENDIMENTOS, "readwrite");
      const store = transaction.objectStore(STORE_ATENDIMENTOS);
      
      for (const reg of registros) {
        store.put(reg);
      }
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }

  static async getPlanosDeAcao(): Promise<PlanoDeAcao[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PLANOS, "readonly");
      const store = transaction.objectStore(STORE_PLANOS);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  static async salvarPlanoDeAcao(plano: PlanoDeAcao): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PLANOS, "readwrite");
      const store = transaction.objectStore(STORE_PLANOS);
      const request = store.put(plano);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  static async salvarVariosPlanos(planos: PlanoDeAcao[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PLANOS, "readwrite");
      const store = transaction.objectStore(STORE_PLANOS);
      
      for (const pl of planos) {
        store.put(pl);
      }
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }

  static async deletarPlanoDeAcao(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PLANOS, "readwrite");
      const store = transaction.objectStore(STORE_PLANOS);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Resets database completely and seeds fresh mock data.
   */
  static async resetarBanco(): Promise<void> {
    localStorage.removeItem("ponte360_db_emptied");
    const db = await openDB();
    return new Promise((resolve, reject) => {
      // Clear atendimentos
      const tx1 = db.transaction(STORE_ATENDIMENTOS, "readwrite");
      tx1.objectStore(STORE_ATENDIMENTOS).clear();
      
      tx1.oncomplete = async () => {
        // Clear planos
        const tx2 = db.transaction(STORE_PLANOS, "readwrite");
        tx2.objectStore(STORE_PLANOS).clear();
        
        tx2.oncomplete = async () => {
          const mockData = generateMockData();
          const mockPlans = generateMockPlans();
          await DataService.salvarVariosRegistros(mockData);
          await DataService.salvarVariosPlanos(mockPlans);
          resolve();
        };
        tx2.onerror = () => reject(tx2.error);
      };
      tx1.onerror = () => reject(tx1.error);
    });
  }

  /**
   * Completely clears the database (leaves 0 records) and prevents auto-seeding.
   */
  static async zerarBancoTotalmente(): Promise<void> {
    localStorage.setItem("ponte360_db_emptied", "true");
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_ATENDIMENTOS, STORE_PLANOS], "readwrite");
      tx.objectStore(STORE_ATENDIMENTOS).clear();
      tx.objectStore(STORE_PLANOS).clear();
      
      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Exports full IndexedDB database to a standard JSON backup string.
   */
  static async exportarBancoJSON(): Promise<string> {
    const atendimentos = await DataService.getRegistros();
    const planos = await DataService.getPlanosDeAcao();
    
    return JSON.stringify({
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      atendimentos,
      planos
    }, null, 2);
  }

  /**
   * Imports database records from a JSON backup.
   */
  static async importarBancoJSON(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    if (!data.atendimentos || !data.planos) {
      throw new Error("Formato de arquivo inválido para backup do Ponte 360.");
    }
    
    const db = await openDB();
    
    // Clear first
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ATENDIMENTOS, STORE_PLANOS], "readwrite");
      tx.objectStore(STORE_ATENDIMENTOS).clear();
      tx.objectStore(STORE_PLANOS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Save imported data
    await DataService.salvarVariosRegistros(data.atendimentos);
    await DataService.salvarVariosPlanos(data.planos);
  }
}
