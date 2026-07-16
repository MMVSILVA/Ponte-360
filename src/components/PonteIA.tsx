import React, { useState, useEffect, useRef } from "react";
import { Atendimento, PlanoDeAcao } from "../types";
import { calcularMetricasGerais, calcularIndicadoresAgregados } from "../utils";
import { 
  Brain, Send, ShieldCheck, RefreshCw, Key, ArrowRight 
} from "lucide-react";

interface PonteIAProps {
  registros: Atendimento[];
  planos: PlanoDeAcao[];
}

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export default function PonteIA({ registros, planos }: PonteIAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load custom key if exists
  useEffect(() => {
    const savedKey = localStorage.getItem("firjan_gemini_key");
    if (savedKey) {
      setCustomKey(savedKey);
    }
  }, []);

  // Save custom key
  const handleSaveKey = () => {
    if (customKey.trim()) {
      localStorage.setItem("firjan_gemini_key", customKey.trim());
      alert("Chave API do Gemini personalizada gravada localmente!");
      setShowKeyInput(false);
    } else {
      localStorage.removeItem("firjan_gemini_key");
      alert("Chave API personalizada removida. Usando chave padrão do servidor.");
      setShowKeyInput(false);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Generate aggregate context string for Gemini
  const generateContextPrompt = () => {
    const metricas = calcularMetricasGerais(registros);
    const indicadores = calcularIndicadoresAgregados(registros);
    
    let indText = indicadores.map(i => {
      return `- Bloco ${i.blocoId} (${i.nome}): Índice de Risco = ${i.indiceRisco}% | Favorabilidade = ${i.indiceFavorabilidade}%`;
    }).join("\n");

    let plansText = planos.map(p => {
      return `- Plano ${p.id} no bloco [${p.blocoNome}] para ${p.unidade} - ${p.area}. Status: ${p.status}. Descrição: ${p.descricao}`;
    }).join("\n");

    return (
      `INDICADORES AGREGADOS DA ORGANIZAÇÃO (Médias estatísticas anônimas):\n` +
      `- Total de Atendimentos Coletados: ${metricas.totalAvaliacoes}\n` +
      `- Índice de Risco Psicossocial Geral: ${metricas.indiceRiscoGeral}%\n` +
      `- Média de Horas Extras de Área: ${metricas.horasExtrasMedia} horas/mês\n` +
      `- Absenteísmo Médio de Área: ${metricas.absenteismoMedio}%\n` +
      `- Rotatividade Média de Área: ${metricas.rotatividadeMedia}%\n` +
      `- Sinal Sentinela de Saúde Geral: ${metricas.totalProcuraSaude} demandas\n\n` +
      `DETALHAMENTO POR BLOCOS PSICOSSOCIAIS:\n${indText}\n\n` +
      `PLANOS DE INTERVENÇÃO ATIVOS:\n${plansText || "Nenhum plano cadastrado."}`
    );
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const dataContext = generateContextPrompt();
      
      const fullPrompt = 
        `Aqui estão os dados agregados coletados pelo instrumento PONTE 360 na nossa organização:\n\n` +
        `===================================\n` +
        `${dataContext}\n` +
        `===================================\n\n` +
        `Requisição do usuário ocupacional: ${textToSend}\n\n` +
        `Lembre-se de fornecer recomendações e análises éticas, mantendo o anonimato de forma absoluta e estruturando planos em conformidade com a NR-1 e ISO 45003.`;

      // Call Express server proxy route
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          customApiKey: customKey.trim() || undefined
        })
      });

      const resData = await response.json();

      if (response.ok && resData.text) {
        const aiMsg: Message = {
          sender: "ai",
          text: resData.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(resData.error || "Resposta vazia do servidor de inteligência artificial.");
      }
    } catch (error: any) {
      console.error("Erro no chat IA:", error);
      const errMsg: Message = {
        sender: "ai",
        text: `❌ **Erro ao processar requisição:** ${error.message || "Servidor indisponível"}. \n\n*Por favor, verifique se a chave de API do Gemini foi devidamente configurada.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuickAction = (actionType: string) => {
    let text = "";
    if (actionType === "resumo") {
      text = "Gere um Diagnóstico e Resumo Executivo Geral dos nossos indicadores psicossociais atuais. Aponte os blocos críticos e as prioridades regulamentares sob as diretrizes da NR-1.";
    } else if (actionType === "tendencias") {
      text = "Análise os indicadores de canais e suporte: faça um comparativo entre as taxas de sobrecarga percebida (Bloco 1) com os índices de absenteísmo, horas extras e procura pela área de saúde. O que essa correlação revela?";
    } else if (actionType === "iso") {
      text = "Sugira 3 ações preventivas e intervenções estruturais éticas de saúde mental coletiva seguindo a norma ISO 45003 (Fatores Psicossociais no Trabalho).";
    }
    handleSendMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  const cleanChat = () => {
    setMessages([
      {
        sender: "ai",
        text: "Olá! Eu sou o **Assistente Ético PONTE IA** 🤖. \n\nEstou pré-configurado com os dados agregados atuais da sua organização. Posso analisar riscos operacionais coletivos, diagnosticar problemas de clima baseados na NR-1 e propor planos de ação preventivos em total conformidade com a ISO 45003.\n\n*Nota de Confidencialidade: Eu opero exclusivamente com dados estatísticos e anônimos agregados de área. Nunca exponho ou tento individualizar dados de colaboradores.*",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Run on mount to seed greetings
  useEffect(() => {
    if (messages.length === 0) {
      cleanChat();
    }
  }, []);

  // Basic custom text/markdown renderer to prevent html crashes and provide gorgeous output
  const renderMessageText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let formattedLine = line;
      
      // Headers
      if (formattedLine.startsWith("### ")) {
        return <h5 key={idx} className="text-sm font-black text-slate-800 dark:text-white mt-3 mb-1.5 uppercase tracking-wide font-sans">{formattedLine.replace("### ", "")}</h5>;
      }
      if (formattedLine.startsWith("## ")) {
        return <h4 key={idx} className="text-base font-black text-slate-900 dark:text-white mt-4 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wide font-sans">{formattedLine.replace("## ", "")}</h4>;
      }
      if (formattedLine.startsWith("# ")) {
        return <h3 key={idx} className="text-lg font-black text-slate-950 dark:text-white mt-5 mb-3 uppercase tracking-wider font-sans">{formattedLine.replace("# ", "")}</h3>;
      }

      // Bullets
      if (formattedLine.trim().startsWith("- ") || formattedLine.trim().startsWith("* ")) {
        const cleanText = formattedLine.replace(/^[\s]*[-*]\s/, "");
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-1.5 font-sans font-medium">
            {parseBoldText(cleanText)}
          </li>
        );
      }

      // Regular line
      return (
        <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2 font-sans font-medium">
          {parseBoldText(formattedLine)}
        </p>
      );
    });
  };

  // Parse bold strings **like this** to <strong> tags
  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-slate-900 dark:text-white">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-4xl mx-auto overflow-hidden flex flex-col h-[650px]" id="painel-ponte-ia">
      {/* Top Banner */}
      <div className="bg-slate-950 dark:bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl text-white shadow-md animate-pulse">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black flex items-center gap-1.5 uppercase tracking-wider font-sans">
              PONTE IA
              <span className="text-[9px] font-extrabold bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest font-sans">
                Assistente Ético
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
              Análise inteligente baseada no Gemini 3.5 Flash
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-limpar-chat"
            onClick={cleanChat}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Limpar Conversa"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            id="btn-toggle-chave-api"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${customKey ? 'text-orange-400 hover:bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Configurar Chave API Personalizada"
          >
            <Key className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Key Input Slide-down Panel */}
      {showKeyInput && (
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-5 py-4 border-b border-slate-700 dark:border-slate-800 shrink-0 space-y-3" id="chave-api-container">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-orange-400 flex items-center gap-1 uppercase tracking-wide">
              <Key className="h-3.5 w-3.5" />
              Chave API do Gemini Personalizada
            </h4>
            <span className="text-[9px] font-bold text-slate-450 bg-slate-900 px-2 py-0.5 rounded uppercase tracking-wider">Local Storage</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Por padrão, o protótipo usa a chave do servidor do AI Studio. Caso queira usar sua própria chave pessoal, cole-a abaixo (armazenada de forma segura apenas no seu navegador).
          </p>
          <div className="flex gap-2">
            <input
              id="input-chave-api-gemini"
              type="password"
              placeholder="Cole sua GEMINI_API_KEY..."
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <button
              id="btn-gravar-chave"
              onClick={handleSaveKey}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4.5 py-1.5 rounded-lg font-extrabold uppercase tracking-wider transition-colors font-sans cursor-pointer"
            >
              Gravar
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/20" id="chat-messages-container">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === "user";
          return (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div 
                className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-black uppercase font-sans ${
                  isUser ? "bg-slate-800 dark:bg-slate-700 text-white" : "bg-orange-500 text-white"
                }`}
              >
                {isUser ? "U" : "IA"}
              </div>
              <div 
                className={`p-4 rounded-2xl shadow-2xs border ${
                  isUser 
                    ? "bg-slate-900 dark:bg-slate-800 text-white border-slate-850 dark:border-slate-700 rounded-tr-xs" 
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 rounded-tl-xs"
                }`}
              >
                <div className="space-y-1">
                  {renderMessageText(msg.text)}
                </div>
                <span className={`text-[9px] font-bold block text-right mt-2 ${isUser ? "text-slate-400" : "text-slate-450"}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto" id="loading-indicator">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white shrink-0 flex items-center justify-center text-xs font-black animate-pulse">
              IA
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 font-bold uppercase tracking-wider">Analisando índices organizacionais...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Suggestion Panel (Visible when chat is short or empty) */}
      {messages.length <= 1 && (
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0" id="quick-actions-ia">
          <button
            id="btn-quick-resumo"
            onClick={() => executeQuickAction("resumo")}
            className="flex items-center justify-between text-left p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-orange-500/10 hover:border-orange-400/50 transition-all text-xs group cursor-pointer"
          >
            <div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block group-hover:text-orange-500 uppercase tracking-wide text-[10px]">Resumo Executivo</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Diagnóstico geral de risco</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-transform shrink-0" />
          </button>

          <button
            id="btn-quick-tendencias"
            onClick={() => executeQuickAction("tendencias")}
            className="flex items-center justify-between text-left p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-orange-500/10 hover:border-orange-400/50 transition-all text-xs group cursor-pointer"
          >
            <div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block group-hover:text-orange-500 uppercase tracking-wide text-[10px]">Análise de Tendência</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sobrecarga vs Absenteísmo</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-transform shrink-0" />
          </button>

          <button
            id="btn-quick-iso"
            onClick={() => executeQuickAction("iso")}
            className="flex items-center justify-between text-left p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-orange-500/10 hover:border-orange-400/50 transition-all text-xs group cursor-pointer"
          >
            <div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block group-hover:text-orange-500 uppercase tracking-wide text-[10px]">Ideias ISO 45003</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Medidas de suporte ético</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-transform shrink-0" />
          </button>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex gap-2">
        <input
          id="input-pergunta-chat"
          type="text"
          placeholder="Pergunte sobre as diretrizes da NR-1, planos de melhoria ou tendências..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
        />
        <button
          id="btn-enviar-pergunta"
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() || isLoading}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white rounded-lg p-3 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Security note */}
      <div className="bg-slate-100 dark:bg-slate-950/60 py-1.5 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 text-center shrink-0 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 font-sans">
        <ShieldCheck className="h-4 w-4 text-orange-500 shrink-0" />
        <span>Garantia de Sigilo Coletivo: Todo processamento textual é baseado em vetores de cálculo estatístico.</span>
      </div>
    </div>
  );
}
