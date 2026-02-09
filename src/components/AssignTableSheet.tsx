import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Check, Table } from '../types';
import { TableCircle } from './TableCircle';

interface AssignTableSheetProps {
  check: Check;
  onClose: () => void;
}

const sections = [
  { name: 'A', tables: [1, 2, 3, 4, 5, 6], cols: 2 },
  { name: 'B', tables: [10, 11], cols: 2 },
  { name: 'C', tables: [20, 21, 22, 23], cols: 4 },
  { name: 'D', tables: [24, 25, 26, 27, 28], cols: 5 },
  { name: 'E', tables: [30, 31, 32, 33, 34], cols: 5 },
  { name: 'F', tables: [40, 41, 43, 44, 50, 51, 53, 54], cols: 4 },
  { name: 'G', tables: [60, 61, 62, 63, 64], cols: 5 },
  { name: 'H', tables: [70, 71, 72, 73, 74, 75, 76, 77, 78], cols: 5 },
];

export function AssignTableSheet({ check, onClose }: AssignTableSheetProps) {
  const { state, assignCheckToTable, clearCheck } = useApp();
  const [showConflict, setShowConflict] = useState(false);
  const [conflictTable, setConflictTable] = useState<Table | null>(null);
  const [targetTableId, setTargetTableId] = useState<string | null>(null);

  const tableByNumber = useMemo(() => {
    const map = new Map<number, Table>();
    state.tables.forEach(table => map.set(table.tableNumber, table));
    return map;
  }, [state.tables]);

  const handleAssign = async (tableId: string) => {
    if (check.tableId === tableId) {
      await clearCheck(check.id);
      onClose();
      return;
    }

    if (check.tableId && check.tableId !== tableId) {
      const currentTable = state.tables.find(t => t.id === check.tableId);
      setConflictTable(currentTable || null);
      setTargetTableId(tableId);
      setShowConflict(true);
    } else {
      await assignCheckToTable(check.id, tableId);
      onClose();
    }
  };

  const handleConfirmMove = async () => {
    if (targetTableId) {
      await assignCheckToTable(check.id, targetTableId);
      setShowConflict(false);
      onClose();
    }
  };

  if (showConflict && conflictTable) {
    const targetTable = state.tables.find(t => t.id === targetTableId);
    return (
      <View style={styles.conflictContainer}>
        <Text style={styles.title}>Move Check?</Text>
        <Text style={styles.message}>
          Check #{check.checkNumber} is already assigned to Table {conflictTable.tableNumber}.
          Move it to Table {targetTable?.tableNumber}?
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => setShowConflict(false)}
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirmMove}
            style={[styles.button, styles.confirmButton]}
          >
            <Text style={styles.confirmText}>Move</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Assign Check #{check.checkNumber}</Text>
      <ScrollView style={styles.scrollView}>
        {sections.map(section => (
          <View key={section.name} style={styles.section}>
            <FlatList
              data={section.tables}
              keyExtractor={(tableNum) => `${section.name}-${tableNum}`}
              numColumns={section.cols}
              columnWrapperStyle={styles.sectionRow}
              renderItem={({ item: tableNum }) => {
                const table = tableByNumber.get(tableNum);
                if (!table) return null;
                return (
                  <TableCircle
                    table={table}
                    checks={state.checks}
                    onPress={() => handleAssign(table.id)}
                    compact
                  />
                );
              }}
              scrollEnabled={false}
              initialNumToRender={section.tables.length}
              removeClippedSubviews
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  conflictContainer: {
    alignItems: 'center',
  },
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
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#B48A3A',
  },
  cancelText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  sectionRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
