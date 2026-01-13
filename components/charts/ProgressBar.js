// components/charts/ProgressBar.js
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

/**
 * Componente de barra de progreso animada con sistema de colores tipo semáforo.
 * La barra se anima suavemente cuando cambia el valor y muestra el porcentaje
 * en texto superpuesto. Cambia de color según el rango del porcentaje:
 * - Azul (<50%): #63B3ED
 * - Amarillo (50-89%): #ECC94B  
 * - Rojo (≥90%): #F56565
 * 
 * @component
 * @example
 * // Barra de progreso básica al 75%
 * return <ProgressBar value={75} />;
 * 
 * @example
 * // Barra personalizada más alta
 * return <ProgressBar value={42} height={20} />;
 * 
 * @param {Object} props - Propiedades del componente
 * @param {number} [props.value=0] - Valor del progreso (0-100)
 * @param {number} [props.height=12] - Altura de la barra en píxeles
 * 
 * @returns {React.ReactElement} Barra de progreso animada con porcentaje
 * 
 * @see Animated Para más información sobre animaciones en React Native
 */
export default function ProgressBar({ value = 0, height = 12 }) {
  // Referencia para la animación del valor
  const anim = useRef(new Animated.Value(0)).current;

  // Efecto para animar el valor cuando cambia
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 700,         // Duración de la animación en milisegundos
      useNativeDriver: false, // No usar driver nativo para animaciones de width
    }).start();
  }, [value]); // Se ejecuta cada vez que cambia el valor

  // Interpolación para convertir el valor numérico a porcentaje de ancho
  const widthInterpolated = anim.interpolate({
    inputRange: [0, 100],      // Rango de entrada: 0% a 100%
    outputRange: ["0%", "100%"], // Rango de salida: 0% a 100% de ancho
  });

  /**
   * Determina el color de la barra según el valor del progreso.
   * 
   * @function
   * @returns {string} Color hexadecimal para la barra de progreso
   * 
   * @private
   */
  const getColor = () => {
    if (value < 50) return "#63B3ED"; // azul suave: progreso bajo
    if (value < 90) return "#ECC94B"; // amarillo: progreso medio
    return "#F56565"; // rojo: progreso alto (alerta)
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Barra de progreso animada */}
      <Animated.View
        style={[
          styles.bar,
          {
            width: widthInterpolated, // Ancho animado
            backgroundColor: getColor(), // Color según el valor
          },
        ]}
      />
      {/* Etiqueta con el porcentaje (posicionada a la derecha) */}
      <Text style={styles.label}>{value.toFixed(1)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%", // Ocupa todo el ancho disponible
    backgroundColor: "rgba(255,255,255,0.15)", // Fondo semi-transparente
    borderRadius: 10,
    overflow: "hidden", // Asegura que la barra interna respete el borde redondeado
    marginVertical: 6,
    position: "relative", // Para posicionar la etiqueta de forma absoluta
  },
  bar: {
    height: "100%", // Ocupa toda la altura del contenedor
    borderRadius: 10,
  },
  label: {
    position: "absolute",
    right: 8, // Separación del borde derecho
    top: -2,  // Ajuste vertical para centrar visualmente
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
});