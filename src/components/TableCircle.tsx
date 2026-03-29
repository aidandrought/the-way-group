import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getStatusSurface, STATUS_COLOR_TOKENS, uiTheme } from '../constants/uiTheme';
import { Check, StatusColor, Table } from '../types';

interface TableCircleProps {
  table: Table;
  onPress: () => void;
  onLongPress?: () => void;
  checks: Check[];
  compact?: boolean;
  size?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
  maxVisibleChecks?: number;
  isSelected?: boolean;
  displayLabel?: string;
  counterRotateContent?: boolean;
  compactCheckTextSize?: number;
  compactCheckLineHeight?: number;
  showStatusStyle?: boolean;
  compactLabelFontSize?: number;
  compactLabelLineHeight?: number;
  singleLineLabel?: boolean;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const getStatusStyle = (status: StatusColor | undefined, assigned: boolean) => {
  const surface = getStatusSurface(status, assigned);
  return {
    backgroundColor: surface.backgroundColor,
    borderColor: surface.borderColor,
  };
};

export function TableCircle({
  table,
  onPress,
  onLongPress,
  checks,
  compact = false,
  size,
  width,
  height,
  borderRadius,
  maxVisibleChecks,
  isSelected = false,
  displayLabel,
  counterRotateContent = false,
  compactCheckTextSize,
  compactCheckLineHeight,
  showStatusStyle = true,
  compactLabelFontSize,
  compactLabelLineHeight,
  singleLineLabel = false,
}: TableCircleProps) {
  const assignedChecks = checks.filter(check => check.tableId === table.id);
  const isAssigned = assignedChecks.length > 0;
  const sortedChecks = [...assignedChecks].sort((a, b) => a.checkNumber - b.checkNumber);
  const hasSingleDigit = assignedChecks.some(check => check.checkNumber < 10);
  const hasDoubleDigit = assignedChecks.some(check => check.checkNumber >= 10);
  const derivedTableColor = table.color ?? (assignedChecks.length === 1 ? assignedChecks[0].color : undefined);
  const showSeatingSoonBadge = derivedTableColor === 'yellow';

  const baseSize = size ?? (compact ? 55 : 70);
  const controlWidth = width ?? baseSize;
  const controlHeight = height ?? baseSize;
  const controlRadius = borderRadius ?? Math.max(14, Math.min(controlWidth, controlHeight) * 0.22);
  const controlMinDimension = Math.min(controlWidth, controlHeight);
  const isTallNarrowCard = controlHeight >= 120 && controlWidth <= 90;
  const isCompactSquareCard = controlWidth <= 110 && controlHeight <= 110;
  const normalizedDisplayLabel =
    typeof displayLabel === 'string' && /^[A-Z]\s+\d+$/i.test(displayLabel)
      ? displayLabel.replace(/\s+/g, '')
      : displayLabel;
  const defaultMaxVisible = hasDoubleDigit ? (hasSingleDigit ? 4 : 3) : 5;
  const requestedMaxVisible = maxVisibleChecks ?? defaultMaxVisible;
  const effectiveRequestedMaxVisible = isTallNarrowCard
    ? Math.max(4, requestedMaxVisible)
    : requestedMaxVisible;
  const sizeCappedMaxVisible =
    isTallNarrowCard
      ? effectiveRequestedMaxVisible
      : controlMinDimension <= 62
      ? 3
      : controlMinDimension <= 76
        ? 4
        : controlMinDimension <= 108
          ? 6
          : effectiveRequestedMaxVisible;
  const maxVisible = Math.min(effectiveRequestedMaxVisible, sizeCappedMaxVisible);
  const visibleChecks = sortedChecks.slice(0, maxVisible);
  const hasOverflow = sortedChecks.length > maxVisible;
  const useCompactText = compact || Math.min(controlWidth, controlHeight) <= 55;
  const usesCustomLabel = !!normalizedDisplayLabel;
  const shouldForceSingleLineLabel =
    singleLineLabel || (usesCustomLabel && !String(normalizedDisplayLabel).includes(' '));
  const checkSummaryLines = isTallNarrowCard ? 3 : 2;
  const statusStyle = showStatusStyle
    ? getStatusStyle(derivedTableColor, isAssigned)
    : getStatusStyle(undefined, false);
  const tone = getStatusSurface(derivedTableColor, isAssigned);
  const compactCheckStyle =
    compactCheckTextSize != null || compactCheckLineHeight != null
      ? {
          fontSize: compactCheckTextSize ?? styles.checkSummaryCompact.fontSize,
          lineHeight: compactCheckLineHeight ?? styles.checkSummaryCompact.lineHeight,
        }
      : null;
  const compactLabelStyle =
    compactLabelFontSize != null || compactLabelLineHeight != null
      ? {
          fontSize: compactLabelFontSize ?? styles.numberLabelCompact.fontSize,
          lineHeight: compactLabelLineHeight ?? styles.numberLabelCompact.lineHeight,
        }
      : null;
  const shouldUseGridSummary = (isTallNarrowCard || controlWidth <= 96) && visibleChecks.length > 1;
  const checksLabel = visibleChecks.length > 0
    ? shouldUseGridSummary
      ? chunk(
          visibleChecks.map((check, index) => {
            const isLastVisible = index === visibleChecks.length - 1;
            return hasOverflow && isLastVisible ? `${check.checkNumber}...` : `${check.checkNumber}`;
          }),
          2
        )
          .map((row, rowIndex) => `${rowIndex === 0 ? '#' : ''}${row.join(', ')}`)
          .join('\n')
      : `#${visibleChecks.map((check, index) => {
          const isLastVisible = index === visibleChecks.length - 1;
          return hasOverflow && isLastVisible ? `${check.checkNumber}...` : `${check.checkNumber}`;
        }).join(', ')}`
    : '';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={250}
        activeOpacity={0.92}
        style={[
          styles.circle,
          { width: controlWidth, height: controlHeight, borderRadius: controlRadius },
          statusStyle,
          isSelected && styles.circleSelected,
        ]}
      >
        {showSeatingSoonBadge && (
          <View style={styles.seatingSoonBadge}>
            <Text style={styles.seatingSoonBadgeText}>Seating Soon</Text>
          </View>
        )}
        <View style={counterRotateContent && styles.contentCounterRotated}>
          <Text
            style={[
              styles.number,
              { color: tone.textColor },
              useCompactText && styles.numberCompact,
              usesCustomLabel && styles.numberLabel,
              usesCustomLabel && useCompactText && styles.numberLabelCompact,
              usesCustomLabel && useCompactText && compactLabelStyle,
            ]}
            numberOfLines={shouldForceSingleLineLabel ? 1 : 2}
          >
            {normalizedDisplayLabel ?? table.tableNumber}
          </Text>
          {visibleChecks.length > 0 && (
            <Text
              style={[
                styles.checkSummary,
                {
                  color: tone.textColor,
                  maxWidth: Math.max(28, controlWidth - (isCompactSquareCard ? 10 : 18)),
                },
                useCompactText && styles.checkSummaryCompact,
                isCompactSquareCard && styles.checkSummarySquareCompact,
                useCompactText && compactCheckStyle,
              ]}
              numberOfLines={checkSummaryLines}
            >
              {checksLabel}
            </Text>
          )}
        </View>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...uiTheme.shadow.card,
    borderWidth: 1.5,
  },
  circleSelected: {
    borderWidth: 2,
    borderColor: '#111827',
    ...uiTheme.shadow.focus,
  },
  number: {
    fontSize: 22,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    textAlign: 'center',
    lineHeight: 24,
  },
  numberCompact: {
    fontSize: 16,
    lineHeight: 18,
  },
  numberLabel: {
    fontSize: 20,
    lineHeight: 22,
    paddingHorizontal: 4,
    color: uiTheme.colors.ink,
  },
  numberLabelCompact: {
    fontSize: 20,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  checkSummary: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    alignSelf: 'center',
    opacity: 0.82,
    fontWeight: '500',
  },
  checkSummaryCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  checkSummarySquareCompact: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.1,
  },
  contentCounterRotated: {
    transform: [{ rotate: '180deg' }],
  },
  seatingSoonBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: uiTheme.radius.pill,
    backgroundColor: '#FACC15',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  seatingSoonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
});
