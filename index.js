import { createOpenAI } from "@ai-sdk/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { generateText } from "ai";
import { content } from "./src/utils/loader.js";
import {
  addDocuments,
  initializeStore,
  searchDocuments,
} from "./src/utils/store.js";

//! 1) Inicializar el store (vectorial)
// Prepara la estructura de datos donde se almacenarán los embeddings
await initializeStore();

//! 2) Fragmentar el reglamento en chunks de texto para una búsqueda eficiente
// Definimos el tamaño de cada fragmento y el solapamiento para preservar contexto
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1800, // tamaño máximo de cada fragmento
  chunkOverlap: 200, // solapamiento entre chunks
});
const chunks = await textSplitter.splitText(content);
console.log(`Se indexaron ${chunks.length} fragmentos de documentos.`);

//! 3) Indexar fragmentos al store para la recuperación posterior
// Asignamos un identificador de origen y posición a cada chunk
await addDocuments(
  chunks,
  chunks.map((_, i) => ({
    source: "reglamento_escolar",
    chunk: i,
  }))
);

//! 4) Configura tu modelo: <provider>/<model>
// Ajusta el endpoint, la clave y el modo de compatibilidad
const model = "openai/gpt-4.1-mini";
const llm = createOpenAI({
  baseURL: "https://models.github.ai/inference", //? endpoint de donde consumes tu inferencia
  apiKey: "", //? tu API key de tu provider
  compatibility: "compatible", //? compatibilidad de la api, siempre que sea un custom provider (no-openai) debe establecerse como 'compatible'
});

//! RAG pipeline:
//?   a) RETRIEVE  — buscar los fragmentos más relevantes usando embeddings
//?   b) AUGMENT   — construir el contexto a partir de esos fragmentos
//?   c) GENERATE  — generar la respuesta final con el modelo

// a) RETRIEVE: definir la pregunta y obtener los documentos más similares
const userQuery = "Ayudame a entender lo de la asistencia, y como se sanciona";
const relevantDocs = await searchDocuments(userQuery, 2);

// b) AUGMENT: concatenar el texto relevante para proporcionar contexto al LLM
const relevantContext = relevantDocs.map((doc) => doc.text).join("\n\n");

// c) GENERATE: invocar al modelo con un prompt de sistema + pregunta de usuario
const { text } = await generateText({
  model: llm(model),
  messages: [
    {
      role: "system",
      content: `Eres un asistente escolar. Basándote en este contexto extraído del reglamento: ${relevantContext}`,
    },
    { role: "user", content: userQuery },
  ],
  max_tokens: 4000, //? límite de tokens de salida
  temperature: 0.7, //? controla creatividad de la respuesta
});

console.log("Respuesta generada:", text);
