// components/shared/FABMenu.js
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FABMenu({
  showAdd = false,
  showSearch = false,
  showCompleted = false,
  showHome = false,

  onAdd,
  onSearch,
  onCompleted,
  onHome,

  mainIcon = "plus",
}) {
  const [open, setOpen] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;     // opacidad
  const slideAnim = useRef(new Animated.Value(20)).current;    // desplazamiento Y

  const toggleMenu = () => {
    setOpen((prev) => !prev);
  };

  // Control de animaciones cuando cambia "open"
  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [open]);

  return (
    <View style={styles.wrapper}>

      {/* OPCIONES ANIMADAS */}
      {(
        <Animated.View
          style={[
            styles.optionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {open && (
            <>
              {/* AGREGAR */}
              {showAdd && (
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setOpen(false);
                    onAdd && onAdd();
                  }}
                >
                  <Feather name="plus-circle" size={20} color="#FFF" style={styles.icon} />
                  <Text style={styles.optionText}>Agregar proyecto</Text>
                </TouchableOpacity>
              )}

              {/* BUSCAR */}
              {showSearch && (
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setOpen(false);
                    onSearch && onSearch();
                  }}
                >
                  <Feather name="search" size={20} color="#FFF" style={styles.icon} />
                  <Text style={styles.optionText}>Buscar</Text>
                </TouchableOpacity>
              )}

              {/* ACTIVOS */}
              {showCompleted && (
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setOpen(false);
                    onCompleted && onCompleted();
                  }}
                >
                  <MaterialIcons name="folder-open" size={22} color="#FFF" style={styles.icon} />
                  <Text style={styles.optionText}>Proyectos activos</Text>
                </TouchableOpacity>
              )}

              {/* HOME */}
              {showHome && (
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setOpen(false);
                    onHome && onHome();
                  }}
                >
                  <Feather name="home" size={20} color="#FFF" style={styles.icon} />
                  <Text style={styles.optionText}>Menú principal</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      )}

      {/* FAB PRINCIPAL */}
      <TouchableOpacity
        style={[styles.fab, open && styles.fabOpen]}
        onPress={toggleMenu}
      >
        {open
          ? <Feather name="x" size={32} color="#FFF" />
          : <Feather name={mainIcon} size={32} color="#FFF" />
        }
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },

  optionsContainer: {
    marginBottom: 12,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },

  optionButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.3)',
  },

  icon: {
    marginRight: 10,
  },

  optionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },

  fab: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 50,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },

  fabOpen: {
    backgroundColor: '#1F2937',
  },
});
