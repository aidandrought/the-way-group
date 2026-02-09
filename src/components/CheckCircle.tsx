import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Check, StatusColor } from '../types';

interface CheckCircleProps {
  check: Check;
  tableNumber?: number;
  tableColor?: StatusColor;
  onPress: () => void;
  onLongPress?: () => void;
}

const getStatusStyle = (status: StatusColor | undefined, assigned: boolean) => {
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
  return assigned
    ? { backgroundColor: '#68BFE1', borderColor: '#155A75', borderWidth: 3 }
    : { backgroundColor: 'white', borderColor: '#e0e0e0' };
};

export function CheckCircle({ check, tableNumber, tableColor, onPress, onLongPress }: CheckCircleProps) {
  const effectiveColor = check.tableId ? (tableColor ?? check.color) : undefined;
  const statusStyle = getStatusStyle(effectiveColor, !!check.tableId);
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      style={[
        styles.circle,
        statusStyle,
      ]}
    >
      <Text style={styles.number}>{check.checkNumber}</Text>
      {check.tableId && tableNumber !== undefined && (
        <Text style={styles.tableLabel}>Table: {tableNumber}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
  },
  number: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tableLabel: {
    fontSize: 10,
    color: '#1A1A1A',
    marginTop: 2,
  },
});
