import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { getStatusSurface, uiTheme } from '../constants/uiTheme';
import { Check, StatusColor } from '../types';

interface CheckCircleProps {
  check: Check;
  tableNumber?: number;
  tableLabel?: string;
  tableColor?: StatusColor;
  onPress: () => void;
  onLongPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

const getStatusStyle = (status: StatusColor | undefined, assigned: boolean) => {
  const surface = getStatusSurface(status, assigned);
  return {
    backgroundColor: surface.backgroundColor,
    borderColor: surface.borderColor,
    borderWidth: 1,
  };
};

export function CheckCircle({
  check,
  tableNumber,
  tableLabel,
  tableColor,
  onPress,
  onLongPress,
  containerStyle,
}: CheckCircleProps) {
  const effectiveColor = check.tableId ? (tableColor ?? check.color) : undefined;
  const statusStyle = getStatusStyle(effectiveColor, !!check.tableId);
  const tone = getStatusSurface(effectiveColor, !!check.tableId);
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      activeOpacity={0.92}
      style={[
        styles.card,
        statusStyle,
        containerStyle,
      ]}
    >
      <Text style={[styles.number, { color: tone.textColor }]}>{check.checkNumber}</Text>
      {check.tableId && (tableLabel || tableNumber !== undefined) && (
        <Text style={[styles.tableLabel, { color: tone.textColor }]}>{tableLabel ?? `Table: ${tableNumber}`}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 86,
    borderRadius: uiTheme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...uiTheme.shadow.card,
    borderWidth: 1,
  },
  number: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    color: uiTheme.colors.ink,
  },
  tableLabel: {
    fontSize: 12,
    color: uiTheme.colors.inkSoft,
    marginTop: 7,
    fontWeight: '500',
    opacity: 0.82,
  },
});
