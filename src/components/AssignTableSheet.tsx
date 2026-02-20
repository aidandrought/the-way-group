import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Check, Table } from '../types';
import { TableCircle } from './TableCircle';

interface AssignTableSheetProps {
  check: Check;
  onClose: () => void;
}

const tableColumns: { key: string; rows: number[][] }[] = [
  { key: 'A', rows: [[1, 2, 3], [4, 5, 6]] },
  { key: 'B', rows: [[10], [11]] },
  { key: 'C', rows: [[20], [21], [22], [23]] },
  { key: 'D', rows: [[24], [25], [26], [27], [28]] },
  { key: 'E', rows: [[30], [31], [32], [33], [34]] },
  { key: 'F', rows: [[40, 41, 43, 44], [50, 51, 53, 54]] },
  { key: 'G', rows: [[60], [61], [62], [63], [64]] },
  { key: 'H', rows: [[70, 71], [72, 73], [74, 75], [76, 77], [78]] },
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.layoutBox}>
          {tableColumns.map((column, columnIndex) => (
            <View
              key={column.key}
              style={[
                styles.column,
                columnIndex < tableColumns.length - 1 && styles.columnGap,
              ]}
            >
              {column.rows.map((row, rowIndex) => (
                <View
                  key={`${column.key}-row-${rowIndex}`}
                  style={[styles.row, rowIndex === column.rows.length - 1 && styles.rowLast]}
                >
                  {row.map((tableNum) => {
                    const table = tableByNumber.get(tableNum);
                    if (!table) return <View key={`missing-${tableNum}`} style={styles.placeholder} />;
                    const isLastInRow = row[row.length - 1] === tableNum;
                    return (
                      <View key={`table-${tableNum}`} style={[styles.cell, isLastInRow && styles.cellLast]}>
                        <TableCircle
                          table={table}
                          checks={state.checks}
                          onPress={() => handleAssign(table.id)}
                          compact
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </View>
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
  layoutBox: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#d2d2d2',
    borderRadius: 12,
    backgroundColor: '#fff',
    minWidth: 86,
    justifyContent: 'flex-start',
  },
  columnGap: {
    marginRight: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLast: {
    marginBottom: 0,
  },
  cell: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  cellLast: {
    marginRight: 0,
  },
  placeholder: {
    width: 64,
    height: 60,
    marginRight: 6,
  },
});
