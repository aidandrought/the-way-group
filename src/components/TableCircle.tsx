import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, StatusColor, Table } from '../types';

interface TableCircleProps {
  table: Table;
  onPress: () => void;
  onLongPress?: () => void;
  checks: Check[];
  compact?: boolean;
  size?: number;
  isSelected?: boolean;
}

const getStatusStyle = (status: StatusColor | undefined, assigned: boolean) => {
  if (status === 'green') {
    return {
      backgroundColor: '#7ECF8F',
      borderColor: '#3B8B56',
    };
  }
  if (status === 'purple') {
    return {
      backgroundColor: '#B58AD9',
      borderColor: '#6F4C8F',
    };
  }
  return assigned
    ? { backgroundColor: '#68BFE1', borderColor: '#2F7EA1' }
    : { backgroundColor: 'white', borderColor: '#e0e0e0' };
};

const getBadgeGlowColor = (status: StatusColor | undefined) => {
  if (status === 'green') return '#7ECF8F';
  if (status === 'purple') return '#B58AD9';
  return '#68BFE1';
};

export function TableCircle({ table, onPress, onLongPress, checks, compact = false, size, isSelected = false }: TableCircleProps) {
  const assignedChecks = checks.filter(check => check.tableId === table.id);
  const isAssigned = assignedChecks.length > 0;
  const sortedChecks = [...assignedChecks].sort((a, b) => a.checkNumber - b.checkNumber);
  const hasSingleDigit = assignedChecks.some(check => check.checkNumber < 10);
  const hasDoubleDigit = assignedChecks.some(check => check.checkNumber >= 10);
  const maxVisible = hasDoubleDigit ? (hasSingleDigit ? 4 : 3) : 5;
  const visibleChecks = sortedChecks.slice(0, maxVisible);
  const hasOverflow = sortedChecks.length > maxVisible;
  const derivedTableColor = isAssigned
    ? (table.color ?? (assignedChecks.length === 1 ? assignedChecks[0].color : undefined))
    : undefined;

  const circleSize = size ?? (compact ? 55 : 70);
  const useCompactText = compact || circleSize <= 55;
  const statusStyle = getStatusStyle(derivedTableColor, isAssigned);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={250}
        style={[
          styles.circle,
          { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
          statusStyle,
          isSelected && styles.circleSelected,
        ]}
      >
        <Text style={[styles.number, useCompactText && styles.numberCompact]}>
          {table.tableNumber}
        </Text>
        {visibleChecks.length > 0 && (
          <View style={[styles.checkList, useCompactText && styles.checkListCompact]}>
            {visibleChecks.map((check, index) => {
              const showHash = index === 0;
              const numberLabel = `${check.checkNumber}`;
              const badgeColor = getBadgeGlowColor(check.color);
              const showBadge =
                assignedChecks.length > 1 &&
                !!check.color &&
                check.color !== derivedTableColor;
              const badgeSize = useCompactText ? 10 : 12;
              return (
                <View key={check.id} style={styles.checkToken}>
                  {showHash && (
                    <Text style={[styles.checkText, useCompactText && styles.checkTextCompact]}>#</Text>
                  )}
                  <View style={styles.numberWrap}>
                    {showBadge && (
                      <View
                        style={[
                          styles.badgeCircle,
                          {
                            width: badgeSize,
                            height: badgeSize,
                            borderRadius: badgeSize / 2,
                            backgroundColor: badgeColor,
                            transform: [{ translateX: -badgeSize / 2 }, { translateY: -badgeSize / 2 }],
                          },
                        ]}
                      />
                    )}
                    <Text style={[styles.checkText, useCompactText && styles.checkTextCompact]}>
                      {numberLabel}
                    </Text>
                  </View>
                  {index < visibleChecks.length - 1 && (
                    <Text style={[styles.checkText, useCompactText && styles.checkTextCompact]}>, </Text>
                  )}
                </View>
              );
            })}
            {hasOverflow && (
              <Text style={[styles.checkText, useCompactText && styles.checkTextCompact]}>...</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
  },
  circleSelected: {
    borderWidth: 3,
    borderColor: '#2F7EA1',
    backgroundColor: '#5BB3D6',
  },
  number: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  numberCompact: {
    fontSize: 14,
  },
  checkList: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '90%',
  },
  checkListCompact: {
    maxWidth: '92%',
  },
  checkText: {
    fontSize: 10,
    color: '#1A1A1A',
    lineHeight: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  checkTextCompact: {
    fontSize: 9,
    lineHeight: 14,
  },
  checkToken: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberWrap: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
});
