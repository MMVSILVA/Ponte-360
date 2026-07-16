/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Atendimento {
  id: string;
  data: string; // YYYY-MM-DD
  ciclo: string; // e.g., "Ciclo 2025", "Ciclo 2026"
  unidade: string;
  area: string;
  setor: string;
  cargo: string;
  turno: string;
  tipoAtendimento: string;
  tempoEmpresa: string;
  faixaEtaria?: string;
  sexo?: string;
  respostas: (number | null)[]; // 21 responses (1 to 5, or null for N/A)
  
  // Organizational signals simulated per record to allow robust dashboard filtering
  horasExtras: number; // average extra hours in month
  absenteismo: number; // percentage of missed hours (e.g. 0 to 20%)
  rotatividade: number; // turnover percentage
  procuraSaude: number; // aggregate consultations (e.g., 0 or 1 for sentinela)
}

export interface PlanoDeAcao {
  id: string;
  indicadorId: number; // 1 to 7
  blocoNome: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: "Pendente" | "Em Andamento" | "Concluído";
  resultados: string;
  comentarios: string;
  unidade: string;
  area: string;
  dataCriacao: string;
}

export interface BlocoConfig {
  id: number;
  nome: string;
  tipo: "Risco" | "Proteção";
  perguntas: string[];
}

export const BLOCOS_CONFIG: BlocoConfig[] = [
  {
    id: 1,
    nome: "Metas, demandas e ritmo de trabalho",
    tipo: "Risco",
    perguntas: [
      "O ritmo de trabalho exigido para realizar as suas tarefas diárias é muito intenso ou acelerado?",
      "Você se sente sobrecarregado com a quantidade de tarefas ou com metas que parecem inatingíveis no tempo disponível?",
      "Há uma pressão constante na sua área para entregar resultados a qualquer custo, mesmo sacrificando pausas necessárias?"
    ]
  },
  {
    id: 2,
    nome: "Autonomia, participação e dilemas éticos",
    tipo: "Proteção",
    perguntas: [
      "Você tem liberdade e autonomia para decidir como organizar e realizar o seu trabalho no dia a dia?",
      "Sua opinião é ouvida e levada em conta nas decisões que afetam diretamente o seu setor ou rotina?",
      "Você sente que o seu trabalho pode ser realizado de forma ética e segura, sem necessidade de burlar regras ou valores?"
    ]
  },
  {
    id: 3,
    nome: "Liderança, apoio e segurança para falar",
    tipo: "Proteção",
    perguntas: [
      "Sua liderança direta oferece apoio, suporte e se mostra acessível quando você enfrenta dificuldades profissionais?",
      "Você se sente seguro para expressar suas opiniões, preocupações ou relatar falhas sem medo de retaliação ou punição?",
      "O canal de diálogo com seus gestores é aberto, transparente e pautado pelo respeito e escuta ativa?"
    ]
  },
  {
    id: 4,
    nome: "Reconhecimento, justiça e medo de consequências",
    tipo: "Proteção",
    perguntas: [
      "Você sente que seu esforço, dedicação e os resultados alcançados são reconhecidos e valorizados pelos seus gestores?",
      "As decisões de carreira, oportunidades de desenvolvimento e divisão de tarefas em sua área são justas e imparciais?",
      "Você sente estabilidade e tranquilidade psicológica para trabalhar, sem medo injustificado de demissão ou punições?"
    ]
  },
  {
    id: 5,
    nome: "Respeito, relações e violência no trabalho",
    tipo: "Proteção",
    perguntas: [
      "As relações interpessoais na sua equipe são respeitosas, amigáveis, colaborativas e livres de agressões verbais?",
      "A empresa adota medidas eficazes para combater e prevenir fofocas destrutivas, assédio moral, discriminação ou desrespeito?",
      "Você se sente verdadeiramente acolhido, respeitado e integrado pelas pessoas com quem convive profissionalmente?"
    ]
  },
  {
    id: 6,
    nome: "Recuperação e equilíbrio entre trabalho e vida",
    tipo: "Proteção",
    perguntas: [
      "Você consegue se desligar mentalmente do trabalho e descansar de forma saudável em seus períodos de folga e férias?",
      "As exigências do seu trabalho permitem que você mantenha uma boa rotina de sono, lazer e dedicação à sua família?",
      "A empresa respeita seus limites de tempo e jornada, evitando contatos ou cobranças fora do seu expediente regular?"
    ]
  },
  {
    id: 7,
    nome: "Recursos, clareza e gestão das mudanças",
    tipo: "Proteção",
    perguntas: [
      "Você dispõe das ferramentas, recursos materiais, sistemas e informações necessárias para realizar seu trabalho com qualidade?",
      "Há clareza total sobre o seu papel na organização, suas responsabilidades e o que a gestão espera do seu desempenho?",
      "As mudanças organizacionais (novos processos, fusões, tecnologias) são planejadas, comunicadas e coordenadas de forma transparente?"
    ]
  }
];

export const METADATA_LABELS = {
  unidades: ["Sesi Volta Redonda", "Senai Volta Redonda", "Sesi Barra Mansa", "Senai Resende"],
  areas: ["Educação Básica", "Educação Profissional", "Saúde & Lazer", "Administrativo & Operações"],
  setores: {
    "Educação Básica": ["Ensino Fundamental", "Ensino Médio", "Laboratório Maker", "Coordenação Pedagógica"],
    "Educação Profissional": ["Cursos Técnicos", "Aprendizagem Industrial", "Qualificação Profissional", "Oficinas Tecnológicas"],
    "Saúde & Lazer": ["Odontologia Ocupacional", "Promoção da Saúde", "Academia & Esportes", "Eventos Culturais"],
    "Administrativo & Operações": ["Secretaria Escolar", "Recursos Humanos", "Financeiro & Cobrança", "Infraestrutura & TI"]
  },
  cargos: ["Professor(a)", "Instrutor(a) de Educação Profissional", "Pedagogo(a)", "Agente Administrativo", "Coordenador(a) Pedagógico(a)", "Técnico(a) de Especialidade"],
  turnos: ["Turno A (Matutino)", "Turno B (Vespertino)", "Turno C (Noturno)", "Horário Administrativo"],
  tiposAtendimento: ["Exame Periódico", "Acompanhamento Preventivo", "Retorno ao Trabalho", "Atendimento Ocupacional"],
  temposEmpresa: ["< 1 ano", "1 a 3 anos", "3 a 5 anos", "Mais de 5 anos"],
  faixasEtarias: ["Até 25 anos", "26 a 35 anos", "36 a 45 anos", "Acima de 45 anos"],
  sexos: ["Feminino", "Masculino", "Não informado"]
};
