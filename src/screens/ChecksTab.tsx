import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { AssignTableSheet } from '../components/AssignTableSheet';
import { BottomSheet } from '../components/BottomSheet';
import { CheckCircle } from '../components/CheckCircle';
import { ColorPickerSheet } from '../components/ColorPickerSheet';
import { getTableDisplayLabel } from '../constants/tableLabels';
import { uiTheme } from '../constants/uiTheme';
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
    restaurantId,
  } = useApp();
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const [colorCheck, setColorCheck] = useState<Check | null>(null);
  const layoutWidth = availableWidth || width;
  const horizontalPadding = 32;
  const gridGap = 10;
  const usableWidth = Math.max(260, layoutWidth - horizontalPadding);
  const minCardWidth = layoutWidth >= 1000 ? 110 : layoutWidth >= 700 ? 100 : 92;
  const numColumns = Math.max(3, Math.floor((usableWidth + gridGap) / (minCardWidth + gridGap)));
  const cardWidth = Math.floor((usableWidth - gridGap * (numColumns - 1)) / numColumns);
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
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - availableWidth) > 1) {
          setAvailableWidth(nextWidth);
        }
      }}
    >
      <FlatList
        key={`checks-grid-${numColumns}`}
        data={checksSorted}
        keyExtractor={(check) => check.id}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const table = item.tableId ? tableById.get(item.tableId) : undefined;
          const tableLabel = table ? `Table: ${getTableDisplayLabel(restaurantId, table.tableNumber)}` : undefined;
          return (
            <View style={[styles.cardWrap, { width: cardWidth }]}>
              <CheckCircle
                check={item}
                tableNumber={table?.tableNumber}
                tableLabel={tableLabel}
                tableColor={table?.color}
                onPress={() => setSelectedCheck(item)}
                onLongPress={() => setColorCheck(item)}
              />
            </View>
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
        selectedColor={colorCheck?.color ?? null}
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
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: uiTheme.colors.appBackground,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  grid: {
    paddingBottom: 24,
    rowGap: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardWrap: {
    minHeight: 74,
  },
});
