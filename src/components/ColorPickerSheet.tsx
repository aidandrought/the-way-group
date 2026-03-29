import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StatusColor } from '../types';
import { BottomSheet } from './BottomSheet';

const PICKER_SWATCHES: Record<StatusColor, { fill: string; border: string }> = {
  blue: { fill: '#7EBBDD', border: '#4A81B8' },
  green: { fill: '#92CD95', border: '#53885C' },
  purple: { fill: '#AD8CD3', border: '#674E88' },
  orange: { fill: '#EBB577', border: '#AD6F36' },
  yellow: { fill: '#F2D45C', border: '#C6A12C' },
};

const OPTIONS: Array<{
  color: StatusColor;
  label: string;
  description: string;
}> = [
  {
    color: 'blue',
    label: 'Blue',
    description: 'Default',
  },
  {
    color: 'green',
    label: 'Green',
    description: 'Turnover/Buss',
  },
  {
    color: 'purple',
    label: 'Purple',
    description: 'Reserved',
  },
  {
    color: 'orange',
    label: 'Orange',
    description: 'Leaving Soon',
  },
  {
    color: 'yellow',
    label: 'Yellow',
    description: 'Seating Soon',
  },
];

interface ColorPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (color: StatusColor) => void;
  title: string;
  selectedColor?: StatusColor | null;
}

export function ColorPickerSheet({ isOpen, onClose, onSelect, title, selectedColor }: ColorPickerSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      sheetStyle={styles.sheet}
      contentStyle={styles.sheetContent}
    >
      <Text style={styles.title}>{title}</Text>
      {OPTIONS.map(option => (
        <TouchableOpacity
          key={option.color}
          style={[
            styles.option,
            selectedColor === option.color && styles.optionSelected,
          ]}
          onPress={() => onSelect(option.color)}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor: PICKER_SWATCHES[option.color].fill,
                borderColor: PICKER_SWATCHES[option.color].border,
              },
            ]}
          />
          <View style={styles.optionText}>
            <Text style={styles.label}>{option.label}</Text>
            <Text style={styles.description}>{option.description}</Text>
          </View>
          {selectedColor === option.color && (
            <View style={styles.checkWrap}>
              <Feather name="check" size={18} color="#2563EB" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 18,
  },
  sheet: {
    width: '100%',
    maxHeight: 420,
  },
  sheetContent: {
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 4,
  },
  optionSelected: {
    backgroundColor: 'transparent',
  },
  dot: {
    width: 42,
    height: 42,
    borderRadius: 999,
    marginRight: 14,
    borderWidth: 3,
  },
  optionText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
  },
  description: {
    fontSize: 11,
    fontWeight: '500',
    color: '#737373',
    marginTop: 1,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
