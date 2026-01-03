const logInventario = async ({
  tipo,
  material,
  cantidad,
  origen = null,
  destino = null,
  usuario = "Sistema",
  unidad = "Unidad",
  notas = ""
}) => {
  await addDoc(collection(db, "inventario_movimientos"), {
    tipo,
    material,
    cantidad,
    origen,
    destino,
    usuario,
    unidad,
    notas,
    timestamp: new Date(),
    fecha: new Date().toISOString(),
  });
};
