// utils/normalize.js

export default function normalize(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .toLowerCase()                     // minúsculas
    .normalize("NFD")                  // separar caracteres con acentos
    .replace(/[\u0300-\u036f]/g, "")   // quitar acentos
    .replace(/[^a-z0-9\s]/g, "")       // quitar caracteres especiales (excepto espacios)
    .replace(/\s+/g, " ")              // reemplazar espacios múltiples
    .trim();                           // quitar espacios al inicio/fin
}
