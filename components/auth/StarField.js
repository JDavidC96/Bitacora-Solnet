// components/auth/StarField.js
import { useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function StarField() {
  const stars = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * width,
    top: Math.random() * height * 0.6,
    size: Math.random() * 2 + 1,
    opacity: new Animated.Value(0.3 + Math.random() * 0.7),
  }));

  useEffect(() => {
    stars.forEach((star) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 1,
            duration: 1000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.3,
            duration: 1000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return stars.map((star) => (
    <Animated.View
      key={star.id}
      style={{
        position: 'absolute',
        left: star.left,
        top: star.top,
        width: star.size,
        height: star.size,
        borderRadius: star.size / 2,
        backgroundColor: 'white',
        opacity: star.opacity,
      }}
    />
  ));
}