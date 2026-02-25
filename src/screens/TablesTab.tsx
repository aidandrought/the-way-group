import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { ColorPickerSheet } from '../components/ColorPickerSheet';
import { TableCircle } from '../components/TableCircle';
import { TableDetailsSheet } from '../components/TableDetailsSheet';
import { getTableLayoutColumns } from '../constants/tableLayouts';
import { useApp } from '../contexts/AppContext';
import { Table } from '../types';

export function TablesTab() {
  const {
    state,
    restaurantId,
    setSelectedTable,
    error,
    seedFirestore,
    seeding,
    checksLoaded,
    tablesLoaded,
    setTableColor,
  } = useApp();
  const [colorTable, setColorTable] = useState<Table | null>(null);
  const horizontalScrollRef = useRef<ScrollView | null>(null);
  const didAutoScrollMukilteoRef = useRef(false);
  const tableByNumber = useMemo(() => {
    const map = new Map<number, Table>();
    state.tables.forEach(table => map.set(table.tableNumber, table));
    return map;
  }, [state.tables]);
  const tableColumns = useMemo(
    () => getTableLayoutColumns(restaurantId),
    [restaurantId]
  );

  useEffect(() => {
    didAutoScrollMukilteoRef.current = false;
  }, [restaurantId]);
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

  const renderTableRow = (
    row: Array<number | null>,
    rowKey: string,
    isLastRow: boolean,
    cellStyle?: object,
    rowStyle?: object
  ) => (
    <View key={rowKey} style={[styles.row, rowStyle, isLastRow && styles.rowLast]}>
      {row.map((tableNum, cellIndex) => {
        if (tableNum == null) {
          const isLastInRow = cellIndex === row.length - 1;
          return (
            <View
              key={`${rowKey}-gap-${cellIndex}`}
              style={[styles.placeholder, isLastInRow && styles.cellLast]}
            />
          );
        }
        const table = tableByNumber.get(tableNum);
        if (!table) return <View key={`missing-${tableNum}`} style={styles.placeholder} />;
        const isLastInRow = cellIndex === row.length - 1;
        return (
          <View key={`table-${tableNum}`} style={[styles.cell, cellStyle, isLastInRow && styles.cellLast]}>
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
  );

  const renderGroupCard = (
    key: string,
    rows: Array<Array<number | null>>,
    options?: { cellStyle?: object; cardStyle?: object; rowStyle?: object }
  ) => (
    <View key={key} style={[styles.column, options?.cardStyle]}>
      {rows.map((row, rowIndex) =>
        renderTableRow(
          row,
          `${key}-row-${rowIndex}`,
          rowIndex === rows.length - 1,
          options?.cellStyle,
          options?.rowStyle
        )
      )}
    </View>
  );

  const renderTablePill = (
    tableNumber: number,
    key: string,
    options?: {
      width?: number;
      height?: number;
      borderRadius?: number;
      maxVisibleChecks?: number;
      containerStyle?: object;
      displayLabel?: string;
    }
  ) => {
    const table = tableByNumber.get(tableNumber);
    if (!table) return <View key={`missing-${tableNumber}`} style={styles.placeholder} />;
    return (
      <View key={key} style={[styles.mukilteoCustomCell, options?.containerStyle]}>
        <TableCircle
          table={table}
          checks={state.checks}
          onPress={() => setSelectedTable(table)}
          onLongPress={() => setColorTable(table)}
          compact
          width={options?.width}
          height={options?.height}
          borderRadius={options?.borderRadius}
          maxVisibleChecks={options?.maxVisibleChecks}
          displayLabel={options?.displayLabel}
        />
      </View>
    );
  };

  const renderDefaultLayout = () => (
    <View style={styles.layoutBox}>
      {tableColumns.map((column, columnIndex) => (
        <View
          key={column.key}
          style={[
            styles.column,
            columnIndex < tableColumns.length - 1 && styles.columnGap,
          ]}
        >
          {column.rows.map((row, rowIndex) =>
            renderTableRow(row, `${column.key}-row-${rowIndex}`, rowIndex === column.rows.length - 1)
          )}
        </View>
      ))}
    </View>
  );

  const renderEverettGroupedLayout = () => (
    <View style={styles.layoutBox}>
      <View style={[styles.groupStack, styles.columnGap]}>
        <View style={[styles.groupRow, styles.everettTopGroupRow]}>
          {renderGroupCard('everett-1to6', [[1, 2, 3, 4, 5, 6]], {
            cellStyle: styles.everettWideCell,
          })}
          {renderGroupCard('everett-10', [[10]], {
            cardStyle: styles.everettSingleBubble,
          })}
        </View>
        {renderGroupCard('everett-20to28', [[20, 21, 22, 23, 24, 25, 26, 27, 28]])}
        {renderGroupCard('everett-40to44', [[40, null, 41, null, 42, null, 43, null, 44]])}
      </View>

      <View style={[styles.groupStack, styles.columnGap]}>
        {renderGroupCard('everett-11to16', [[11, 12], [13, 14], [15, 16]])}
      </View>

      <View style={styles.groupRow}>
        {renderGroupCard('everett-30to35', [[30, 31], [32, 33], [34, 35]])}
        {renderGroupCard('everett-36to39', [[36], [37], [38], [39]])}
      </View>
    </View>
  );

  const renderMukilteoGroupedLayout = () => (
    <View style={styles.layoutBox}>
      <View style={styles.mukilteoSceneStack}>
        <View style={styles.mukilteoPatioSection}>
          <Text style={styles.mukilteoSectionLabel}>Patio:</Text>
          {renderGroupCard('muk-zone4-patio', [[69, 68, 67, 66, 65, 64, 63, 62, 61, 60]])}
        </View>

        <View style={styles.groupRow}>
          <View style={[styles.groupStack, styles.columnGap]}>
            <View style={styles.groupStack}>
              {renderTablePill(6, 'muk-zone3-6', {
                width: 54,
                height: 126,
                borderRadius: 14,
                maxVisibleChecks: 10,
                containerStyle: styles.mukilteoSixSlot,
              })}
              {renderGroupCard('muk-zone2-31to34', [[34], [33], [32], [31]], {
                cardStyle: styles.everettSingleBubble,
                rowStyle: styles.mukilteo3134Row,
              })}
            </View>
          </View>

          <View style={[styles.groupStack, styles.columnGap]}>
            <View style={styles.mukilteoZigZagStack}>
              <View style={styles.mukilteoZigRow}>
                {renderTablePill(44, 'muk-zone3-44', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
              </View>
              <View style={[styles.mukilteoZigRow, styles.mukilteoZigRowOffset]}>
                {renderTablePill(43, 'muk-zone3-43', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
              </View>
              <View style={styles.mukilteoZigRow}>
                {renderTablePill(42, 'muk-zone3-42', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
              </View>
              <View style={[styles.mukilteoZigRow, styles.mukilteoZigRowOffset]}>
                {renderTablePill(41, 'muk-zone3-41', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
              </View>
              <View style={styles.mukilteoZigRow}>
                {renderTablePill(40, 'muk-zone3-40', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
              </View>
            </View>
            <View style={styles.mukilteoBottomAlignRow}>
              {renderTablePill(5, 'muk-zone2-5', {
                width: 62,
                height: 156,
                borderRadius: 16,
                maxVisibleChecks: 14,
              })}
              {renderTablePill(30, 'muk-zone2-30', {
                width: 62,
                height: 62,
                borderRadius: 16,
                maxVisibleChecks: 8,
                containerStyle: styles.mukilteoThirtyLower,
              })}
            </View>
          </View>

          <View style={styles.groupRow}>
            <View style={styles.groupStack}>
              {renderGroupCard('muk-zone3-50s', [[52, 51, 50]])}
              <View style={styles.groupRow}>
                {renderTablePill(4, 'muk-zone1-4', { width: 62, height: 136, borderRadius: 16, maxVisibleChecks: 10 })}
                {renderTablePill(3, 'muk-zone1-3', { width: 62, height: 136, borderRadius: 16, maxVisibleChecks: 10 })}
                {renderTablePill(2, 'muk-zone1-2', { width: 62, height: 136, borderRadius: 16, maxVisibleChecks: 10 })}
                {renderTablePill(1, 'muk-zone1-1', { width: 62, height: 136, borderRadius: 16, maxVisibleChecks: 10 })}
              </View>
              <View style={styles.mukilteoTenLane}>
                {renderTablePill(10, 'muk-zone1-10', {
                  width: 250,
                  height: 62,
                  borderRadius: 14,
                  maxVisibleChecks: 18,
                })}
              </View>
            </View>
            {renderTablePill(70, 'muk-event-space', {
              width: 155,
              height: 300,
              borderRadius: 14,
              maxVisibleChecks: 30,
              displayLabel: 'Event Space',
              containerStyle: styles.mukilteoEventSpaceBox,
            })}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => {
          if (restaurantId !== 'mukilteo') return;
          if (didAutoScrollMukilteoRef.current) return;
          didAutoScrollMukilteoRef.current = true;
          requestAnimationFrame(() => {
            horizontalScrollRef.current?.scrollToEnd({ animated: false });
          });
        }}
      >
        {restaurantId === 'everett'
          ? renderEverettGroupedLayout()
          : restaurantId === 'mukilteo'
            ? renderMukilteoGroupedLayout()
          : renderDefaultLayout()}
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
    justifyContent: 'flex-start',
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
  groupStack: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  everettTopGroupRow: {
    gap: 4.4,
  },
  everettWideCell: {
    marginRight: 31,
  },
  everettSingleBubble: {
    minWidth: 0,
  },
  mukilteoTenCard: {
    minWidth: 0,
  },
  mukilteoTenLane: {
    width: 274,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mukilteoSceneStack: {
    alignItems: 'flex-start',
    gap: 12,
  },
  mukilteoPatioSection: {
    alignItems: 'flex-start',
    gap: 6,
  },
  mukilteoSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4d5f73',
    marginLeft: 4,
  },
  mukilteoCustomCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mukilteoEventSpaceBox: {
    width: 160,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mukilteoSixSlot: {
    width: 80,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mukilteoBottomAlignRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 0,
  },
  mukilteoZigZagStack: {
    alignItems: 'flex-start',
    gap: 0,
  },
  mukilteoZigRow: {
    width: 135,
    alignItems: 'flex-start',
  },
  mukilteoZigRowOffset: {
    alignItems: 'flex-end',
  },
  mukilteoThirtyLower: {
    marginBottom: -30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLast: {
    marginBottom: 0,
  },
  mukilteo3134Row: {
    marginBottom: 35,
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
