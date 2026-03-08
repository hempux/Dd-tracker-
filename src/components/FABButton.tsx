import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing } from '../theme';

interface FABButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const FABButton: React.FC<FABButtonProps> = ({ onPress, disabled }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  const handlePress = async () => {
    if (disabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    Animated.sequence([
      Animated.spring(pulseAnim, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 60,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
      }),
    ]).start();

    onPress();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          { opacity: glowOpacity },
        ]}
        pointerEvents="none"
      />

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.fab, disabled && styles.fabDisabled]}
          onPress={handlePress}
          activeOpacity={0.9}
          disabled={disabled}
        >
          <Text style={styles.icon}>⊕</Text>
          <Text style={styles.label}>Skanna</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.35 }],
  },
  fab: {
    backgroundColor: Colors.primary,
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    gap: 1,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 22,
    color: '#fff',
    lineHeight: 24,
  },
  label: {
    color: '#ffffffcc',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
