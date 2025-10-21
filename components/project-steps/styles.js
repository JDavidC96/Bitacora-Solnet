import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1E1E2F', 
    padding: 20 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1E1E2F' 
  },
  loadingText: { 
    color: '#FFF' 
  },
  title: { 
    color: '#FFF', 
    fontSize: 22, 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 10, 
    justifyContent: 'center' 
  },
  label: { 
    color: '#CCC' 
  },
  value: { 
    color: '#FFF' 
  },
  link: { 
    color: '#90CDF4', 
    textDecorationLine: 'underline' 
  },
  scrollContent: { 
    paddingBottom: 40 
  },

  // Task Group
  groupTitle: { 
    color: '#90CDF4', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  summaryText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginTop: 10 
  },
  summaryWarning: { 
    color: '#F56565', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginTop: 6 
  },

  // Task Card
  taskCard: { 
    backgroundColor: '#2C2C3A', 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 10 
  },
  taskHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  taskTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  taskDate: { 
    color: '#DDD', 
    marginTop: 6 
  },
  taskDuration: { 
    color: '#ECC94B' 
  },
  taskNote: { 
    color: '#ECC94B', 
    marginTop: 6 
  },
  daysRemaining: { 
    color: '#63B3ED' 
  },
  delayText: { 
    color: '#F56565', 
    fontWeight: 'bold' 
  },
  notesContainer: { 
    marginTop: 6 
  },
  noteItem: { 
    color: '#BEE3F8', 
    fontSize: 13 
  },
  actionsContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 10 
  },

  // Badges
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    overflow: 'hidden', 
    fontWeight: '700' 
  },
  badgeOk: { 
    backgroundColor: '#48BB78', 
    color: '#1A202C' 
  },
  badgePending: { 
    backgroundColor: '#CBD5E0', 
    color: '#1A202C' 
  },
  badgeDelay: { 
    backgroundColor: '#F56565', 
    color: '#FFF' 
  },

  // Buttons
  smallBtn: { 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    borderRadius: 8, 
    marginTop: 6 
  },
  smallBtnText: { 
    color: '#1A202C', 
    fontWeight: '700' 
  },
  button: { 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  buttonText: { 
    color: '#1A202C', 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },

  // Inputs
  input: { 
    backgroundColor: '#1E1E2F', 
    color: '#FFF', 
    padding: 12, 
    borderRadius: 8, 
    width: '100%', 
    marginBottom: 16 
  },
  modalText: { 
    color: "#CCC", 
    marginBottom: 8 
  },
});