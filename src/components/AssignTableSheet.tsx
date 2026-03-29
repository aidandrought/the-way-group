import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { MILL_CREEK_CANVAS_HEIGHT, MILL_CREEK_CANVAS_WIDTH, MILL_CREEK_TABLE_LAYOUT } from '../constants/millCreekLayout';
import { POE_BAR_LAYOUT, POE_CANVAS_HEIGHT, POE_CANVAS_WIDTH, POE_STAGE_LAYOUT, POE_TABLE_LAYOUT } from '../constants/poeLayout';
import { getTableDisplayLabel } from '../constants/tableLabels';
import { getTableLayoutColumns } from '../constants/tableLayouts';
import { getStatusSurface, uiTheme } from '../constants/uiTheme';
import { useApp } from '../contexts/AppContext';
import { Check, Table } from '../types';
import { TableCircle } from './TableCircle';

const POE_TABLE_LABELS: Record<number, string> = {
  1: 'B 1',
  2: 'B 2',
  3: 'B 3',
  4: 'B 4',
  5: 'B 5',
  6: 'B 6',
  7: 'Bar',
  8: 'Bar',
  9: 'D 1',
  10: 'D 2',
  11: 'D 3',
  12: 'D 4',
  13: 'D 5',
  14: 'D 6',
  15: 'H 1',
  16: 'H 2',
  17: 'H 3',
  18: 'H 4',
  19: 'H 5',
  20: 'H 6',
  21: 'W 1',
  22: 'W 2',
  23: 'W 3',
  24: 'W 4',
  25: 'W 5',
  26: 'W 6',
  27: 'W 7',
  28: 'W 8',
  29: 'W 9',
  30: 'W 10',
  31: 'W 11',
  32: 'W 12',
  33: 'W 13',
  34: 'P 1',
  35: 'P 2',
  36: 'P 3',
  37: 'P 4',
  38: 'P 5',
};
const POE_TOP_INSET = 136;
const MUKILTEO_CANVAS_WIDTH = 700;
const MUKILTEO_CANVAS_HEIGHT = 800;
const MUKILTEO_ASSIGN_VISIBLE_HEIGHT_OFFSET = 115;
const MILL_CREEK_ASSIGN_VISIBLE_HEIGHT_OFFSET = 385;

interface AssignTableSheetProps {
  check: Check;
  onClose: () => void;
}

export function AssignTableSheet({ check, onClose }: AssignTableSheetProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { state, restaurantId, assignCheckToTable, clearCheck } = useApp();
  const [showConflict, setShowConflict] = useState(false);
  const [conflictTable, setConflictTable] = useState<Table | null>(null);
  const [targetTableId, setTargetTableId] = useState<string | null>(null);

  const tableByNumber = useMemo(() => {
    const map = new Map<number, Table>();
    state.tables.forEach(table => map.set(table.tableNumber, table));
    return map;
  }, [state.tables]);
  const tableColumns = useMemo(() => getTableLayoutColumns(restaurantId), [restaurantId]);
  const counterRotateMukilteoContent = restaurantId === 'mukilteo';
  const isPoe = restaurantId === 'everett';
  const isMillCreek = restaurantId === 'mill-creek';
  const isMukilteo = restaurantId === 'mukilteo';
  const useLargeCompactCheckText = isPoe || isMillCreek;
  const isSmallScreen = windowWidth < 900;
  const poeAvailableHeight = Math.max(420, windowHeight - 220);
  const smallScreenPoeScale = useMemo(
    () => Math.min(1, Math.max(0.5, poeAvailableHeight / POE_CANVAS_HEIGHT)),
    [poeAvailableHeight]
  );
  const poeScale = useMemo(
    () => (isSmallScreen ? smallScreenPoeScale : Math.min(1, (windowWidth - 40) / POE_CANVAS_WIDTH)),
    [isSmallScreen, smallScreenPoeScale, windowWidth]
  );
  const poeScaledHeight = useMemo(
    () => (POE_CANVAS_HEIGHT + POE_TOP_INSET) * poeScale,
    [poeScale]
  );
  const poeScaledWidth = useMemo(
    () => POE_CANVAS_WIDTH * poeScale,
    [poeScale]
  );
  const millCreekScale = useMemo(
    () => {
      const availableHeight = Math.max(360, windowHeight - MILL_CREEK_ASSIGN_VISIBLE_HEIGHT_OFFSET);
      return Math.min(1, availableHeight / MILL_CREEK_CANVAS_HEIGHT);
    },
    [windowHeight]
  );
  const millCreekScaledHeight = useMemo(
    () => MILL_CREEK_CANVAS_HEIGHT * millCreekScale,
    [millCreekScale]
  );
  const millCreekScaledWidth = useMemo(
    () => MILL_CREEK_CANVAS_WIDTH * millCreekScale,
    [millCreekScale]
  );
  const mukilteoScale = useMemo(
    () => {
      const availableHeight = Math.max(420, windowHeight - MUKILTEO_ASSIGN_VISIBLE_HEIGHT_OFFSET);
      return Math.min(1, availableHeight / MUKILTEO_CANVAS_HEIGHT);
    },
    [windowHeight]
  );
  const mukilteoScaledHeight = useMemo(
    () => MUKILTEO_CANVAS_HEIGHT * mukilteoScale,
    [mukilteoScale]
  );
  const mukilteoScaledWidth = useMemo(
    () => MUKILTEO_CANVAS_WIDTH * mukilteoScale,
    [mukilteoScale]
  );
  const mukilteoScaledFrameWidth = useMemo(
    () => mukilteoScaledWidth + (windowWidth < 500 ? 80 : 24),
    [mukilteoScaledWidth, windowWidth]
  );
  const getMillCreekMaxVisibleChecks = (width: number, height: number) => {
    if (width >= 300) return 12;
    if (height >= 120 || width >= 180) return 8;
    return 5;
  };

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
          This check is already assigned to table {getTableDisplayLabel(restaurantId, conflictTable.tableNumber)}. Are you sure you
          want to move it to table {targetTable ? getTableDisplayLabel(restaurantId, targetTable.tableNumber) : ''}?
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
          onPress={() => handleAssign(table.id)}
          compact
          displayLabel={getTableDisplayLabel(restaurantId, table.tableNumber)}
          counterRotateContent={counterRotateMukilteoContent}
          compactCheckTextSize={useLargeCompactCheckText ? 15 : undefined}
          compactCheckLineHeight={useLargeCompactCheckText ? 20 : undefined}
          compactLabelFontSize={isMukilteo ? 13 : undefined}
          compactLabelLineHeight={isMukilteo ? 14 : undefined}
        />
          </View>
        );
      })}
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
          onPress={() => handleAssign(table.id)}
          compact
          counterRotateContent={counterRotateMukilteoContent}
          compactCheckTextSize={useLargeCompactCheckText ? 15 : undefined}
          compactCheckLineHeight={useLargeCompactCheckText ? 20 : undefined}
          compactLabelFontSize={isMukilteo ? 13 : undefined}
          compactLabelLineHeight={isMukilteo ? 14 : undefined}
          width={options?.width}
          height={options?.height}
          borderRadius={options?.borderRadius || undefined}
          maxVisibleChecks={options?.maxVisibleChecks}
          displayLabel={options?.displayLabel ?? getTableDisplayLabel(restaurantId, table.tableNumber)}
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
    <View style={styles.poeLayoutBox}>
      <View style={[styles.poeScaledFrame, { height: poeScaledHeight, width: poeScaledWidth }]}>
        <View
          style={[
            styles.poeCanvas,
            {
              transformOrigin: 'top left',
              transform: [
                { translateY: POE_TOP_INSET },
                { scale: poeScale },
              ],
            },
          ]}
        >
        {(() => {
          const leftBarTable = tableByNumber.get(7);
          const rightBarTable = tableByNumber.get(8);
          if (!leftBarTable || !rightBarTable) return null;
          const mergedBarChecks = state.checks
            .filter(currentCheck => currentCheck.tableId === leftBarTable.id || currentCheck.tableId === rightBarTable.id)
            .sort((a, b) => a.checkNumber - b.checkNumber);
          const mergedBarColor =
            leftBarTable.color ??
            rightBarTable.color ??
            (mergedBarChecks.length === 1 ? mergedBarChecks[0].color : undefined);
          const mergedBarTone = getStatusSurface(mergedBarColor, mergedBarChecks.length > 0);
          const visibleBarChecks = mergedBarChecks.slice(0, 10);
          const hasOverflow = mergedBarChecks.length > visibleBarChecks.length;
          const mergedBarSummary = visibleBarChecks.length > 0
            ? `#${visibleBarChecks.map((currentCheck, index) => {
                const isLastVisible = index === visibleBarChecks.length - 1;
                return hasOverflow && isLastVisible
                  ? `${currentCheck.checkNumber}...`
                  : `${currentCheck.checkNumber}`;
              }).join(', ')}`
            : null;
          return (
            <View style={[styles.poeAbs, POE_BAR_LAYOUT]}>
              <View
                style={[
                  styles.poeMergedBarSurface,
                  {
                    backgroundColor: mergedBarTone.backgroundColor,
                    borderColor: mergedBarTone.borderColor,
                  },
                ]}
              >
                <Text style={[styles.poeMergedBarText, { color: mergedBarTone.textColor }]}>Bar</Text>
                {mergedBarSummary && (
                  <Text
                    style={[styles.poeMergedBarChecks, { color: mergedBarTone.textColor }]}
                    numberOfLines={2}
                  >
                    {mergedBarSummary}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleAssign(leftBarTable.id)}
                style={[styles.poeBarTouchZone, { left: 0, width: POE_BAR_LAYOUT.width / 2 }]}
              />
              <TouchableOpacity
                onPress={() => handleAssign(rightBarTable.id)}
                style={[styles.poeBarTouchZone, { left: POE_BAR_LAYOUT.width / 2, width: POE_BAR_LAYOUT.width / 2 }]}
              />
            </View>
          );
        })()}
        <View
          style={[
            styles.poeStageBlock,
            {
              left: POE_STAGE_LAYOUT.left,
              top: POE_STAGE_LAYOUT.top,
              width: POE_STAGE_LAYOUT.width,
              height: POE_STAGE_LAYOUT.height,
            },
          ]}
        />

        {POE_TABLE_LAYOUT.filter(layout => layout.tableNumber !== 7 && layout.tableNumber !== 8).map(layout =>
          renderTablePill(layout.tableNumber, layout.key, {
            width: layout.width,
            height: layout.height,
            borderRadius: layout.borderRadius,
            maxVisibleChecks: layout.width >= 220 ? 12 : layout.width >= 138 ? 14 : layout.width >= 108 ? 10 : 8,
            displayLabel: POE_TABLE_LABELS[layout.tableNumber],
            containerStyle: [styles.poeAbs, { left: layout.left, top: layout.top }],
          })
        )}
        </View>
      </View>
    </View>
  );

  const renderMukilteoGroupedLayout = () => (
    <View style={styles.mukilteoLayoutBox}>
      <View style={[styles.mukilteoScaledFrame, { width: mukilteoScaledFrameWidth, height: mukilteoScaledHeight }]}>
        <View
          style={[
            styles.mukilteoCanvas,
            {
              transformOrigin: 'top left',
              transform: [{ scale: mukilteoScale }],
            },
          ]}
        >
          <View style={[styles.mukilteoSceneStack, styles.mukilteoRotatedScene]}>
              <View style={styles.mukilteoPatioSection}>
                <View style={styles.mukilteoPlainRow}>
                  {[69, 68, 67, 66, 65, 64, 63, 62, 61, 60].map((tableNumber, index) =>
                    renderTablePill(tableNumber, `muk-zone4-patio-${tableNumber}`, {
                      width: 62,
                      height: 62,
                      borderRadius: 16,
                      maxVisibleChecks: 8,
                      containerStyle: [
                        styles.mukilteoPlainCell,
                        tableNumber === 65 && styles.mukilteoPatioWalkway,
                        index === 9 && styles.mukilteoPlainCellLast,
                      ],
                    })
                  )}
                </View>
                <View style={styles.mukilteoCounterRotatedPatioLabel}>
                  <Text style={styles.mukilteoSectionLabel}>Patio:</Text>
                </View>
              </View>

            <View style={[styles.groupRow, styles.mukilteoFloorShift]}>
              <View style={[styles.groupStack, styles.columnGap]}>
                <View style={styles.groupStack}>
                    {renderTablePill(6, 'muk-zone3-6', {
                      width: 54,
                      height: 126,
                      borderRadius: 14,
                      maxVisibleChecks: 10,
                      containerStyle: [styles.mukilteoSixSlot, styles.mukilteoH5Align],
                    })}
                  <View style={styles.mukilteo3134Stack}>
                {renderTablePill(34, 'muk-zone2-34', {
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  maxVisibleChecks: 8,
                  containerStyle: styles.mukilteo3134TopCell,
                })}
                    {renderTablePill(33, 'muk-zone2-33', {
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      maxVisibleChecks: 8,
                      containerStyle: styles.mukilteo3134Cell,
                    })}
                    {renderTablePill(32, 'muk-zone2-32', {
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      maxVisibleChecks: 8,
                      containerStyle: styles.mukilteo3134Cell,
                    })}
                {renderTablePill(31, 'muk-zone2-31', {
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  maxVisibleChecks: 8,
                  containerStyle: styles.mukilteoTopRightBooth,
                })}
                  </View>
                </View>
              </View>

              <View style={[styles.groupStack, styles.columnGap]}>
                <View style={styles.mukilteoZigZagStack}>
                  <View style={styles.mukilteoZigRow}>
                    {renderTablePill(44, 'muk-zone3-44', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8, containerStyle: styles.mukilteoLaneCellShift })}
                  </View>
                  <View style={[styles.mukilteoZigRow, styles.mukilteoZigRowOffset]}>
                    {renderTablePill(43, 'muk-zone3-43', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
                  </View>
                  <View style={styles.mukilteoZigRow}>
                    {renderTablePill(42, 'muk-zone3-42', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8, containerStyle: styles.mukilteoLaneCellShift })}
                  </View>
                  <View style={[styles.mukilteoZigRow, styles.mukilteoZigRowOffset]}>
                    {renderTablePill(41, 'muk-zone3-41', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8 })}
                  </View>
                  <View style={styles.mukilteoZigRow}>
                    {renderTablePill(40, 'muk-zone3-40', { width: 62, height: 62, borderRadius: 16, maxVisibleChecks: 8, containerStyle: styles.mukilteoLaneCellShift })}
                  </View>
                </View>
                <View style={styles.mukilteoBottomAlignRow}>
                  {renderTablePill(5, 'muk-zone2-5', {
                    width: 62,
                    height: 156,
                    borderRadius: 16,
                    maxVisibleChecks: 14,
                    containerStyle: styles.mukilteoCenterLaneShift,
                  })}
                  {renderTablePill(30, 'muk-zone2-30', {
                    width: 62,
                    height: 62,
                    borderRadius: 16,
                    maxVisibleChecks: 8,
                    containerStyle: [styles.mukilteoThirtyRaised, styles.mukilteoTopLeftBooth],
                  })}
                </View>
              </View>

              <View style={styles.groupRow}>
                <View style={styles.groupStack}>
                  <View style={styles.mukilteoPlainRow}>
                    {[52, 51, 50].map((tableNumber, index) =>
                      renderTablePill(tableNumber, `muk-zone3-${tableNumber}`, {
                        width: 62,
                        height: 62,
                        borderRadius: 16,
                        maxVisibleChecks: 8,
                        containerStyle: [styles.mukilteoPlainCell, index === 2 && styles.mukilteoPlainCellLast],
                      })
                    )}
                  </View>
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
      </View>
    </View>
  );

  const renderMillCreekLayout = () => (
    <View style={styles.millCreekLayoutBox}>
      <View style={[styles.millCreekScaledFrame, { width: millCreekScaledWidth, height: millCreekScaledHeight }]}>
        <View
          style={[
            styles.millCreekCanvas,
            {
              transformOrigin: 'top left',
              transform: [{ scale: millCreekScale }],
            },
          ]}
        >
          <View style={[styles.millCreekBlock, { left: 44, top: 28, width: 460, height: 96 }]} />

        {MILL_CREEK_TABLE_LAYOUT.map(layout =>
          renderTablePill(layout.tableNumber, layout.key, {
            width: layout.width,
            height: layout.height,
            borderRadius: layout.borderRadius,
            maxVisibleChecks: getMillCreekMaxVisibleChecks(layout.width, layout.height),
            containerStyle: [styles.millCreekAbs, { left: layout.left, top: layout.top }],
            })
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View>
      <Text style={styles.title}>Assign Check #{check.checkNumber}</Text>
      {restaurantId === 'everett' ? (
        isSmallScreen ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.assignLayoutWrap}
            contentContainerStyle={styles.poeAssignLayoutContent}
          >
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              bounces={false}
              alwaysBounceHorizontal={false}
              contentOffset={{ x: 0, y: 0 }}
              contentContainerStyle={styles.poeAssignHorizontalContent}
            >
              {renderEverettGroupedLayout()}
            </ScrollView>
          </ScrollView>
        ) : (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.assignLayoutWrap}
            contentContainerStyle={styles.poeAssignLayoutContent}
          >
            {renderEverettGroupedLayout()}
          </ScrollView>
        )
      ) : isMillCreek ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          bounces={false}
          alwaysBounceHorizontal={false}
          style={styles.assignLayoutWrap}
          contentContainerStyle={styles.millCreekAssignContent}
        >
          {renderMillCreekLayout()}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          bounces={false}
          alwaysBounceHorizontal={false}
          style={styles.assignLayoutWrap}
          contentContainerStyle={styles.assignLayoutContent}
        >
          {restaurantId === 'mukilteo'
            ? renderMukilteoGroupedLayout()
            : renderDefaultLayout()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conflictContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: uiTheme.colors.inkSoft,
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
    borderRadius: uiTheme.radius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: uiTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
  },
  confirmButton: {
    backgroundColor: uiTheme.colors.primaryStrong,
  },
  cancelText: {
    fontSize: 16,
    color: uiTheme.colors.ink,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  assignLayoutWrap: {
    paddingBottom: 0,
    alignSelf: 'stretch',
  },
  assignLayoutContent: {
    alignItems: 'flex-start',
    paddingBottom: 0,
    paddingRight: 0,
    flexGrow: 0,
  },
  poeAssignLayoutContent: {
    alignItems: 'flex-start',
    paddingBottom: 0,
  },
  poeAssignHorizontalContent: {
    alignItems: 'flex-start',
  },
  layoutBox: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    backgroundColor: uiTheme.colors.appBackground,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mukilteoLayoutBox: {
    alignItems: 'flex-start',
    paddingBottom: 0,
    paddingTop: 22,
  },
  mukilteoScaledFrame: {
    overflow: 'visible',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  mukilteoCanvas: {
    width: MUKILTEO_CANVAS_WIDTH,
    height: MUKILTEO_CANVAS_HEIGHT,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 18,
  },
  column: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    borderRadius: uiTheme.radius.md,
    backgroundColor: uiTheme.colors.surface,
    minWidth: 86,
    justifyContent: 'flex-start',
    ...uiTheme.shadow.soft,
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
  poeLayoutBox: {
    alignItems: 'flex-start',
  },
  poeScaledFrame: {
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  poeCanvas: {
    width: POE_CANVAS_WIDTH,
    height: POE_CANVAS_HEIGHT,
    position: 'relative',
  },
  poeAbs: {
    position: 'absolute',
  },
  poeMergedBarSurface: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    ...uiTheme.shadow.soft,
  },
  poeMergedBarText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  poeMergedBarChecks: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    opacity: 0.84,
    textAlign: 'center',
  },
  poeBarTouchZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  poeStageBlock: {
    position: 'absolute',
    left: 360,
    top: 34,
    width: 420,
    height: 36,
    borderWidth: 1,
    borderColor: uiTheme.colors.borderStrong,
    backgroundColor: uiTheme.colors.appBackgroundAlt,
  },
  millCreekAssignContent: {
    alignItems: 'flex-start',
    paddingBottom: 0,
    paddingRight: 0,
    flexGrow: 0,
  },
  millCreekLayoutBox: {
    alignItems: 'center',
    width: '100%',
  },
  millCreekScaledFrame: {
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  millCreekCanvas: {
    width: MILL_CREEK_CANVAS_WIDTH,
    height: MILL_CREEK_CANVAS_HEIGHT,
    position: 'relative',
  },
  millCreekAbs: {
    position: 'absolute',
  },
  millCreekBlock: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: uiTheme.colors.borderStrong,
    backgroundColor: uiTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
  mukilteoRotatedScene: {
    transform: [{ rotate: '180deg' }],
  },
  mukilteoPatioSection: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 25,
  },
  mukilteoFloorShift: {
    transform: [{ translateX: 15 }],
  },
  mukilteoPlainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mukilteoPlainCell: {
    marginRight: 10,
  },
  mukilteoPlainCellLast: {
    marginRight: 0,
  },
  mukilteoPatioWalkway: {
    marginRight: 72,
  },
  mukilteoSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: uiTheme.colors.inkMuted,
    marginLeft: 4,
  },
  mukilteoCounterRotatedPatioLabel: {
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
    marginLeft: 0,
    marginRight: 8,
  },
  mukilteoCounterRotatedLabel: {
    transform: [{ rotate: '180deg' }],
    alignSelf: 'flex-end',
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
    marginLeft: 26,
  },
  mukilteoBottomAlignRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 0,
  },
  mukilteoHRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mukilteoZigZagStack: {
    alignItems: 'flex-start',
    gap: 0,
    marginLeft: 18,
  },
  mukilteoZigRow: {
    width: 135,
    alignItems: 'flex-start',
  },
  mukilteoZigRowOffset: {
    alignItems: 'flex-end',
  },
  mukilteoThirtyLower: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLast: {
    marginBottom: 0,
  },
  mukilteo3134Stack: {
    alignItems: 'center',
    marginLeft: -6,
    transform: [{ translateX: 18 }],
  },
  mukilteoCenterLaneShift: {
    marginLeft: 45,
    transform: [{ translateX: -58 }],
  },
  mukilteoLaneCellShift: {
    transform: [{ translateX: -30 }],
  },
  mukilteo3134TopCell: {
    marginBottom: 16,
  },
  mukilteo3134Cell: {
    marginBottom: 16,
  },
  mukilteoThirtyRaised: {
    marginBottom: 8,
  },
  mukilteoTopLeftBooth: {
    transform: [{ translateY: 22 }, { translateX: -27 }],
  },
  mukilteoTopRightBooth: {
    transform: [{ translateY: 20 }],
  },
  mukilteoH5Align: {
    transform: [{ translateY: -15 }, { translateX: -27 }],
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
