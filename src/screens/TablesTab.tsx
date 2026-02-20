import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { ColorPickerSheet } from '../components/ColorPickerSheet';
import { TableCircle } from '../components/TableCircle';
import { TableDetailsSheet } from '../components/TableDetailsSheet';
import { useApp } from '../contexts/AppContext';
import { Table } from '../types';

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

export function TablesTab() {
  const {
    state,
    setSelectedTable,
    error,
    seedFirestore,
    seeding,
    checksLoaded,
    tablesLoaded,
    clearAllAssignments,
    setTableColor,
  } = useApp();
  const [colorTable, setColorTable] = useState<Table | null>(null);
  const tableByNumber = useMemo(() => {
    const map = new Map<number, Table>();
    state.tables.forEach(table => map.set(table.tableNumber, table));
    return map;
  }, [state.tables]);

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text>
      </View>
    );
  }

  if (checksLoaded && tablesLoaded && (state.checks.length === 0 || state.tables.length === 0)) {
    return (
      <View style={{ padding: 16, flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Tables</Text>
          <TouchableOpacity onPress={clearAllAssignments} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear all Checks</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ marginBottom: 8 }}>No data found in Firestore.</Text>
        {__DEV__ && !seeding && (
          <TouchableOpacity
            onPress={seedFirestore}
            style={{ padding: 12, backgroundColor: '#B48A3A', borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Seed Database</Text>
          </TouchableOpacity>
        )}
        {seeding && <Text style={{ color: '#666' }}>Setting up...</Text>}
        <Text style={{ color: '#666', marginTop: 8 }}>
          Tables: {state.tables.length} - Checks: {state.checks.length}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tables</Text>
        <TouchableOpacity onPress={clearAllAssignments} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear all Checks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                          onPress={() => setSelectedTable(table)}
                          onLongPress={() => setColorTable(table)}
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

      <BottomSheet
        isOpen={!!state.selectedTable}
        onClose={() => setSelectedTable(null)}
      >
        {state.selectedTable && (
          <TableDetailsSheet
            table={state.selectedTable}
            onClose={() => setSelectedTable(null)}
          />
        )}
      </BottomSheet>

      <ColorPickerSheet
        isOpen={!!colorTable}
        onClose={() => setColorTable(null)}
        title={colorTable ? `Set color for Table ${colorTable.tableNumber}` : 'Set color'}
        onSelect={async (color) => {
          if (!colorTable) return;
          await setTableColor(colorTable.id, color);
          setColorTable(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#545454',
    backgroundColor: '#b9eaf8',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#545454',
  },
  scrollContent: {
    paddingBottom: 12,
    paddingRight: 16,
  },
  layoutBox: {
    paddingVertical: 4,
    paddingHorizontal: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
    marginRight: 8,
  },
});
