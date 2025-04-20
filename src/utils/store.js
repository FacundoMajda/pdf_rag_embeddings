import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { LocalIndex } from "vectra";
import { sanitize } from "./text.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const indexPath = path.join(__dirname, "..", "..", "vectordb");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let index = new LocalIndex(indexPath);

// Preparación inicial de nuestra base de datos vectorial local
// initializeStore: crea o carga el índice sin complicaciones
export const initializeStore = async () => {
  try {
    index = new LocalIndex(indexPath);

    if (!(await index.isIndexCreated())) {
      await index.createIndex();
      console.log("Base de datos vectorial creada");
      return false; // La base de datos no existía previamente
    }
    console.log("Base de datos vectorial cargada");
    return true; // La base de datos ya existía
  } catch (error) {
    console.error("Error al inicializar la base de datos vectorial:", error);
    throw new Error("No se pudo inicializar la base de datos vectorial");
  }
};

// getEmbedding: convierte texto a embedding via OpenAI para búsquedas semánticas
export const getEmbedding = async (text) => {
  try {
    const openai = createOpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: "", //? tu API key de tu provider
      compatibility: "compatible",
    });

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-large"),
      value: text,
    });

    return embedding;
  } catch (error) {
    console.error("Error al obtener embedding:", error);
    throw new Error("No se pudo obtener el embedding del texto");
  }
};

// addDocument: limpia, embebe y guarda el texto con su metadata para recuperar contexto
export const addDocument = async (text, metadata = {}) => {
  try {
    await index.insertItem({
      vector: await getEmbedding(sanitize(text)),
      metadata: {
        text,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("Error al agregar documento:", error);
    throw new Error(`No se pudo agregar el documento: ${error.message}`);
  }
};

// searchDocuments: encuentra los documentos más parecidos a la consulta
export const searchDocuments = async (query, limit = 2) => {
  try {
    const vector = await getEmbedding(query);

    const results = await index.queryItems(vector, limit);
    return results.map((result) => ({
      text: result.item.metadata.text,
      score: result.score,
      metadata: result.item.metadata,
    }));
  } catch (error) {
    console.error("Error al buscar documentos:", error);
    return [];
  }
};

// addDocuments: inserta documentos en lotes con pausas para no abusar del API
export const addDocuments = async (textChunks, metadataList) => {
  const batchSize = 10;

  for (let i = 0; i < textChunks.length; i += batchSize) {
    const batch = textChunks.slice(i, i + batchSize);
    const batchMetadata = metadataList.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(textChunks.length / batchSize);

    try {
      console.log(`Procesando lote ${currentBatch}/${totalBatches}...`);

      for (let j = 0; j < batch.length; j++) {
        try {
          await addDocument(batch[j], batchMetadata[j]);
          console.log(
            `   - Documento ${i + j + 1}/${textChunks.length} añadido`
          );
        } catch (docError) {
          console.error(
            `   - Error con documento ${i + j + 1}: ${docError.message}`
          );
        }

        await sleep(300);
      }
    } catch (error) {
      console.error(`Error procesando lote ${currentBatch}:`, error);
    }

    if (i + batchSize < textChunks.length) {
      await sleep(700);
    }
  }
};
