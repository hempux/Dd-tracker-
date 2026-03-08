import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import { FoodItem } from '../types';
import {
  loadItems,
  addItem,
  updateItem,
  deleteItem,
} from '../services/storage';
import { lookupBarcode } from '../services/barcodeApi';
import {
  requestNotificationPermissions,
  scheduleExpiryNotification,
  cancelItemNotifications,
} from '../services/notifications';
import {
  uploadToDrive,
  downloadFromDrive,
  loadAuthState,
  signOut,
  useGoogleAuth,
  GoogleAuthState,
} from '../services/googleDrive';
import { FoodItemCard } from '../components/FoodItemCard';
import { FABButton } from '../components/FABButton';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { ScannerScreen } from './ScannerScreen';
import { Colors, FontSizes, Radius, Spacing } from '../theme';
import { formatDateToISO, getExpiryStatus } from '../utils/dateUtils';

type SortMode = 'expiry' | 'added' | 'name';

/** Extract access token from the expo-auth-session response (handles both token-response and implicit-flow shapes). */
function extractAccessToken(
  resp: AuthSession.AuthSessionResult | null
): string | undefined {
  if (!resp || resp.type !== 'success') return undefined;
  // Implicit flow: token lives in `params.access_token`
  const implicit = resp as { params?: { access_token?: string } };
  if (implicit.params?.access_token) return implicit.params.access_token;
  // Code/token flow: token lives in `authentication.accessToken`
  const tokenFlow = resp as { authentication?: { accessToken?: string } };
  return tokenFlow.authentication?.accessToken;
}

export const HomeScreen: React.FC = () => {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('expiry');
  const [authState, setAuthState] = useState<GoogleAuthState | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  const { request, response, promptAsync } = useGoogleAuth();

  // Handle Google auth response
  useEffect(() => {
    const token = extractAccessToken(response);
    if (token) {
      const state: GoogleAuthState = { accessToken: token };
      setAuthState(state);
      handleDriveSync(token);
    }
  }, [response]);

  // Load items and auth state on mount
  useEffect(() => {
    const init = async () => {
      await requestNotificationPermissions();
      const [storedItems, storedAuth] = await Promise.all([
        loadItems(),
        loadAuthState(),
      ]);
      setItems(storedItems);
      setAuthState(storedAuth);
      setLoading(false);

      Animated.spring(headerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    };
    init();
  }, []);

  const handleDriveSync = async (token?: string) => {
    const accessToken = token ?? authState?.accessToken;
    if (!accessToken) return;

    setSyncStatus('syncing');
    try {
      const success = await uploadToDrive(items, accessToken);
      setSyncStatus(success ? 'ok' : 'error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleDriveRestore = async () => {
    const accessToken = authState?.accessToken;
    if (!accessToken) return;

    setSyncStatus('syncing');
    try {
      const driveItems = await downloadFromDrive(accessToken);
      if (driveItems) {
        setItems(driveItems);
        // Re-save locally
        for (const item of driveItems) {
          await scheduleExpiryNotification(item);
        }
        setSyncStatus('ok');
        Alert.alert('Återställd', `${driveItems.length} varor återställda från Google Drive.`);
      } else {
        setSyncStatus('error');
        Alert.alert('Ingen data', 'Ingen backup hittades på Google Drive.');
      }
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthState(null);
  };

  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      setScanning(false);
      setLookingUp(true);

      try {
        const result = await lookupBarcode(barcode);

        const newItem: FoodItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: result.found && result.name ? result.name : `Okänd vara (${barcode})`,
          barcode,
          bestBeforeDate: null,
          imageUrl: result.imageUrl,
          brand: result.brand,
          categories: result.categories,
          addedAt: new Date().toISOString(),
        };

        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}

        const updated = await addItem(newItem);
        setItems(updated);

        // Show detail so user can immediately set the date
        setSelectedItem(newItem);
        setShowDetail(true);

        // Sync to Drive if authenticated
        if (authState?.accessToken) {
          uploadToDrive(updated, authState.accessToken).catch(() => {});
        }
      } catch (err) {
        Alert.alert(
          'Fel vid sökning',
          'Kunde inte slå upp streckkoden. Varan har lagts till utan produktinformation.'
        );
      } finally {
        setLookingUp(false);
      }
    },
    [authState]
  );

  const handleDateSet = useCallback(
    async (item: FoodItem, date: Date) => {
      const updated: FoodItem = {
        ...item,
        bestBeforeDate: formatDateToISO(date),
      };
      const newItems = await updateItem(updated);
      setItems(newItems);
      setSelectedItem(updated);
      await scheduleExpiryNotification(updated);

      if (authState?.accessToken) {
        uploadToDrive(newItems, authState.accessToken).catch(() => {});
      }
    },
    [authState]
  );

  const handleDeleteItem = useCallback(
    async (item: FoodItem) => {
      const newItems = await deleteItem(item.id);
      setItems(newItems);
      await cancelItemNotifications(item.id);

      if (authState?.accessToken) {
        uploadToDrive(newItems, authState.accessToken).catch(() => {});
      }
    },
    [authState]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const stored = await loadItems();
    setItems(stored);
    setRefreshing(false);
  }, []);

  const sortedItems = [...items].sort((a, b) => {
    if (sortMode === 'expiry') {
      if (!a.bestBeforeDate && !b.bestBeforeDate) return 0;
      if (!a.bestBeforeDate) return 1;
      if (!b.bestBeforeDate) return -1;
      return a.bestBeforeDate.localeCompare(b.bestBeforeDate);
    }
    if (sortMode === 'name') {
      return a.name.localeCompare(b.name, 'sv');
    }
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  const expiringCount = items.filter((item) => {
    const status = getExpiryStatus(item.bestBeforeDate);
    return status === 'warning' || status === 'critical' || status === 'expired';
  }).length;

  const renderItem = useCallback(
    ({ item }: { item: FoodItem }) => (
      <FoodItemCard
        item={item}
        onPress={() => {
          setSelectedItem(item);
          setShowDetail(true);
        }}
        onLongPress={() => {
          setSelectedItem(item);
          setShowDetail(true);
        }}
      />
    ),
    []
  );

  const headerTranslate = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        <View>
          <Text style={styles.appTitle}>Dd-Tracker</Text>
          <Text style={styles.appSubtitle}>
            {items.length === 0
              ? 'Inga varor ännu'
              : `${items.length} vara${items.length === 1 ? '' : 'r'}`}
            {expiringCount > 0
              ? ` · ${expiringCount} utgår snart`
              : ''}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Sync status */}
          {syncStatus === 'syncing' && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
          {syncStatus === 'ok' && <Text style={styles.syncOk}>✓</Text>}
          {syncStatus === 'error' && <Text style={styles.syncError}>!</Text>}

          {/* Google Drive button */}
          <TouchableOpacity
            style={styles.driveBtn}
            onPress={() => {
              if (authState) {
                Alert.alert(
                  'Google Drive',
                  'Vad vill du göra?',
                  [
                    {
                      text: 'Synka nu',
                      onPress: () => handleDriveSync(),
                    },
                    {
                      text: 'Återställ från Drive',
                      onPress: handleDriveRestore,
                    },
                    {
                      text: 'Logga ut',
                      onPress: handleSignOut,
                      style: 'destructive',
                    },
                    { text: 'Avbryt', style: 'cancel' },
                  ]
                );
              } else {
                promptAsync();
              }
            }}
          >
            <Text style={styles.driveBtnIcon}>
              {authState ? '☁️' : '🔗'}
            </Text>
          </TouchableOpacity>

          {/* Sort button */}
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              const modes: SortMode[] = ['expiry', 'added', 'name'];
              const next = modes[(modes.indexOf(sortMode) + 1) % modes.length];
              setSortMode(next);
            }}
          >
            <Text style={styles.sortBtnIcon}>⇅</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Sort mode label */}
      {items.length > 0 && (
        <View style={styles.sortLabel}>
          <Text style={styles.sortLabelText}>
            Sorterat efter:{' '}
            {{
              expiry: 'utgångsdatum',
              added: 'tillagd',
              name: 'namn',
            }[sortMode]}
          </Text>
        </View>
      )}

      {/* Item list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Inga varor ännu</Text>
          <Text style={styles.emptySubtitle}>
            Tryck på knappen nere till vänster för att skanna en streckkod
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* FAB - bottom left */}
      {!scanning && !lookingUp && (
        <FABButton
          onPress={() => setScanning(true)}
          disabled={lookingUp}
        />
      )}

      {/* Loading overlay while looking up barcode */}
      {lookingUp && (
        <View style={styles.lookupOverlay}>
          <View style={styles.lookupBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.lookupText}>Söker produktinformation...</Text>
          </View>
        </View>
      )}

      {/* Scanner modal */}
      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={() => setScanning(false)}
        statusBarTranslucent
      >
        <ScannerScreen
          onScanned={handleBarcodeScanned}
          onClose={() => setScanning(false)}
        />
      </Modal>

      {/* Item detail modal */}
      <ItemDetailModal
        item={selectedItem}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        onDateSet={handleDateSet}
        onDelete={handleDeleteItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 12 : 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  appTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  driveBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  driveBtnIcon: {
    fontSize: 18,
  },
  sortBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sortBtnIcon: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  syncOk: {
    color: Colors.statusOk,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  syncError: {
    color: Colors.statusCritical,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  sortLabel: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sortLabelText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  list: {
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  lookupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  lookupBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minWidth: 200,
  },
  lookupText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
});
