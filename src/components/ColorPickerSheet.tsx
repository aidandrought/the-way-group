import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StatusColor } from '../types';
import { BottomSheet } from './BottomSheet';

const OPTIONS: Array<{
  color: StatusColor;
  label: string;
  description: string;
  swatch: string;
  border: string;
}> = [
  {
    color: 'blue',
    label: 'Blue',
    description: 'Default',
    swatch: '#68BFE1',
    border: '#2e86bd',
  },
  {
    color: 'green',
    label: 'Green',
    description: 'Closing/Turnover',
    swatch: '#7ECF8F',
    border: '#3B8B56',
  },
  {
    color: 'purple',
    label: 'Purple',
    description: 'Needs special attention',
    swatch: '#B58AD9',
    border: '#6F4C8F',
  },
];

interface ColorPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (color: StatusColor) => void;
  title: string;
}

export function ColorPickerSheet({ isOpen, onClose, onSelect, title }: ColorPickerSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      {OPTIONS.map(option => (
        <TouchableOpacity
          key={option.color}
          style={styles.option}
          onPress={() => onSelect(option.color)}
        >
          <View
            style={[
              styles.swatch,
              { backgroundColor: option.swatch, borderColor: option.border },
            ]}
          />
          <View style={styles.optionText}>
            <Text style={styles.label}>{option.label}</Text>
            <Text style={styles.description}>{option.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
