import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Check, StatusColor, Table } from '../types';
import { ColorPickerSheet } from './ColorPickerSheet';

interface TableDetailsSheetProps {
  table: Table;
  onClose: () => void;
}

export function TableDetailsSheet({ table, onClose }: TableDetailsSheetProps) {
  const {
    state,
    assignCheckToTable,
    clearCheck,
    clearTable,
    setCheckColor,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [colorCheck, setColorCheck] = useState<Check | null>(null);

  const checksSorted = useMemo(
    () => [...state.checks].sort((a, b) => a.checkNumber - b.checkNumber),
    [state.checks]
  );

  const assignedChecks = useMemo(
    () => state.checks.filter(check => check.tableId === table.id),
    [state.checks, table.id]
  );

  const getStatusStyle = (status: StatusColor | undefined) => {
    if (status === 'green') {
      return {
        backgroundColor: '#7ECF8F',
        borderColor: '#3B8B56',
        borderWidth: 3,
      };
    }
    if (status === 'purple') {
      return {
        backgroundColor: '#B58AD9',
        borderColor: '#6F4C8F',
        borderWidth: 3,
      };
    }
    if (status === 'blue') {
      return {
        backgroundColor: '#68BFE1',
        borderColor: '#155A75',
        borderWidth: 3,
      };
    }
    return undefined;
  };

  const handleCheckLongPress = (check: Check) => {
    setColorCheck(check);
  };

  const handleSingleAssign = async (check: Check) => {
    if (check.tableId === table.id) {
      await clearCheck(check.id);
      return true;
    }

    await assignCheckToTable(check.id, table.id);
    return true;
  };

  const handleClearTable = async () => {
    if (busy) return;
    setBusy(true);
    await clearTable(table.id);
    setBusy(false);
    onClose();
  };

  return (
    <>
      <View>
      <View style={styles.header}>
        <Text style={styles.title}>Table {table.tableNumber}</Text>
        <View style={styles.headerButtons}>
          {assignedChecks.length > 0 && (
            <>
              <Pressable onPress={onClose} style={styles.okButton}>
                <Text style={styles.okText}>OK</Text>
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
                const shouldClose = await handleSingleAssign(check);
                if (shouldClose) {
                  onClose();
                }
              }}
              onLongPress={() => handleCheckLongPress(check)}
              delayLongPress={350}
              style={[
                styles.checkButton,
                check.color && getStatusStyle(check.color),
                !check.color && check.tableId === table.id && styles.checkAssignedHere,
                !check.color && check.tableId && check.tableId !== table.id && styles.checkAssignedElsewhere,
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  okButton: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  okText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  clearTableButton: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f44336',
    borderRadius: 6,
  },
  clearTableButtonDisabled: {
    opacity: 0.6,
  },
  clearTableText: {
    fontSize: 14,
    color: 'white',
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
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkAssignedHere: {
    borderColor: '#155A75',
    backgroundColor: '#6FC7E7',
    borderWidth: 1.8,
    shadowColor: '#155A75',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  checkAssignedElsewhere: {
    borderWidth: 1.8,
    borderColor: '#26657e',
    backgroundColor: '#68BFE1',
  },
  checkNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
