import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { FoodItem, ExpiryStatus } from '../types';
import { getExpiryStatus, getExpiryLabel } from '../utils/dateUtils';
import { Colors, StatusColors, FontSizes, Radius, Spacing } from '../theme';

interface FoodItemCardProps {
  item: FoodItem;
  onPress: () => void;
  onLongPress?: () => void;
}

const STATUS_ICONS: Record<ExpiryStatus, string> = {
  ok: '✓',
  warning: '⚠',
  critical: '!',
  expired: '✕',
  unknown: '?',
};

export const FoodItemCard: React.FC<FoodItemCardProps> = ({
  item,
  onPress,
  onLongPress,
}) => {
  const status = getExpiryStatus(item.bestBeforeDate);
  const statusColor = StatusColors[status];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusColor }]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Left accent line is handled by borderLeft */}

        <View style={styles.content}>
          {/* Left: image or placeholder */}
          <View style={[styles.imageContainer, { borderColor: statusColor + '44' }]}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.imagePlaceholder}>📦</Text>
            )}
          </View>

          {/* Center: name + brand + barcode */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            {item.brand ? (
              <Text style={styles.brand} numberOfLines={1}>
                {item.brand}
              </Text>
            ) : null}
            <Text style={styles.barcode}>{item.barcode}</Text>
          </View>

          {/* Right: status badge */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
              <Text style={[styles.statusIcon, { color: statusColor }]}>
                {STATUS_ICONS[status]}
              </Text>
            </View>
            <Text style={[styles.expiryLabel, { color: statusColor }]} numberOfLines={2}>
              {getExpiryLabel(item.bestBeforeDate)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs + 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  imageContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: 48,
    height: 48,
  },
  imagePlaceholder: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  brand: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  barcode: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
    flexShrink: 0,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  expiryLabel: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
});
