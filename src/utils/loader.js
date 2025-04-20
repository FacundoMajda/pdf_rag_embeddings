import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { countTokens, sanitize } from "./text.js";

const url = "./src/docs/REGLAMENTO_ESCOLAR.pdf";

// Carga todas las páginas del PDF como objetos con metadata y contenido
const loader = new PDFLoader(url);
const docs = await loader.load();
console.log("PDF subido:", docs[0].metadata);

// Combina el texto de todas las páginas en un único string
const combinedContent = docs.map((doc) => doc.pageContent).join(" ");

// Calcula el número de tokens del texto
countTokens(combinedContent);

// Sanitiza el contenido para eliminar caracteres no deseados
export const content = sanitize(combinedContent);
