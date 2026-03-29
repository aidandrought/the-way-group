import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { MILL_CREEK_CANVAS_HEIGHT, MILL_CREEK_CANVAS_WIDTH, MILL_CREEK_TABLE_LAYOUT } from '../constants/millCreekLayout';
import { POE_BAR_LAYOUT, POE_CANVAS_HEIGHT, POE_CANVAS_WIDTH, POE_TABLE_LAYOUT } from '../constants/poeLayout';
import { getTableLayoutColumns } from '../constants/tableLayouts';
import { getTableDisplayLabel, POE_TABLE_LABELS } from '../constants/tableLabels';
import { STATUS_COLOR_TOKENS, uiTheme } from '../constants/uiTheme';
import type { RestaurantId } from '../constants/restaurants';
import type { Table } from '../types';

const POE_SELECTOR_MAX_HEIGHT = 360;
const MILL_CREEK_SELECTOR_MAX_HEIGHT = 420;

type RestaurantTableSelectorProps = {
  restaurantId: RestaurantId;
  tables: Table[];
  selectedTableIds: string[];
  onToggleTable: (tableId: string) => void;
};

type SelectorPillProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  width?: number;
  height?: number;
  borderRadius?: number;
};

function SelectorPill({
  label,
  isSelected,
  onPress,
  width = 55,
  height = 55,
  borderRadius,
}: SelectorPillProps) {
  const fontSize = Math.min(18, Math.max(11, Math.min(width, height) * 0.18));
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.selectorPill,
        {
          width,
          height,
          borderRadius: borderRadius ?? Math.max(14, Math.min(width, height) * 0.22),
        },
        isSelected && styles.selectorPillSelected,
      ]}
    >
      <Text
        style={[
          styles.selectorPillText,
          { fontSize, lineHeight: fontSize + 2 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function RestaurantTableSelector({
  restaurantId,
  tables,
  selectedTableIds,
  onToggleTable,
}: RestaurantTableSelectorProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const tableColumns = useMemo(() => getTableLayoutColumns(restaurantId), [restaurantId]);
  const tableByNumber = useMemo(() => {
    const map = new Map<number, Table>();
    tables.forEach(table => map.set(table.tableNumber, table));
    return map;
  }, [tables]);
  const isMillCreek = restaurantId === 'mill-creek';
  const isSmallScreen = windowWidth < 900;
  const poeAvailableHeight = Math.max(220, Math.min(POE_SELECTOR_MAX_HEIGHT, windowHeight - 420));
  const smallScreenPoeScale = useMemo(
    () => Math.min(0.5, Math.max(0.22, poeAvailableHeight / POE_CANVAS_HEIGHT)),
    [poeAvailableHeight]
  );
  const poeScale = useMemo(() => {
    const widthLimit = Math.max(240, availableWidth - 24);
    const fitByWidth = widthLimit / POE_CANVAS_WIDTH;
    const fitByHeight = poeAvailableHeight / POE_CANVAS_HEIGHT;
    const fittedScale = Math.min(fitByWidth, fitByHeight);
    return isSmallScreen ? Math.min(smallScreenPoeScale, fittedScale) : Math.max(0.18, fittedScale);
  }, [availableWidth, isSmallScreen, poeAvailableHeight, smallScreenPoeScale]);
  const poeScaledHeight = POE_CANVAS_HEIGHT * poeScale;
  const poeScaledWidth = POE_CANVAS_WIDTH * poeScale;
  const millCreekAvailableHeight = Math.max(260, Math.min(MILL_CREEK_SELECTOR_MAX_HEIGHT, windowHeight - 360));
  const millCreekScale = useMemo(() => {
    const widthLimit = Math.max(260, availableWidth - 24);
    const fitByWidth = widthLimit / MILL_CREEK_CANVAS_WIDTH;
    const fitByHeight = millCreekAvailableHeight / MILL_CREEK_CANVAS_HEIGHT;
    return Math.max(0.2, Math.min(fitByWidth, fitByHeight));
  }, [availableWidth, millCreekAvailableHeight]);
  const millCreekScaledHeight = MILL_CREEK_CANVAS_HEIGHT * millCreekScale;
  const millCreekScaledWidth = MILL_CREEK_CANVAS_WIDTH * millCreekScale;

  const renderTableRow = (
    row: (number | null)[],
    rowKey: string,
    isLastRow: boolean,
    cellStyle?: object,
    rowStyle?: object
  ) => (
    <View key={rowKey} style={[styles.row, rowStyle, isLastRow && styles.rowLast]}>
      {row.map((tableNum, cellIndex) => {
        if (tableNum == null) {
          const isLastInRow = cellIndex === row.length - 1;
          return <View key={`${rowKey}-gap-${cellIndex}`} style={[styles.placeholder, isLastInRow && styles.cellLast]} />;
        }
        const table = tableByNumber.get(tableNum);
        if (!table) return <View key={`missing-${tableNum}`} style={styles.placeholder} />;
        const isLastInRow = cellIndex === row.length - 1;
        return (
          <View key={`table-${tableNum}`} style={[styles.cell, cellStyle, isLastInRow && styles.cellLast]}>
            <SelectorPill
              label={getTableDisplayLabel(restaurantId, table.tableNumber)}
              isSelected={selectedTableIds.includes(table.id)}
              onPress={() => onToggleTable(table.id)}
            />
          </View>
        );
      })}
    </View>
  );

  const renderGroupCard = (
    key: string,
    rows: (number | null)[][],
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
      containerStyle?: object;
      displayLabel?: string;
    }
  ) => {
    const table = tableByNumber.get(tableNumber);
    if (!table) return <View key={`missing-${tableNumber}`} style={styles.placeholder} />;
    return (
      <View key={key} style={[styles.customCell, options?.containerStyle]}>
        <SelectorPill
          label={options?.displayLabel ?? getTableDisplayLabel(restaurantId, table.tableNumber)}
          isSelected={selectedTableIds.includes(table.id)}
          onPress={() => onToggleTable(table.id)}
          width={options?.width}
          height={options?.height}
          borderRadius={options?.borderRadius || undefined}
        />
      </View>
    );
  };

  const renderDefaultLayout = () => (
    <View style={styles.layoutBox}>
      {tableColumns.map((column, columnIndex) => (
        <View key={column.key} style={[styles.column, columnIndex < tableColumns.length - 1 && styles.columnGap]}>
          {column.rows.map((row, rowIndex) =>
            renderTableRow(row, `${column.key}-row-${rowIndex}`, rowIndex === column.rows.length - 1)
          )}
        </View>
      ))}
    </View>
  );

  const renderPoeLayout = () => (
    <View
      style={styles.poeLayoutBox}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - availableWidth) > 1) {
          setAvailableWidth(nextWidth);
        }
      }}
    >
      <View style={[styles.poeScaledFrame, { width: poeScaledWidth, height: poeScaledHeight }]}>
        {(() => {
          const leftBarTable = tableByNumber.get(7);
          const rightBarTable = tableByNumber.get(8);
          if (!leftBarTable || !rightBarTable) return null;
          const barLeft = POE_BAR_LAYOUT.left * poeScale;
          const barTop = POE_BAR_LAYOUT.top * poeScale;
          const barWidth = POE_BAR_LAYOUT.width * poeScale;
          const barHeight = POE_BAR_LAYOUT.height * poeScale;
          const leftSelected = selectedTableIds.includes(leftBarTable.id);
          const rightSelected = selectedTableIds.includes(rightBarTable.id);
          return (
            <View
              style={[
                styles.poeAbs,
                {
                  left: barLeft,
                  top: barTop,
                  width: barWidth,
                  height: barHeight,
                },
              ]}
            >
              <View style={[styles.poeMergedBar, { width: barWidth, height: barHeight }, (leftSelected || rightSelected) && styles.poeMergedBarSelected]}>
                <Text style={[styles.poeMergedBarText, { fontSize: Math.min(18, Math.max(12, barHeight * 0.34)) }]}>Bar</Text>
              </View>
              <TouchableOpacity
                onPress={() => onToggleTable(leftBarTable.id)}
                style={[styles.poeBarTouchZone, { left: 0, width: barWidth / 2, height: barHeight }]}
              />
              <TouchableOpacity
                onPress={() => onToggleTable(rightBarTable.id)}
                style={[styles.poeBarTouchZone, { right: 0, width: barWidth / 2, height: barHeight }]}
              />
            </View>
          );
        })()}

        {POE_TABLE_LAYOUT.map(layout => {
          if (layout.tableNumber === 7 || layout.tableNumber === 8) return null;
          const table = tableByNumber.get(layout.tableNumber);
          if (!table) return null;
          return (
            <View
              key={layout.key}
              style={[
                styles.poeAbs,
                {
                  left: layout.left * poeScale,
                  top: layout.top * poeScale,
                },
              ]}
            >
              <SelectorPill
                label={POE_TABLE_LABELS[layout.tableNumber]}
                isSelected={selectedTableIds.includes(table.id)}
                onPress={() => onToggleTable(table.id)}
                width={layout.width * poeScale}
                height={layout.height * poeScale}
                borderRadius={layout.borderRadius ? layout.borderRadius * poeScale : undefined}
              />
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderMukilteoLayout = () => (
    <View style={styles.layoutBox}>
      <View style={[styles.mukilteoSceneStack, styles.mukilteoRotatedScene]}>
        <View style={styles.mukilteoPatioSection}>
          <View style={styles.mukilteoPlainRow}>
            {[69, 68, 67, 66, 65, 64, 63, 62, 61, 60].map((tableNumber, index) =>
              renderTablePill(tableNumber, `muk-zone4-patio-${tableNumber}`, {
                width: 62,
                height: 62,
                borderRadius: 16,
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
              {renderTablePill(6, 'muk-zone3-6', { width: 54, height: 126, borderRadius: 14, containerStyle: [styles.mukilteoSixSlot, styles.mukilteoH5Align] })}
              <View style={styles.mukilteo3134Stack}>
                {renderTablePill(34, 'muk-zone2-34', { width: 64, height: 64, borderRadius: 18, containerStyle: styles.mukilteo3134TopCell })}
                {renderTablePill(33, 'muk-zone2-33', { width: 64, height: 64, borderRadius: 18, containerStyle: styles.mukilteo3134Cell })}
                {renderTablePill(32, 'muk-zone2-32', { width: 64, height: 64, borderRadius: 18, containerStyle: styles.mukilteo3134Cell })}
                {renderTablePill(31, 'muk-zone2-31', { width: 64, height: 64, borderRadius: 18, containerStyle: styles.mukilteoTopRightBooth })}
              </View>
            </View>
          </View>

          <View style={[styles.groupStack, styles.columnGap]}>
            <View style={styles.mukilteoZigZagStack}>
              <View style={styles.mukilteoZigRow}>{renderTablePill(44, 'muk-zone3-44', { width: 62, height: 62, borderRadius: 16, containerStyle: styles.mukilteoLaneCellShift })}</View>
              <View style={[styles.mukilteoZigRow, styles.mukilteoZigRowOffset]}>{renderTablePill(43, 'muk-zone3-43', { width: 62, height: 62, borderRadius: 16 })}</View>
              <View style={styles.mukilteoZigRow}>{renderTablePill(42, 'muk-zone3-42', { width: 62, height: 62, borderRadius: 16, containerStyle: styles.mukilteoLaneCellShift })}</View>
              <View style={[styles.mukilteoZigRow, styles.mukilteoZigRowOffset]}>{renderTablePill(41, 'muk-zone3-41', { width: 62, height: 62, borderRadius: 16 })}</View>
              <View style={styles.mukilteoZigRow}>{renderTablePill(40, 'muk-zone3-40', { width: 62, height: 62, borderRadius: 16, containerStyle: styles.mukilteoLaneCellShift })}</View>
            </View>
            <View style={styles.mukilteoBottomAlignRow}>
              {renderTablePill(5, 'muk-zone2-5', { width: 62, height: 156, borderRadius: 16, containerStyle: styles.mukilteoCenterLaneShift })}
              {renderTablePill(30, 'muk-zone2-30', { width: 62, height: 62, borderRadius: 16, containerStyle: [styles.mukilteoThirtyRaised, styles.mukilteoTopLeftBooth] })}
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
                    containerStyle: [styles.mukilteoPlainCell, index === 2 && styles.mukilteoPlainCellLast],
                  })
                )}
              </View>
              <View style={styles.mukilteoHRow}>
                {renderTablePill(4, 'muk-zone1-4', { width: 62, height: 136, borderRadius: 16 })}
                {renderTablePill(3, 'muk-zone1-3', { width: 62, height: 136, borderRadius: 16 })}
                {renderTablePill(2, 'muk-zone1-2', { width: 62, height: 136, borderRadius: 16 })}
                {renderTablePill(1, 'muk-zone1-1', { width: 62, height: 136, borderRadius: 16 })}
              </View>
              <View style={styles.mukilteoTenLane}>
                {renderTablePill(10, 'muk-zone1-10', { width: 250, height: 62, borderRadius: 14 })}
              </View>
            </View>
            {renderTablePill(70, 'muk-event-space', {
              width: 155,
              height: 300,
              borderRadius: 14,
              displayLabel: 'Event Space',
              containerStyle: styles.mukilteoEventSpaceBox,
            })}
          </View>
        </View>
      </View>
    </View>
  );

  const renderMillCreekLayout = () => (
    <View
      style={styles.poeLayoutBox}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - availableWidth) > 1) {
          setAvailableWidth(nextWidth);
        }
      }}
    >
      <View style={[styles.poeScaledFrame, { width: millCreekScaledWidth, height: millCreekScaledHeight }]}>
        <View
          style={[
            styles.millCreekBlock,
            {
              left: 44 * millCreekScale,
              top: 28 * millCreekScale,
              width: 460 * millCreekScale,
              height: 96 * millCreekScale,
            },
          ]}
        />

        {MILL_CREEK_TABLE_LAYOUT.map(layout => {
          const table = tableByNumber.get(layout.tableNumber);
          if (!table) return null;
          return (
            <View
              key={layout.key}
              style={[
                styles.poeAbs,
                {
                  left: layout.left * millCreekScale,
                  top: layout.top * millCreekScale,
                },
              ]}
            >
              <SelectorPill
                label={getTableDisplayLabel(restaurantId, table.tableNumber)}
                isSelected={selectedTableIds.includes(table.id)}
                onPress={() => onToggleTable(table.id)}
                width={layout.width * millCreekScale}
                height={layout.height * millCreekScale}
                borderRadius={layout.borderRadius ? layout.borderRadius * millCreekScale : undefined}
              />
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.selectorScroll} contentContainerStyle={styles.selectorScrollContent} scrollEnabled={false}>
      {restaurantId === 'everett'
        ? renderPoeLayout()
        : isMillCreek
          ? renderMillCreekLayout()
        : restaurantId === 'mukilteo'
          ? renderMukilteoLayout()
          : renderDefaultLayout()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  selectorPill: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: uiTheme.colors.border,
    ...uiTheme.shadow.soft,
  },
  selectorPillSelected: {
    backgroundColor: STATUS_COLOR_TOKENS.blue.backgroundColor,
    borderColor: STATUS_COLOR_TOKENS.blue.borderColor,
    borderWidth: 3,
    ...uiTheme.shadow.focus,
  },
  selectorPillText: {
    fontWeight: '700',
    color: uiTheme.colors.ink,
    textAlign: 'center',
  },
  selectorScroll: {
    maxHeight: 340,
  },
  selectorScrollContent: {
    paddingBottom: 4,
    alignItems: 'center',
  },
  layoutBox: {
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  rowLast: {
    marginBottom: 0,
  },
  cell: {
    marginRight: 10,
  },
  cellLast: {
    marginRight: 0,
  },
  placeholder: {
    width: 55,
    height: 55,
    marginRight: 10,
  },
  column: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    padding: 12,
    ...uiTheme.shadow.soft,
  },
  columnGap: {
    marginRight: 12,
  },
  customCell: {
    position: 'absolute',
  },
  poeLayoutBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: POE_SELECTOR_MAX_HEIGHT,
  },
  poeScaledFrame: {
    position: 'relative',
    overflow: 'hidden',
  },
  poeAbs: {
    position: 'absolute',
  },
  poeMergedBar: {
    borderWidth: 1.5,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    ...uiTheme.shadow.soft,
  },
  poeMergedBarSelected: {
    backgroundColor: STATUS_COLOR_TOKENS.blue.backgroundColor,
    borderColor: STATUS_COLOR_TOKENS.blue.borderColor,
    borderWidth: 3,
    ...uiTheme.shadow.focus,
  },
  poeMergedBarText: {
    fontWeight: '700',
    color: uiTheme.colors.ink,
    textAlign: 'center',
  },
  poeBarTouchZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  millCreekBlock: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: uiTheme.colors.borderStrong,
    backgroundColor: uiTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: uiTheme.colors.inkSoft,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  groupStack: {
    gap: 12,
  },
  singleBubble: {
    paddingHorizontal: 8,
    paddingVertical: 10,
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
  mukilteoPlainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mukilteoPlainCell: {
    marginRight: 10,
  },
  mukilteoPatioWalkway: {
    marginRight: 72,
  },
  mukilteoPlainCellLast: {
    marginRight: 0,
  },
  mukilteoFloorShift: {
    transform: [{ translateX: 15 }],
  },
  mukilteoSixSlot: {
    width: 80,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 26,
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
  mukilteoH5Align: {
    transform: [{ translateY: -15 }, { translateX: -27 }],
  },
  mukilteo3134TopCell: {
    marginBottom: 16,
  },
  mukilteo3134Cell: {
    marginBottom: 16,
  },
  mukilteoTopLeftBooth: {
    transform: [{ translateY: 22 }, { translateX: -27 }],
  },
  mukilteoTopRightBooth: {
    transform: [{ translateY: 20 }],
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
  mukilteoThirtyRaised: {
    marginBottom: 8,
  },
  mukilteoTenLane: {
    width: 274,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mukilteoEventSpaceBox: {
    width: 160,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
