import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface ScannerScreenProps {
  onScanned: (barcode: string) => void;
  onClose: () => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  onScanned,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(0)).current;

  // Animate corner brackets in
  React.useEffect(() => {
    Animated.spring(cornerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [cornerAnim]);

  const flashScreen = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flashAnim]);

  const handleBarCodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned) return;
      const { data } = result;
      if (!data || data === lastBarcode) return;

      setScanned(true);
      setLastBarcode(data);
      flashScreen();

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      onScanned(data);
    },
    [scanned, lastBarcode, flashScreen, onScanned]
  );

  const handleScanAnother = () => {
    setScanned(false);
    setLastBarcode(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Begär kameraåtkomst...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Kameraåtkomst behövs</Text>
          <Text style={styles.permissionText}>
            Dd-Tracker behöver kameraåtkomst för att skanna streckkoder på matvaror.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Ge åtkomst</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Avbryt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cornerScale = cornerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'qr',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanWindow} />
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay} />
      </View>

      {/* Corner brackets */}
      <Animated.View
        style={[styles.corners, { transform: [{ scale: cornerScale }] }]}
        pointerEvents="none"
      >
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </Animated.View>

      {/* Scan flash */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Skanna streckkod</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Bottom hint */}
      <View style={styles.bottomHint}>
        {scanned ? (
          <View style={styles.scannedBox}>
            <Text style={styles.scannedText}>✓ Streckkod läst!</Text>
            <Text style={styles.scannedBarcode}>{lastBarcode}</Text>
            <TouchableOpacity style={styles.scanAnotherBtn} onPress={handleScanAnother}>
              <Text style={styles.scanAnotherText}>Skanna en till</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.hintText}>
            Rikta kameran mot streckkoden på förpackningen
          </Text>
        )}
      </View>
    </View>
  );
};

const SCAN_WINDOW = 240;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;
/** Vertical offset to shift the scan window up from screen center, to account for the top bar. */
const SCAN_WINDOW_TOP_OFFSET = 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_WINDOW,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scanWindow: {
    width: SCAN_WINDOW,
    height: SCAN_WINDOW,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  corners: {
    position: 'absolute',
    width: SCAN_WINDOW,
    height: SCAN_WINDOW,
    alignSelf: 'center',
    top: '50%',
    marginTop: -SCAN_WINDOW / 2 - SCAN_WINDOW_TOP_OFFSET,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.primary,
    borderWidth: CORNER_WIDTH,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  bottomHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  scannedBox: {
    backgroundColor: 'rgba(108,99,255,0.9)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  scannedText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  scannedBarcode: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
    fontFamily: 'monospace',
  },
  scanAnotherBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  scanAnotherText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  permissionBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  permissionIcon: {
    fontSize: 48,
  },
  permissionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
});
