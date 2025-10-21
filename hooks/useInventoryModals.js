import { useState } from "react";
import { useMultiModal } from "./useModal";

export const useInventoryModals = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const { 
    modals, 
    openModal, 
    closeModal, 
    closeAllModals 
  } = useMultiModal({
    update: false,
    add: false,
    move: false
  });

  const openUpdateModal = (item) => {
    setSelectedItem(item);
    openModal('update');
  };

  const openMoveModal = (item) => {
    setSelectedItem(item);
    openModal('move');
  };

  const openAddModal = () => {
    openModal('add');
  };

  const closeAll = () => {
    closeAllModals();
    setSelectedItem(null);
  };

  return {
    // Estados
    selectedItem,
    loading,
    modals,
    
    // Setters
    setSelectedItem,
    setLoading,
    
    // Acciones
    openUpdateModal,
    openMoveModal,
    openAddModal,
    closeAll,
    closeModal
  };
};