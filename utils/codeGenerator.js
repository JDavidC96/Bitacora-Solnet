// utils/codeGenerator.js

// Normaliza el nombre SOLO para el código (no afecta nombre del item)
export function normalizeNameForCode(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-zA-Z0-9]/g, "")    // quitar espacios y símbolos
    .toUpperCase()
    .substring(0, 12);               // máximo 12 caracteres
}

// Prefijos oficiales por categoría
const CATEGORY_PREFIXES = {
  Accesorios: "ACS",
  Paneles: "PAN",
  Inversores: "INV",
  Modulos: "MOD",
  Estructura: "EST",
  Tuberia: "TUB",
  Cableado: "CBL",
  Electrico: "ELE",
  Comunicaciones: "COM",
};

// Genera el código final
export function generateMaterialCode(nombre, categoria, existingItems = []) {
  const prefijo = CATEGORY_PREFIXES[categoria] || "GEN";

  const short = normalizeNameForCode(nombre); // ejemplo: PVC1, THHN12, MC4MACHO

  // Buscar consecutivo según categoría
  const sameCategory = existingItems.filter(
    (i) => i.codigo?.startsWith(prefijo + "-")
  );

  let maxConsec = 0;
  sameCategory.forEach((item) => {
    const parts = item.codigo.split("-");
    const consec = parseInt(parts[2]);
    if (!isNaN(consec) && consec > maxConsec) {
      maxConsec = consec;
    }
  });

  const next = (maxConsec + 1).toString().padStart(4, "0");

  return `${prefijo}-${short}-${next}`;
}
