import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, FontSizes, Radius, Spacing } from '../theme';
import { formatDateSwedish } from '../utils/dateUtils';

interface DatePickerModalProps {
  visible: boolean;
  currentDate: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  currentDate,
  onConfirm,
  onCancel,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(
    currentDate ?? new Date()
  );

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      // On Android, the picker auto-dismisses on selection
      if (Platform.OS === 'android') {
        onConfirm(date);
      }
    } else if (Platform.OS === 'android') {
      onCancel();
    }
  };

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display="default"
        onChange={handleChange}
        minimumDate={new Date(2020, 0, 1)}
        maximumDate={new Date(2030, 11, 31)}
      />
    );
  }

  // iOS modal
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelBtn}>Avbryt</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Välj bäst-före datum</Text>
            <TouchableOpacity onPress={() => onConfirm(selectedDate)}>
              <Text style={styles.confirmBtn}>Klar</Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={handleChange}
            locale="sv-SE"
            style={styles.picker}
            textColor={Colors.textPrimary}
          />

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Valt datum</Text>
            <Text style={styles.previewDate}>{formatDateSwedish(selectedDate.toISOString())}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  cancelBtn: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  confirmBtn: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  picker: {
    backgroundColor: Colors.surface,
  },
  preview: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  previewDate: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: 4,
  },
});
