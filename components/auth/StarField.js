/**
 * COMPONENTE DE CAMPO DE ESTRELLAS ANIMADO
 * 
 * Descripción:
 * Componente que crea un fondo animado de estrellas parpadeantes con posiciones fijas.
 * Las estrellas tienen animaciones de opacidad individuales que se ejecutan en loop.
 * 
 * Características:
 * 1. Genera un número fijo de estrellas con posiciones aleatorias pero estables
 * 2. Cada estrella tiene tamaño y opacidad inicial aleatorios
 * 3. Animaciones individuales de parpadeo (fade in/out)
 * 4. Optimizado para no recrearse en cada render
 * 
 * Nota importante:
 * Las posiciones y tamaños de las estrellas se generan solo una vez al montar
 * el componente para evitar que se muevan durante la interacción del usuario.
 * 
 * @component
 * @returns {JSX.Element} Campo de estrellas animado
 * 
 * @example
 * <StarField />
 */

// Importaciones de React y React Native
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

// Obtener dimensiones de la pantalla una sola vez
const { width, height } = Dimensions.get('window');

export default function StarField() {
  // ==================== GENERACIÓN DE ESTRELLAS (UNA SOLA VEZ) ====================
  
  /**
   * Genera las estrellas solo una vez usando useMemo
   * Esto evita que se regeneren en cada render
   * 
   * @type {Array}
   */
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * width,                    // Posición horizontal aleatoria
      top: Math.random() * height * 0.6,              // Posición vertical (solo 60% superior)
      size: Math.random() * 2 + 1,                    // Tamaño entre 1 y 3
      opacity: new Animated.Value(0.3 + Math.random() * 0.7), // Opacidad inicial aleatoria
    }));
  }, []); // Array de dependencias vacío = solo se ejecuta una vez

  // ==================== ANIMACIONES ====================
  
  /**
   * Referencia para almacenar los loops de animación
   * Permite limpiar las animaciones al desmontar
   */
  const animationRefs = useRef([]);

  useEffect(() => {
    // Limpiar animaciones anteriores si existen
    animationRefs.current.forEach(animation => {
      if (animation) animation.stop();
    });
    
    // Reiniciar el array de referencias
    animationRefs.current = [];

    // Crear animación para cada estrella
    stars.forEach((star) => {
      // Crear secuencia de animación: fade in → fade out
      const animation = Animated.loop(
        Animated.sequence([
          // Fase 1: Aumentar opacidad
          Animated.timing(star.opacity, {
            toValue: 1,                            // Opacidad máxima
            duration: 1000 + Math.random() * 1000, // Duración aleatoria entre 1-2 segundos
            useNativeDriver: true,                 // Aceleración por hardware
          }),
          // Fase 2: Disminuir opacidad
          Animated.timing(star.opacity, {
            toValue: 0.3,                          // Opacidad mínima
            duration: 1000 + Math.random() * 1000, // Duración aleatoria entre 1-2 segundos
            useNativeDriver: true,
          }),
        ])
      );

      // Almacenar referencia y comenzar animación
      animationRefs.current.push(animation);
      animation.start();
    });

    // ==================== CLEANUP ====================
    /**
     * Función de limpieza: detiene todas las animaciones al desmontar
     */
    return () => {
      animationRefs.current.forEach(animation => {
        if (animation) animation.stop();
      });
      animationRefs.current = [];
    };
  }, [stars]); // Solo se ejecuta cuando cambia el array de estrellas (una vez)

  // ==================== RENDER ====================
  
  /**
   * Renderiza cada estrella como una vista animada absolutamente posicionada
   */
  return stars.map((star) => (
    <Animated.View
      key={star.id}
      style={{
        position: 'absolute',
        left: star.left,
        top: star.top,
        width: star.size,
        height: star.size,
        borderRadius: star.size / 2,  // Círculo perfecto
        backgroundColor: 'white',
        opacity: star.opacity,
      }}
    />
  ));
}