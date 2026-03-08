import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { FoodItem } from '../types';
import { getExpiryStatus, getExpiryLabel, formatDateSwedish } from '../utils/dateUtils';
import { shareItem } from '../services/sharing';
import { DatePickerModal } from './DatePickerModal';
import { Colors, StatusColors, FontSizes, Radius, Spacing } from '../theme';

interface ItemDetailModalProps {
  item: FoodItem | null;
  visible: boolean;
  onClose: () => void;
  onDateSet: (item: FoodItem, date: Date) => void;
  onDelete: (item: FoodItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  visible,
  onClose,
  onDateSet,
  onDelete,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!item) return null;

  const status = getExpiryStatus(item.bestBeforeDate);
  const statusColor = StatusColors[status];

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    await shareItem(item);
  };

  const handleDelete = () => {
    Alert.alert(
      'Ta bort vara',
      `Är du säker på att du vill ta bort "${item.name}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: () => {
            onDelete(item);
            onClose();
          },
        },
      ]
    );
  };

  const handleDateConfirm = (date: Date) => {
    setShowDatePicker(false);
    onDateSet(item, date);
  };

  return (
    <>
      <Modal
        visible={visible && !showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholderBox}>
                    <Text style={styles.imagePlaceholder}>📦</Text>
                  </View>
                )}

                <View style={styles.headerText}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.brand ? (
                    <Text style={styles.brand}>{item.brand}</Text>
                  ) : null}
                </View>
              </View>

              {/* Status Banner */}
              <View style={[styles.statusBanner, { backgroundColor: statusColor + '22', borderColor: statusColor + '44' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getExpiryLabel(item.bestBeforeDate)}
                </Text>
                {item.bestBeforeDate ? (
                  <Text style={[styles.statusDate, { color: statusColor + 'aa' }]}>
                    {formatDateSwedish(item.bestBeforeDate)}
                  </Text>
                ) : null}
              </View>

              {/* Details */}
              <View style={styles.details}>
                <DetailRow label="Streckkod" value={item.barcode} mono />
                <DetailRow
                  label="Tillagd"
                  value={formatDateSwedish(item.addedAt)}
                />
                {item.categories ? (
                  <DetailRow label="Kategori" value={item.categories} />
                ) : null}
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.actionBtnIcon}>📅</Text>
                  <Text style={styles.actionBtnText}>
                    {item.bestBeforeDate ? 'Ändra datum' : 'Sätt datum'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleShare}
                >
                  <Text style={styles.actionBtnIcon}>📤</Text>
                  <Text style={styles.actionBtnText}>Dela</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={handleDelete}
                >
                  <Text style={styles.actionBtnIcon}>🗑</Text>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
                    Ta bort
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={item.bestBeforeDate ? new Date(item.bestBeforeDate) : null}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />
    </>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
}> = ({ label, value, mono }) => (
  <View style={detailStyles.row}>
    <Text style={detailStyles.label}>{label}</Text>
    <Text style={[detailStyles.value, mono && detailStyles.mono]}>{value}</Text>
  </View>
);

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
    color: Colors.textMuted,
  },
});

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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardBorder,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
  },
  imagePlaceholderBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  imagePlaceholder: {
    fontSize: 36,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  brand: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  statusBanner: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 4,
  },
  statusText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  statusDate: {
    fontSize: FontSizes.sm,
  },
  details: {
    marginBottom: Spacing.md,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  actionBtnDanger: {
    borderColor: Colors.statusCritical + '44',
    backgroundColor: Colors.statusCritical + '11',
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  actionBtnTextDanger: {
    color: Colors.statusCritical,
  },
});
