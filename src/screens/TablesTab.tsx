import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { ColorPickerSheet } from '../components/ColorPickerSheet';
import { TableCircle } from '../components/TableCircle';
import { TableDetailsSheet } from '../components/TableDetailsSheet';
import { useApp } from '../contexts/AppContext';
import { Table } from '../types';

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map(section => (
          <View key={section.name} style={styles.section}>
            <FlatList
              data={section.tables}
              keyExtractor={(tableNum) => `${section.name}-${tableNum}`}
              numColumns={section.cols}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={styles.sectionRow}
              renderItem={({ item: tableNum }) => {
                const table = tableByNumber.get(tableNum);
                return table ? (
                  <TableCircle
                    table={table}
                    checks={state.checks}
                    onPress={() => setSelectedTable(table)}
                    onLongPress={() => setColorTable(table)}
                    compact={true}
                  />
                ) : (
                  <View style={styles.placeholder} />
                );
              }}
              scrollEnabled={false}
              initialNumToRender={section.tables.length}
              removeClippedSubviews
            />
          </View>
        ))}
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
    paddingBottom: 24,
  },
  section: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  grid: {
    gap: 10,
    justifyContent: 'space-around',
  },
  sectionRow: {
    justifyContent: 'space-around',
  },
  placeholder: {
    width: 60,
    height: 60,
  },
});
