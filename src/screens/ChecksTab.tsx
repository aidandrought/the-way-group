import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AssignTableSheet } from '../components/AssignTableSheet';
import { BottomSheet } from '../components/BottomSheet';
import { CheckCircle } from '../components/CheckCircle';
import { ColorPickerSheet } from '../components/ColorPickerSheet';
import { useApp } from '../contexts/AppContext';
import type { Check } from '../types';

export function ChecksTab() {
  const {
    state,
    setSelectedCheck,
    error,
    seedFirestore,
    seeding,
    checksLoaded,
    tablesLoaded,
    setCheckColor,
  } = useApp();
  const [colorCheck, setColorCheck] = useState<Check | null>(null);
  const checksSorted = useMemo(
    () => [...state.checks].sort((a, b) => a.checkNumber - b.checkNumber),
    [state.checks]
  );
  const tableById = useMemo(
    () => new Map(state.tables.map(table => [table.id, table] as const)),
    [state.tables]
  );
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
          <Text style={styles.title}>Checks</Text>
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
        <Text style={styles.title}>Checks</Text>
      </View>
      <FlatList
        data={checksSorted}
        keyExtractor={(check) => check.id}
        numColumns={4}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const table = item.tableId ? tableById.get(item.tableId) : undefined;
          return (
            <CheckCircle
              check={item}
              tableNumber={table?.tableNumber}
              tableColor={table?.color}
              onPress={() => setSelectedCheck(item)}
              onLongPress={() => setColorCheck(item)}
            />
          );
        }}
        initialNumToRender={32}
        windowSize={7}
        removeClippedSubviews
      />

      <BottomSheet
        isOpen={!!state.selectedCheck}
        onClose={() => setSelectedCheck(null)}
      >
        {state.selectedCheck && (
          <AssignTableSheet
            check={state.selectedCheck}
            onClose={() => setSelectedCheck(null)}
          />
        )}
      </BottomSheet>

      <ColorPickerSheet
        isOpen={!!colorCheck}
        onClose={() => setColorCheck(null)}
        title={colorCheck ? `Set color for Check ${colorCheck.checkNumber}` : 'Set color'}
        onSelect={async (color) => {
          if (!colorCheck) return;
          await setCheckColor(colorCheck.id, color);
          setColorCheck(null);
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
    color: '#1A1A1A',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  grid: {
    paddingBottom: 24,
    gap: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
});
