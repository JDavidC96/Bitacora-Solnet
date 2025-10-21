// hooks/useBackHandler.js
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import MinimizeApp from 'react-native-minimize';

export const useBackHandler = () => {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      let lastPress = 0;
      
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastPress < 2000) {
          try {
            MinimizeApp.minimizeApp();
          } catch (e) {
            BackHandler.exitApp();
          }
        } else {
          ToastAndroid.show('Presiona atrás otra vez para salir', ToastAndroid.SHORT);
          lastPress = now;
        }
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => sub.remove();
    }, [])
  );
};