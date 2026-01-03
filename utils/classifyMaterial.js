// utils/classifyMaterial.js

/**
 * Normaliza strings (quita espacios, mayúsculas, guiones)
 */
export function normalizeCode(code) {
  if (!code) return "";
  return code.toString().trim().toUpperCase().replace(/[\s_-]/g, "");
}

/**
 * Clasificación por prefijo → fase
 */
export function getFaseByCodigo(codigo) {
  const c = normalizeCode(codigo);

  if (c.startsWith("PAN") || c.startsWith("MOD") || c.startsWith("INV") || c.startsWith("EST") || c.startsWith("COM"))
    return "fase1";

  if (c.startsWith("CBL") || c.startsWith("ELE") || c.startsWith("TUB") || c.startsWith("ACS"))
    return "fase2";

  // accesorios y consumibles varios → fase 3
  return "fase3";
}

/**
 * Deducir categoría por código
 */
export function getCategoriaByCodigo(codigo) {
  const c = normalizeCode(codigo);

  if (c.startsWith("PAN")) return "Panel";
  if (c.startsWith("INV")) return "Inversor";
  if (c.startsWith("MOD")) return "Panel / Módulo";
  if (c.startsWith("EST")) return "Estructura";
  if (c.startsWith("CBL")) return "Cableado";
  if (c.startsWith("ELE")) return "Eléctrico";
  if (c.startsWith("TUB")) return "Tubería";
  if (c.startsWith("ACS")) return "Accesorio";
  if (c.startsWith("COM")) return "Comunicaciones";

  return "General";
}

/**
 * Genera un item predicho si no existe en inventario general
 */
export function generatePredictedItem({ codigo, nombre }) {
  return {
    predicted: true,
    codigo: codigo.toUpperCase(),
    nombre: nombre || "Ítem sin nombre",
    categoria: getCategoriaByCodigo(codigo),
    fase: getFaseByCodigo(codigo),
    tipo_medida: "Unidad",
    precio: 0,
  };
}

/**
 * MATCH INVENTARIO GENERAL contra el presupuesto o item del proyecto
 */
export function matchInventoryItem(codigo, inventarioGeneral) {
  const target = normalizeCode(codigo);

  // 1. coincidencia exacta
  const exact = inventarioGeneral.find(
    (i) => normalizeCode(i.codigo) === target
  );
  if (exact) return { exists: true, item: exact };

  // 2. NO existe → generar predicción
  return { exists: false, item: generatePredictedItem({ codigo }) };
}
