import React, { useState, useMemo } from "react";
import { PlanoDeAcao, METADATA_LABELS, BLOCOS_CONFIG } from "../types";
import { DataService } from "../services/dataService";
import { 
  ClipboardList, Plus, Edit2, Trash2, CheckCircle, 
  AlertCircle, Calendar, User, Search, MapPin, Briefcase 
} from "lucide-react";

interface PlanosAcaoProps {
  planos: PlanoDeAcao[];
  onRefresh: () => void;
}

export default function PlanosAcao({ planos, onRefresh }: PlanosAcaoProps) {
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activePlanId, setActivePlanId] = useState("");

  // Form Fields
  const [indicadorId, setIndicadorId] = useState<number>(1);
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [status, setStatus] = useState<"Pendente" | "Em Andamento" | "Concluído">("Pendente");
  const [resultados, setResultados] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [unidade, setUnidade] = useState("");
  const [area, setArea] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filtered plans
  const planosFiltrados = useMemo(() => {
    return planos.filter(p => {
      if (filterUnidade && p.unidade !== filterUnidade) return false;
      if (filterArea && p.area !== filterArea) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          p.descricao.toLowerCase().includes(term) ||
          p.responsavel.toLowerCase().includes(term) ||
          p.blocoNome.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [planos, searchTerm, filterUnidade, filterArea, filterStatus]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActivePlanId("");
    setIndicadorId(1);
    setDescricao("");
    setResponsavel("");
    setPrazo(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default 30 days from now
    setStatus("Pendente");
    setResultados("");
    setComentarios("");
    setUnidade(METADATA_LABELS.unidades[0]);
    setArea(METADATA_LABELS.areas[0]);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (plano: PlanoDeAcao) => {
    setIsEditing(true);
    setActivePlanId(plano.id);
    setIndicadorId(plano.indicadorId);
    setDescricao(plano.descricao);
    setResponsavel(plano.responsavel);
    setPrazo(plano.prazo);
    setStatus(plano.status);
    setResultados(plano.resultados);
    setComentarios(plano.comentarios);
    setUnidade(plano.unidade);
    setArea(plano.area);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !responsavel || !prazo || !unidade || !area) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    try {
      const bloco = BLOCOS_CONFIG.find(b => b.id === indicadorId);
      const blocoNome = bloco ? bloco.nome : "Fator Geral";

      const planoSalvar: PlanoDeAcao = {
        id: isEditing ? activePlanId : `plano-${Date.now()}`,
        indicadorId,
        blocoNome,
        descricao,
        responsavel,
        prazo,
        status,
        resultados,
        comentarios,
        unidade,
        area,
        dataCriacao: isEditing 
          ? planos.find(p => p.id === activePlanId)?.dataCriacao || new Date().toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      };

      await DataService.salvarPlanoDeAcao(planoSalvar);
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg("Erro ao salvar plano de ação: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (confirm("Deseja realmente excluir este plano de ação preventivo?")) {
      try {
        await DataService.deletarPlanoDeAcao(id);
        onRefresh();
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6" id="modulo-planos">
      
      {/* Header com Botao de Criacao */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            Planos de Intervenção Ético-Preventiva
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Gerencie ações e melhorias focadas nos indicadores psicossociais críticos gerados pelo Ponte 360 (NR-1 / ISO 45003).
          </p>
        </div>

        <button
          id="btn-criar-plano-acao"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-xs transition-colors uppercase tracking-wider shadow-sm cursor-pointer font-sans"
        >
          <Plus className="h-4 w-4" />
          Novo Plano de Ação
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="input-busca-planos"
            type="text"
            placeholder="Buscar por descrição, responsável ou bloco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <select
            id="filtro-plano-unidade"
            value={filterUnidade}
            onChange={(e) => setFilterUnidade(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer"
          >
            <option value="">Todas Unidades</option>
            {METADATA_LABELS.unidades.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <select
            id="filtro-plano-area"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer"
          >
            <option value="">Todas Áreas</option>
            {METADATA_LABELS.areas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            id="filtro-plano-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer"
          >
            <option value="">Todos Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>
      </div>

      {/* Lista de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="lista-planos-grid">
        {planosFiltrados.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 text-center text-xs text-slate-450 dark:text-slate-500">
            Nenhum plano de ação preventivo encontrado com os filtros ativos.
          </div>
        ) : (
          planosFiltrados.map((plano) => {
            let badgeColor = "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
            if (plano.status === "Em Andamento") badgeColor = "bg-amber-100 dark:bg-amber-950/45 text-amber-850 dark:text-amber-400 border-amber-200 dark:border-amber-900/30";
            if (plano.status === "Concluído") badgeColor = "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-850 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30";

            return (
              <div 
                key={plano.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-orange-500 bg-orange-500/10 border border-orange-200/50 dark:border-orange-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                      Bloco {plano.indicadorId}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 border rounded-full uppercase tracking-wider font-sans ${badgeColor}`}>
                      {plano.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 dark:text-white line-clamp-1 leading-snug">{plano.blocoNome}</h4>
                  <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed min-h-[48px]">{plano.descricao}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-y-2 text-[11px] text-slate-500 dark:text-slate-450">
                    <div className="flex items-center gap-1.5 font-bold">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{plano.unidade} ({plano.area})</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Prazo: {plano.prazo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2 font-bold">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-650 dark:text-slate-350">Resp: <span className="font-extrabold text-slate-850 dark:text-white">{plano.responsavel}</span></span>
                    </div>
                  </div>

                  {plano.resultados && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-[11px]">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1 uppercase tracking-wider text-[10px]">Resultados Alcançados:</span>
                      <p className="text-slate-650 dark:text-slate-350">{plano.resultados}</p>
                    </div>
                  )}

                  {plano.comentarios && (
                    <div className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-[11px]">
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">Notas / Evidências:</span>
                      <p className="text-slate-650 dark:text-slate-350">{plano.comentarios}</p>
                    </div>
                  )}

                  {/* Botoes de Acao do Plano */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      id={`btn-editar-plano-${plano.id}`}
                      onClick={() => handleOpenEdit(plano)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-orange-500 hover:bg-orange-500/10 rounded transition-colors cursor-pointer"
                      title="Editar plano"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      id={`btn-deletar-plano-${plano.id}`}
                      onClick={() => handleDeletar(plano.id)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      title="Excluir plano"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Criacao / Edicao */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 overflow-y-auto" id="modal-plano-acao">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-850 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isEditing ? "Editar Plano de Ação Preventivo" : "Criar Novo Plano de Ação Preventivo"}
              </h4>
              <button 
                id="btn-fechar-modal"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4 text-xs font-bold uppercase tracking-wider">
              {/* Indicador / Bloco Vinculado */}
              <div>
                <label htmlFor="modal-select-bloco" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Bloco de Risco Vinculado *</label>
                <select
                  id="modal-select-bloco"
                  value={indicadorId}
                  onChange={(e) => setIndicadorId(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs cursor-pointer"
                >
                  {BLOCOS_CONFIG.map(b => (
                    <option key={b.id} value={b.id}>Bloco {b.id} - {b.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Unidade */}
                <div>
                  <label htmlFor="modal-select-unidade" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Unidade *</label>
                  <select
                    id="modal-select-unidade"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs cursor-pointer"
                  >
                    {METADATA_LABELS.unidades.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Área */}
                <div>
                  <label htmlFor="modal-select-area" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Área Corporativa *</label>
                  <select
                    id="modal-select-area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs cursor-pointer"
                  >
                    {METADATA_LABELS.areas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição da Ação Preventiva */}
              <div>
                <label htmlFor="modal-input-descricao" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Ação Preventiva (Escopo e Detalhes) *</label>
                <textarea
                  id="modal-input-descricao"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva as medidas corretivas estruturais, revisão de horários, metas ou melhorias no diálogo ocupacional que serão executadas."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs font-normal normal-case"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Responsável */}
                <div className="sm:col-span-2">
                  <label htmlFor="modal-input-responsavel" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Responsáveis (Nome / Cargo) *</label>
                  <input
                    id="modal-input-responsavel"
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Ex: Dra. Eliane Santos"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs font-normal normal-case"
                  />
                </div>

                {/* Prazo */}
                <div>
                  <label htmlFor="modal-input-prazo" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Prazo de Conclusão *</label>
                  <input
                    id="modal-input-prazo"
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="modal-select-status" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Status da Ação *</label>
                <select
                  id="modal-select-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs cursor-pointer"
                >
                  <option value="Pendente">Pendente (Não iniciada)</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído (Realizada)</option>
                </select>
              </div>

              {/* Resultados (Only relevant or editable if Concluído or existing) */}
              {(status === "Concluído" || isEditing) && (
                <div>
                  <label htmlFor="modal-input-resultados" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Resultados e Impacto Observado</label>
                  <textarea
                    id="modal-input-resultados"
                    rows={2}
                    value={resultados}
                    onChange={(e) => setResultados(e.target.value)}
                    placeholder="Ex: Redução observada de 40% no índice de risco de sobrecarga no ciclo seguinte."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs font-normal normal-case"
                  />
                </div>
              )}

              {/* Comentários / Notas */}
              <div>
                <label htmlFor="modal-input-comentarios" className="block text-slate-500 dark:text-slate-400 mb-1.5 text-[10px]">Evidências / Notas Administrativas</label>
                <textarea
                  id="modal-input-comentarios"
                  rows={2}
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Anotações internas do comitê de ética ou medicina do trabalho."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-slate-900 text-slate-950 dark:text-white text-xs font-normal normal-case"
                />
              </div>

              {/* Error validation */}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-red-650 dark:text-red-400 text-xs flex items-center gap-1.5 font-normal normal-case">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Botoes de Acao */}
              <div className="flex justify-end gap-2 border-t border-slate-150 dark:border-slate-800 pt-3 mt-3">
                <button
                  id="btn-cancelar-modal"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submeter-modal"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer font-sans"
                >
                  {isSaving ? "Salvando..." : "Salvar Plano de Ação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
