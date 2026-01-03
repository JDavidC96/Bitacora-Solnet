// components/personal/PersonalHeader.js
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PersonalHeader({
  role,
  showForm,
  onToggleForm,
  onOpenRegistroLaboral,
  onOpenReporteGeneral,
}) {
  const isAdmin = role === "Administrador";
  const isAdministrativo = role === "Administrativo";
  const canSeeRegistro = isAdmin || isAdministrativo;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Personal</Text>

      <View style={styles.buttonsRow}>
        {isAdmin && (
          <TouchableOpacity style={styles.buttonPrimary} onPress={onToggleForm}>
            <Text style={styles.buttonText}>
              {showForm ? "Cerrar formulario" : "Agregar personal"}
            </Text>
          </TouchableOpacity>
        )}

        {canSeeRegistro && (
          <>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={onOpenRegistroLaboral}
            >
              <Text style={styles.buttonTextSecondary}>Registro laboral</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={onOpenReporteGeneral}
            >
              <Text style={styles.buttonTextSecondary}>Reporte general</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  buttonPrimary: {
    backgroundColor: "#38B2AC",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  buttonSecondary: {
    backgroundColor: "#1F2933",
    borderWidth: 1,
    borderColor: "#38B2AC",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#E6FFFA",
    fontSize: 14,
    fontWeight: "600",
  },
});
