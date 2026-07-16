/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup JSON parsing middleware
  app.use(express.json());

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Route - Assistente Ético PONTE IA (Gemini API proxy)
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, customApiKey } = req.body;
      
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: "API Key do Gemini não configurada. Configure a chave nas configurações do AI Studio (Secrets) ou insira uma chave de teste no formulário." 
        });
      }

      // Initialize the official Google Gen AI SDK
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = 
        "Você é o Assistente Ético PONTE IA, um sistema avançado desenvolvido pela Firjan SENAI Volta Redonda especialista em saúde psicossocial ocupacional, NR-1 (Gerenciamento de Riscos Ocupacionais) e ISO 45003.\n\n" +
        "Seu papel é analisar dados agregados de escuta estruturada organizados em 7 blocos psicossociais e propor resumos executivos, insights de tendências organizacionais e sugestões de planos de ação preventivos coletivos.\n\n" +
        "PRINCÍPIOS ÉTICOS INEGOCIÁVEIS:\n" +
        "1. ANOMINATO ABSOLUTO: Sob nenhuma circunstância você deve citar, identificar ou tentar deduzir nomes, CPFs, matrículas ou dados clínicos individuais de colaboradores. Todas as sugestões são para TENDÊNCIAS COLETIVAS por unidade, área ou setor.\n" +
        "2. PREVENÇÃO SOBRE PUNIÇÃO: Foque em sugestões estruturais e de processos (ex: redistribuição de demandas, capacitação de liderança, segurança psicológica, canais de escuta), nunca em perseguição de pessoas ou responsabilização individual de colaboradores.\n" +
        "3. LINGUAGEM ÉTICA E CONSTRUTIVA: Use uma abordagem clara, corporativa, empática, técnica e alinhada com as melhores práticas de ESG e Governança Humana.\n" +
        "4. Alerte se o usuário fornecer dados que possam identificar individualmente uma pessoa e recuse-se a processá-los caso haja risco de quebra de sigilo.\n\n" +
        "Responda sempre em português brasileiro e utilize formatação em Markdown bem estruturada com emojis profissionais de sinalização (ex: 🟢, 🟡, 🟠, 🔴, 💡, 📋).";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Erro na rota Gemini:", error);
      res.status(500).json({ 
        error: error.message || "Ocorreu um erro interno ao processar a requisição com o modelo Gemini." 
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving static files from: ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PONTE 360 Server running on port ${PORT}`);
  });
}

startServer();
