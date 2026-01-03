// utils/findDuplicates.js

// Normaliza nombre para comparar (NO se usa para mostrar, solo para análisis)
export function normalizeNameForDuplicates(name = "") {
  return name
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-zA-Z0-9]/g, "")    // quitar espacios y símbolos
    .toUpperCase();
}

/**
 * Analiza el inventario general y devuelve:
 * - grupos de posibles duplicados por nombre+categoría
 * - conflictos de código (mismo código en varios ítems)
 * - ítems sin código
 * - ítems sin categoría
 */
export function findDuplicateGroups(items = []) {
  // === 1) Grupos por nombre normalizado + categoría ===
  const nameMap = new Map();

  items.forEach((item) => {
    const nombre = item.nombre || "";
    const categoria = item.categoria || "SIN_CATEGORIA";
    const normalized = normalizeNameForDuplicates(nombre);

    if (!normalized) return;

    const key = `${categoria}::${normalized}`;

    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key).push(item);
  });

  const nameGroups = [];
  nameMap.forEach((groupItems, key) => {
    if (groupItems.length > 1) {
      const [categoria, normalizedName] = key.split("::");
      nameGroups.push({
        key,
        categoria,
        normalizedName,
        items: groupItems,
      });
    }
  });

  // === 2) Conflictos de código (mismo código en varios ítems) ===
  const codeMap = new Map();
  items.forEach((item) => {
    if (!item.codigo) return;
    const list = codeMap.get(item.codigo) || [];
    list.push(item);
    codeMap.set(item.codigo, list);
  });

  const codeConflicts = [];
  codeMap.forEach((groupItems, codigo) => {
    if (groupItems.length > 1) {
      codeConflicts.push({ codigo, items: groupItems });
    }
  });

  // === 3) Ítems sin código ===
  const withoutCode = items.filter((i) => !i.codigo);

  // === 4) Ítems sin categoría ===
  const withoutCategory = items.filter((i) => !i.categoria);

  return {
    nameGroups,
    codeConflicts,
    withoutCode,
    withoutCategory,
  };
}
