// components/inventory/InventoryItem.js

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Componente que representa un ítem individual del inventario.
 * Muestra información clave del material y proporciona acciones interactivas.
 * 
 * Este componente se utiliza en:
 * - GeneralStockScreen: Para mostrar materiales del inventario general
 * - ProjectStockScreen: Para mostrar materiales asignados a un proyecto
 * 
 * Características:
 * - Muestra nombre, código, categoría, unidad y precio
 * - Resalta el stock disponible con color distintivo
 * - Muestra stock mínimo para alertas de inventario
 * - Indica visualmente cuando el stock está bajo el mínimo
 * - Soporta interacciones táctiles (press y long press)
 * - Incluye botón "Mover" para transferir materiales
 * - Diseño responsivo con tema oscuro
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.item - Objeto del material a mostrar
 * @param {string} props.item.nombre - Nombre del material
 * @param {string} [props.item.codigo] - Código único del material
 * @param {string} [props.item.categoria] - Categoría del material
 * @param {string} props.item.tipo_medida - Unidad de medida (Unidad/Metro)
 * @param {number} props.item.precio - Precio unitario
 * @param {number} props.item.cantidad - Stock disponible actual
 * @param {number} [props.item.minimo] - Stock mínimo para alertas (opcional)
 * @param {Function} [props.onEdit] - Callback al hacer long press (editar)
 * @param {Function} [props.onMove] - Callback al presionar botón "Mover"
 * @param {Function} [props.onDelete] - Callback para eliminar (no visible en UI actual)
 * 
 * @example
 * <InventoryItem
 *   item={material}
 *   onEdit={() => handleEdit(material)}
 *   onMove={() => handleMove(material)}
 * />
 * 
 * @returns {JSX.Element} Componente de ítem de inventario
 */
export default function InventoryItem({ item, onEdit, onMove }) {
  // Calcula si el stock actual está por debajo del mínimo establecido
  const isLowStock = item.minimo && Number(item.cantidad) < Number(item.minimo);
  
  /**
   * Maneja la interacción de presión larga (long press)
   * Se activa después de 220ms para evitar activaciones accidentales
   */
  const handleLongPress = () => {
    if (onEdit) {
      onEdit(item);
    }
  };

  /**
   * Maneja el clic en el botón "Mover"
   */
  const handleMovePress = () => {
    if (onMove) {
      onMove(item);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isLowStock && styles.lowStockContainer]}
      onLongPress={handleLongPress}
      delayLongPress={220} // Retardo para evitar activaciones accidentales
      activeOpacity={0.7} // Efecto visual al tocar
    >
      {/* Columna izquierda: Información detallada del material */}
      <View style={{ flex: 1 }}>
        {/* Nombre del material - Información principal */}
        <Text style={styles.name}>{item.nombre}</Text>

        {/* Código único del material (si existe) */}
        <Text style={styles.code}>
          Código: {item.codigo || "—"} {/* Guión si no hay código */}
        </Text>

        {/* Categoría y unidad de medida */}
        <Text style={styles.meta}>
          {item.categoria || "Sin categoría"} · {item.tipo_medida}
        </Text>

        {/* Precio unitario formateado en pesos colombianos */}
        <Text style={styles.price}>
          $ {Number(item.precio || 0).toLocaleString("es-CO")}
        </Text>

        {/* Información de stock mínimo (si está configurado) */}
        {item.minimo !== undefined && item.minimo !== null && (
          <View style={styles.minimoContainer}>
            <Text style={[
              styles.minimoText,
              isLowStock && styles.minimoAlert
            ]}>
              Mín: {item.minimo}
            </Text>
            {isLowStock && (
              <Text style={styles.lowStockAlert}>⚠️ Stock bajo</Text>
            )}
          </View>
        )}
      </View>

      {/* Columna derecha: Stock y acciones */}
      <View style={styles.qtyBox}>
        {/* Cantidad disponible - Resaltada visualmente */}
        <Text style={[
          styles.qty,
          isLowStock && styles.qtyLowStock
        ]}>
          {item.cantidad ?? 0}
        </Text>
        
        {/* Etiqueta "Stock" o indicador de stock bajo */}
        <View style={styles.stockInfo}>
          <Text style={[
            styles.qtyLabel,
            isLowStock && styles.qtyLabelLowStock
          ]}>
            {isLowStock ? "¡Stock bajo!" : "Stock"}
          </Text>
          
          {/* Indicador visual de relación stock/mínimo */}
          {item.minimo !== undefined && item.minimo !== null && (
            <Text style={styles.stockRatio}>
              {Math.round((Number(item.cantidad) / Number(item.minimo)) * 100)}%
            </Text>
          )}
        </View>

        {/* Botón "Mover" (solo visible si se proporciona onMove) */}
        {onMove && (
          <TouchableOpacity
            style={styles.moveBtn}
            onPress={handleMovePress}
            activeOpacity={0.8}
          >
            <Text style={styles.moveText}>Mover</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Estilos del componente InventoryItem
 * Utiliza un esquema de colores oscuro con acentos azules, amarillos y rojos para alertas
 */
const styles = StyleSheet.create({
  /**
   * Contenedor principal del ítem
   * Diseño tipo tarjeta con bordes redondeados y sombras sutiles
   */
  container: {
    backgroundColor: "#1E293B", // Azul oscuro - fondo de tarjeta
    borderRadius: 10, // Bordes redondeados
    padding: 12, // Espaciado interno
    marginBottom: 10, // Separación entre tarjetas
    flexDirection: "row", // Diseño horizontal
    borderWidth: 1, // Borde sutil
    borderColor: "#334155", // Color del borde (azul grisáceo)
  },

  /**
   * Estilo adicional para contenedor cuando el stock está bajo el mínimo
   * Borde rojo para alerta visual inmediata
   */
  lowStockContainer: {
    borderColor: "#F87171", // Rojo anaranjado para alertas
    borderWidth: 1.5, // Borde más grueso para destacar
    backgroundColor: "rgba(248, 113, 113, 0.05)", // Fondo rojo muy suave
  },

  /**
   * Estilo para el nombre del material
   * Texto principal, más grande y con mayor contraste
   */
  name: {
    color: "#F8FAFC", // Blanco azulado - alto contraste
    fontSize: 15,
    fontWeight: "600", // Semi-negrita
  },

  /**
   * Estilo para el código del material
   * Texto secundario, menos prominente
   */
  code: {
    color: "#94A3B8", // Gris azulado - contraste medio
    fontSize: 12,
    marginTop: 2, // Separación del elemento anterior
  },

  /**
   * Estilo para información meta (categoría y unidad)
   * Texto informativo con contraste medio-bajo
   */
  meta: {
    color: "#CBD5E1", // Gris claro - buena legibilidad
    fontSize: 12,
    marginTop: 2,
  },

  /**
   * Estilo para el precio unitario
   * Destacado en azul brillante para llamar la atención
   */
  price: {
    color: "#38BDF8", // Azul cielo - color de acento
    fontWeight: "700", // Negrita
    marginTop: 4, // Separación del elemento anterior
  },

  /**
   * Contenedor para la información de stock mínimo
   */
  minimoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8, // Espacio entre elementos
  },

  /**
   * Texto del stock mínimo (normal)
   */
  minimoText: {
    color: "#94A3B8", // Gris azulado
    fontSize: 11,
    fontWeight: "500",
  },

  /**
   * Texto del stock mínimo cuando hay alerta
   */
  minimoAlert: {
    color: "#F87171", // Rojo anaranjado
    fontWeight: "600",
  },

  /**
   * Alerta visual de stock bajo
   */
  lowStockAlert: {
    color: "#FCA5A5", // Rojo claro
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  /**
   * Contenedor para la cantidad y acciones
   * Alineado a la derecha con ancho mínimo
   */
  qtyBox: {
    alignItems: "center", // Centrado horizontal
    justifyContent: "center", // Centrado vertical
    minWidth: 80, // Ancho mínimo ligeramente mayor para nueva información
  },

  /**
   * Contenedor para información de stock (etiqueta + porcentaje)
   */
  stockInfo: {
    alignItems: "center",
    marginBottom: 6,
  },

  /**
   * Estilo para la cantidad de stock (normal)
   * Número grande y llamativo en amarillo
   */
  qty: {
    color: "#FBBF24", // Amarillo mostaza - destacado para números
    fontSize: 22, // Tamaño grande para fácil lectura
    fontWeight: "700", // Negrita
  },

  /**
   * Estilo para la cantidad de stock cuando está bajo el mínimo
   */
  qtyLowStock: {
    color: "#F87171", // Rojo anaranjado para alerta
    fontSize: 24, // Un poco más grande para destacar
  },

  /**
   * Etiqueta "Stock" debajo de la cantidad (normal)
   * Texto pequeño y discreto
   */
  qtyLabel: {
    color: "#94A3B8", // Gris azulado - contraste bajo
    fontSize: 11,
  },

  /**
   * Etiqueta "Stock" cuando hay stock bajo
   */
  qtyLabelLowStock: {
    color: "#FCA5A5", // Rojo claro
    fontWeight: "600",
  },

  /**
   * Porcentaje de stock respecto al mínimo
   * Muestra relación visual rápida
   */
  stockRatio: {
    color: "#A5B4FC", // Azul lavanda
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },

  /**
   * Botón "Mover" para transferir material
   * Diseño compacto con color de acción
   */
  moveBtn: {
    backgroundColor: "#0EA5E9", // Azul brillante - color de acción
    borderRadius: 6, // Bordes ligeramente redondeados
    paddingVertical: 4, // Espaciado vertical mínimo
    paddingHorizontal: 10, // Espaciado horizontal
    marginTop: 4, // Separación del elemento anterior
  },

  /**
   * Texto del botón "Mover"
   * Blanco con buen contraste sobre fondo azul
   */
  moveText: {
    color: "#FFF", // Blanco puro
    fontSize: 11, // Tamaño pequeño para botón compacto
    fontWeight: "600", // Semi-negrita
  },
});
