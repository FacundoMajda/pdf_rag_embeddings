// sanitize: quita ruidos del texto (saltos, símbolos extraños) y homogeneiza espacios
export function sanitize(text) {
  return text
    .replace(/[\r\n]+/g, " ") // reemplaza saltos de línea
    .replace(/[^\w\s.,¿?¡!]/g, "") // elimina símbolos raros
    .replace(/\s+/g, " ") // normaliza espacios
    .trim();
}

// countTokens: regla básica dividiendo longitud entre 4 para tener una idea del número de tokens
export function countTokens(text) {
  return `Estima: ${Math.ceil(text.length / 4)} tokens`;
}
