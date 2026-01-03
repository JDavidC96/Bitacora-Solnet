// utils/formatPower.js

/**
 * Formatea una potencia dada en kW y la escala automáticamente a MW/GW/TW...
 *
 * @param {number} valueKw Potencia en kW.
 * @param {{suffix?: string}} opts
 * @returns {string} Ej: "850 kW AC", "2.4 MW AC", "1.25 GW AC"
 */
export default function formatPowerKw(valueKw, { suffix = "AC" } = {}) {
  const n = Number(valueKw ?? 0);

  if (!Number.isFinite(n) || n <= 0) {
    return suffix ? `0 kW ${suffix}` : "0 kW";
  }

  const units = ["kW", "MW", "GW", "TW", "PW", "EW"];
  let value = n;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value = value / 1000;
    unitIndex += 1;
  }

  const formatted = value.toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });

  const suffixPart = suffix ? ` ${suffix}` : "";
  return `${formatted} ${units[unitIndex]}${suffixPart}`;
}

export const formatPower = formatPowerKw;
