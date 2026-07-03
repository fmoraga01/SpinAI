export interface LandscapeEntry {
  name: string;
  url: string;
  description: string;
}

export interface LandscapeCategory {
  category: string;
  entries: LandscapeEntry[];
}

// Curado a mano — a diferencia de ai_models/news_items/research_papers,
// no existe una API pública que mapee el ecosistema completo de IA por
// categoría. Revisar y actualizar periódicamente.
export const AI_LANDSCAPE: LandscapeCategory[] = [
  {
    category: "Foundation Models",
    entries: [
      { name: "GPT (OpenAI)", url: "https://openai.com/", description: "Familia GPT y o-series" },
      { name: "Claude (Anthropic)", url: "https://www.anthropic.com/", description: "Familia Claude" },
      { name: "Gemini (Google DeepMind)", url: "https://deepmind.google/", description: "Familia Gemini" },
      { name: "Llama (Meta)", url: "https://ai.meta.com/", description: "Familia Llama, open-weights" },
      { name: "Grok (xAI)", url: "https://x.ai/", description: "Familia Grok" },
    ],
  },
  {
    category: "Open Source",
    entries: [
      { name: "Hugging Face", url: "https://huggingface.co/", description: "Hub de modelos y datasets" },
      { name: "Mistral", url: "https://mistral.ai/", description: "Modelos open-weights europeos" },
      { name: "DeepSeek", url: "https://www.deepseek.com/", description: "Modelos open-weights de alto rendimiento" },
      { name: "Ollama", url: "https://ollama.com/", description: "Runtime local para modelos open-weights" },
    ],
  },
  {
    category: "APIs y plataformas",
    entries: [
      { name: "OpenRouter", url: "https://openrouter.ai/", description: "Un solo endpoint para cientos de modelos" },
      { name: "Together AI", url: "https://www.together.ai/", description: "Inferencia y fine-tuning de open-weights" },
      { name: "Groq", url: "https://groq.com/", description: "Inferencia de altísima velocidad" },
      { name: "Replicate", url: "https://replicate.com/", description: "Modelos como API, sin infraestructura propia" },
    ],
  },
  {
    category: "Frameworks",
    entries: [
      { name: "LangChain", url: "https://www.langchain.com/", description: "Orquestación de LLMs y cadenas" },
      { name: "LlamaIndex", url: "https://www.llamaindex.ai/", description: "Indexación y RAG sobre datos propios" },
      { name: "Vercel AI SDK", url: "https://sdk.vercel.ai/", description: "SDK para apps de IA en producción" },
    ],
  },
  {
    category: "Infraestructura",
    entries: [
      { name: "NVIDIA", url: "https://www.nvidia.com/", description: "GPUs y stack de cómputo para IA" },
      { name: "Modal", url: "https://modal.com/", description: "Cómputo serverless para cargas de IA" },
      { name: "Pinecone", url: "https://www.pinecone.io/", description: "Base de datos vectorial" },
    ],
  },
  {
    category: "Herramientas",
    entries: [
      { name: "Cursor", url: "https://www.cursor.com/", description: "Editor de código nativo de IA" },
      { name: "Claude Code", url: "https://www.claude.com/product/claude-code", description: "Agente de código en terminal" },
      { name: "Perplexity", url: "https://www.perplexity.ai/", description: "Búsqueda conversacional con fuentes" },
    ],
  },
];

export interface AgentEntry {
  name: string;
  url: string;
  description: string;
}

export interface AgentCategory {
  category: string;
  entries: AgentEntry[];
}

export const AI_AGENTS: AgentCategory[] = [
  {
    category: "Frameworks multi-agente",
    entries: [
      { name: "CrewAI", url: "https://www.crewai.com/", description: "Equipos de agentes con roles definidos" },
      { name: "AutoGen", url: "https://microsoft.github.io/autogen/", description: "Conversaciones multi-agente de Microsoft" },
      { name: "LangGraph", url: "https://www.langchain.com/langgraph", description: "Grafos de estado para agentes" },
    ],
  },
  {
    category: "Protocolos",
    entries: [
      { name: "MCP (Model Context Protocol)", url: "https://modelcontextprotocol.io/", description: "Estándar abierto para conectar agentes con herramientas y datos" },
      { name: "A2A (Agent2Agent)", url: "https://a2aproject.github.io/A2A/", description: "Protocolo de comunicación entre agentes" },
    ],
  },
  {
    category: "SDKs de agentes",
    entries: [
      { name: "Claude Agent SDK", url: "https://docs.claude.com/en/api/agent-sdk/overview", description: "SDK de Anthropic para construir agentes" },
      { name: "OpenAI Agents SDK", url: "https://openai.github.io/openai-agents-python/", description: "SDK de OpenAI para orquestar agentes" },
    ],
  },
  {
    category: "Plataformas",
    entries: [
      { name: "Devin (Cognition)", url: "https://cognition.ai/", description: "Agente autónomo de ingeniería de software" },
      { name: "Manus", url: "https://manus.im/", description: "Agente general para tareas complejas de múltiples pasos" },
    ],
  },
];
