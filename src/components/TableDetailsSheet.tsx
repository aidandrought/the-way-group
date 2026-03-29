import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { getTableDisplayLabel } from '../constants/tableLabels';
import { STATUS_COLOR_TOKENS, uiTheme } from '../constants/uiTheme';
import { useApp } from '../contexts/AppContext';
import { Check, StatusColor, Table } from '../types';
import { ColorPickerSheet } from './ColorPickerSheet';

interface TableDetailsSheetProps {
  table: Table;
  onClose: () => void;
}

export function TableDetailsSheet({ table, onClose }: TableDetailsSheetProps) {
  const { width, height } = useWindowDimensions();
  const {
    state,
    assignCheckToTable,
    clearCheck,
    clearTable,
    setCheckColor,
    restaurantId,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [colorCheck, setColorCheck] = useState<Check | null>(null);
  const [moveWarningCheck, setMoveWarningCheck] = useState<Check | null>(null);

  const checksSorted = useMemo(
    () => [...state.checks].sort((a, b) => a.checkNumber - b.checkNumber),
    [state.checks]
  );

  const assignedChecks = useMemo(
    () => state.checks.filter(check => check.tableId === table.id),
    [state.checks, table.id]
  );
  const isTabletLayout = Math.min(width, height) >= 768;
  const hasTableHighlight = !!table.color;
  const canClearTable = assignedChecks.length > 0 || hasTableHighlight;

  const handleCheckLongPress = (check: Check) => {
    setColorCheck(check);
  };

  const handleSingleAssign = async (check: Check) => {
    if (check.tableId === table.id) {
      await clearCheck(check.id);
      return;
    }

    if (check.tableId && check.tableId !== table.id) {
      setMoveWarningCheck(check);
      return;
    }

    await assignCheckToTable(check.id, table.id);
  };

  const handleConfirmMove = async () => {
    if (!moveWarningCheck) return;
    await assignCheckToTable(moveWarningCheck.id, table.id);
    setMoveWarningCheck(null);
  };

  const handleClearTable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearTable(table.id);
    } finally {
      setBusy(false);
    }
  };

  const currentAssignedTable = moveWarningCheck?.tableId
    ? state.tables.find(currentTable => currentTable.id === moveWarningCheck.tableId) ?? null
    : null;

  if (moveWarningCheck && currentAssignedTable) {
    return (
      <>
        <View style={styles.warningContainer}>
          <Text style={styles.title}>Move Check?</Text>
          <Text style={styles.message}>
            This check is already assigned to table {getTableDisplayLabel(restaurantId, currentAssignedTable.tableNumber)}. Are you
            sure you want to move it to table {getTableDisplayLabel(restaurantId, table.tableNumber)}?
          </Text>
          <View style={styles.warningButtonRow}>
            <Pressable onPress={() => setMoveWarningCheck(null)} style={[styles.warningButton, styles.cancelButton]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirmMove} style={[styles.warningButton, styles.confirmButton]}>
              <Text style={styles.confirmText}>Move</Text>
            </Pressable>
          </View>
        </View>
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
      </>
    );
  }

  return (
    <>
      <View>
      <View style={styles.header}>
        <Text style={styles.title}>{getTableDisplayLabel(restaurantId, table.tableNumber)}</Text>
        <View style={[styles.headerButtons, isTabletLayout && styles.headerButtonsTablet]}>
          {canClearTable && (
            <>
              <Pressable onPress={onClose} style={[styles.okButton, isTabletLayout && styles.okButtonTablet]}>
                <Text style={[styles.okText, isTabletLayout && styles.okTextTablet]}>OK</Text>
              </Pressable>
              <Pressable
                onPress={handleClearTable}
                style={[styles.clearTableButton, busy && styles.clearTableButtonDisabled]}
              >
                <Text style={styles.clearTableText}>{busy ? 'Clearing...' : 'Clear Table'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      

      <ScrollView style={styles.checksGrid}>
        <View style={styles.grid}>
          {checksSorted.map(check => (
            <Pressable
              key={check.id}
              onPress={async () => {
                await handleSingleAssign(check);
              }}
              onLongPress={() => handleCheckLongPress(check)}
              delayLongPress={350}
              style={[
                styles.checkButton,
                check.tableId === table.id && styles.checkAssignedHere,
                check.tableId && check.tableId !== table.id && styles.checkAssignedElsewhere,
              ]}
            >
              <Text
                style={[
                  styles.checkNumber,
                ]}
              >
                {check.checkNumber}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  warningContainer: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButtonsTablet: {
    gap: 72,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: uiTheme.colors.inkSoft,
    textAlign: 'center',
  },
  warningButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  warningButton: {
    minWidth: 104,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: uiTheme.colors.surfaceRaised,
  },
  okButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: uiTheme.colors.success,
    borderRadius: uiTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonTablet: {
    minWidth: 132,
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  okText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#21432A',
  },
  okTextTablet: {
    fontSize: 18,
  },
  clearTableButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: uiTheme.colors.dangerSurface,
    borderRadius: uiTheme.radius.md,
    borderWidth: 1,
    borderColor: uiTheme.colors.dangerBorder,
  },
  clearTableButtonDisabled: {
    opacity: 0.6,
  },
  clearTableText: {
    fontSize: 14,
    fontWeight: '800',
    color: uiTheme.colors.dangerText,
  },
  checksGrid: {
    maxHeight: 400,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    ...uiTheme.shadow.soft,
  },
  checkAssignedHere: {
    borderColor: '#183A5B',
    backgroundColor: STATUS_COLOR_TOKENS.blue.backgroundColor,
    borderWidth: 2,
    shadowColor: '#183A5B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 34,
    elevation: 18,
  },
  checkAssignedElsewhere: {
    borderColor: STATUS_COLOR_TOKENS.blue.borderColor,
    backgroundColor: STATUS_COLOR_TOKENS.blue.backgroundColor,
    borderWidth: 2,
  },
  checkNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
});
