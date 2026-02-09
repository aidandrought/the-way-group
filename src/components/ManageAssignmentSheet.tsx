import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Check } from '../types';

interface ManageAssignmentSheetProps {
  check: Check;
  onClose: () => void;
}

export function ManageAssignmentSheet({ check, onClose }: ManageAssignmentSheetProps) {
  const { state, clearCheck } = useApp();
  const table = check.tableId ? state.tables.find(t => t.id === check.tableId) : null;

  const handleClear = async () => {
    try {
      await clearCheck(check.id);
    } finally {
      onClose();
    }
  };

  return (
    <View>
      <Text style={styles.title}>Check #{check.checkNumber}</Text>
      {table && (
        <Text style={styles.message}>Currently assigned to Table {table.tableNumber}</Text>
      )}
      <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
        <Text style={styles.clearText}>Clear Assignment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  clearButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#f44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
