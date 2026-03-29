import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { Image, LogBox, Platform, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmSheet } from './src/components/ConfirmSheet';
import { RestaurantNotesPanel } from './src/components/RestaurantNotesPanel';
import { TeamAssignmentsPanel } from './src/components/TeamAssignmentsPanel';
import { MILL_CREEK_TABLE_LAYOUT } from './src/constants/millCreekLayout';
import { POE_TABLE_LAYOUT } from './src/constants/poeLayout';
import { getTableDisplayLabel } from './src/constants/tableLabels';
import { getTableNumbersForRestaurant } from './src/constants/tableLayouts';
import { AppProvider } from './src/contexts/AppContext';
import { useApp } from './src/contexts/AppContext';
import { RESTAURANTS, type RestaurantId } from './src/constants/restaurants';
import { uiTheme } from './src/constants/uiTheme';
import { ChecksTab } from './src/screens/ChecksTab';
import { TablesTab } from './src/screens/TablesTab';

const SELECTED_RESTAURANT_KEY = 'selectedRestaurant:v1';
const NOTES_LAST_VIEWED_PREFIX = 'notesLastViewed:v1:';
const MANAGER_PIN = '0617';
const EMPLOYEE_PIN = '0228';
const PIN_LENGTH = MANAGER_PIN.length;

LogBox.ignoreLogs([
  "@firebase/firestore: Firestore (10.14.1): WebChannelConnection RPC 'Write' stream",
]);

function PinLoginScreen({
  pinInput,
  onDigitPress,
  onBackspace,
  errorText,
}: {
  pinInput: string;
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  errorText: string | null;
}) {
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace'],
  ] as const;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.pinContainer}>
        <View style={styles.pinHero}>
          <Text style={styles.pinTitle}>Enter Access Code</Text>
          <Text style={styles.pinSubtitle}>Enter 4-digit code to continue</Text>
        </View>

        <View style={styles.pinDotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => {
            const filled = index < pinInput.length;
            return (
              <View
                key={`pin-dot-${index}`}
                style={[styles.pinDot, filled && styles.pinDotFilled]}
              />
            );
          })}
        </View>

        {!!errorText && <Text style={styles.pinError}>{errorText}</Text>}

        <View style={styles.keypad}>
          {keypadRows.map((row, rowIndex) => (
            <View key={`keypad-row-${rowIndex}`} style={styles.keypadRow}>
              {row.map((key) => {
                if (key === '') {
                  return <View key={`spacer-${rowIndex}`} style={styles.keypadSpacer} />;
                }
                if (key === 'backspace') {
                  return (
                    <TouchableOpacity
                      key="backspace"
                      onPress={onBackspace}
                      style={[styles.keypadButton, styles.keypadBackspaceButton]}
                    >
                      <Text style={styles.keypadBackspaceText}>⌫</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => onDigitPress(key)}
                    style={styles.keypadButton}
                  >
                    <Text style={styles.keypadButtonText}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function AppContent({
  restaurantId,
  restaurantName,
  isManager,
  onExit,
}: {
  restaurantId: RestaurantId;
  restaurantName: string;
  isManager: boolean;
  onExit: () => void;
}) {
  const { width } = useWindowDimensions();
  const notesDefaultOpen = width >= 768;
  const isPhoneLayout = width < 768;
  const isCompactScreen = width < 560;
  const isIosCompactScreen = Platform.OS === 'ios' && width < 560;
  const { state, clearAllAssignments, pendingRecall, recallLastClear } = useApp();
  const [activeTab, setActiveTab] = useState<'checks' | 'tables'>('checks');
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [notesOpen, setNotesOpen] = useState(notesDefaultOpen);
  const [teamOpen, setTeamOpen] = useState(false);
  const [notesLastViewedAt, setNotesLastViewedAt] = useState(0);
  const [notesNowMs, setNotesNowMs] = useState(Date.now());
  const hasAssignmentsOrHighlights =
    state.checks.some(check => check.tableId || check.color) ||
    state.tables.some(table => table.color);
  const notesStorageKey = `${NOTES_LAST_VIEWED_PREFIX}${restaurantId}`;
  const notesPanelWidth = width < 768
    ? Math.round(width * 0.72)
    : Platform.OS === 'web'
      ? Math.min(420, Math.max(340, Math.round(width * 0.1875)))
      : Math.round(width * 0.1875);
  const teamPanelWidth = width >= 1024
    ? Math.min(760, Math.max(520, Math.round(width * 0.5)))
    : Math.min(560, Math.max(360, Math.round(width * 0.5)));
  const rightDockWidth = teamOpen ? teamPanelWidth : notesOpen ? notesPanelWidth : 0;
  const activeNotes = state.notes.filter(note => note.expiresAtMs > notesNowMs);
  const hasUnreadNotes = activeNotes.some(note => note.updatedAtMs > notesLastViewedAt);
  const assignedChecksCount = state.checks.filter(check => !!check.tableId).length;
  const openTablesCount = useMemo(() => {
    const visibleTableNumbers = new Set(
      restaurantId === 'everett'
        ? POE_TABLE_LAYOUT.map(layout => layout.tableNumber)
        : restaurantId === 'mill-creek'
          ? MILL_CREEK_TABLE_LAYOUT.map(layout => layout.tableNumber)
          : getTableNumbersForRestaurant(restaurantId)
    );
    const occupiedTableIds = new Set(
      state.checks
        .map(check => check.tableId)
        .filter((tableId): tableId is string => !!tableId)
    );

    return state.tables.filter(table => {
      if (!visibleTableNumbers.has(table.tableNumber)) {
        return false;
      }
      const label = getTableDisplayLabel(restaurantId, table.tableNumber);
      if (label === 'Bar' || label === 'Event Space' || label === 'Patio') {
        return false;
      }
      return !occupiedTableIds.has(table.id);
    }).length;
  }, [restaurantId, state.checks, state.tables]);
  const sessionTitle = isPhoneLayout
    ? restaurantName.replace(/^Tapped\s+/i, '')
    : restaurantName;

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(notesStorageKey)
      .then(raw => {
        if (!mounted || !raw) return;
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) {
          setNotesLastViewedAt(parsed);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [notesStorageKey]);

  useEffect(() => {
    setNotesOpen(notesDefaultOpen);
  }, [notesDefaultOpen, restaurantId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNotesNowMs(Date.now());
    }, 60_000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!notesOpen) return;

    const timeoutId = setTimeout(() => {
      const viewedAt = Date.now();
      setNotesLastViewedAt(viewedAt);
      AsyncStorage.setItem(notesStorageKey, String(viewedAt)).catch(() => undefined);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notesOpen, notesStorageKey]);

  const handleClearAllPress = () => {
    if (!hasAssignmentsOrHighlights) {
      void clearAllAssignments();
      return;
    }
    setShowClearAllConfirm(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.sessionBar}>
        <View style={styles.sessionLeftCluster}>
          <TouchableOpacity onPress={onExit} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Exit</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.sessionRestaurantBadge, isCompactScreen && styles.sessionRestaurantBadgeCompact]}>
          <Text
            style={[styles.sessionRestaurantName, isPhoneLayout && styles.sessionRestaurantNamePhone]}
            numberOfLines={1}
          >
            {sessionTitle}
          </Text>
        </View>
        <View style={styles.sessionActions}>
          <TouchableOpacity
            onPress={handleClearAllPress}
            style={[styles.clearAllTopButton, isCompactScreen && styles.clearAllTopButtonCompact]}
          >
            <Text style={[styles.clearAllTopButtonText, isCompactScreen && styles.clearAllTopButtonTextCompact]}>
              Clear all Checks
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.mainRow}>
        <View style={styles.primaryPane}>
          <View style={styles.content}>
            <View style={[styles.topUtilityRow, isCompactScreen && styles.topUtilityRowCompact]}>
              {!notesOpen && !teamOpen && (
                <>
                  <View style={[styles.utilityLeftCluster, isCompactScreen && styles.utilityLeftClusterCompact]}>
                    {pendingRecall && (
                      <TouchableOpacity
                        onPress={() => {
                          void recallLastClear();
                        }}
                        style={[
                          styles.notesFloatingButton,
                          styles.recallUtilityButton,
                          isCompactScreen && styles.notesFloatingButtonCompact,
                          isCompactScreen && styles.recallUtilityButtonCompact,
                        ]}
                      >
                        <View style={[styles.notesIconBadge, isCompactScreen && styles.notesIconBadgeCompact, styles.recallIconBadge]}>
                          <Feather name="rotate-ccw" size={14} color={uiTheme.colors.primaryStrong} />
                        </View>
                        {!isCompactScreen && <Text style={styles.notesTopButtonText}>Recall</Text>}
                      </TouchableOpacity>
                    )}
                    <View style={[styles.utilityCountPill, isCompactScreen && styles.utilityCountPillCompact]}>
                      <Text style={[styles.utilityCountLabel, isIosCompactScreen && styles.utilityCountLabelCompact]}>
                        {activeTab === 'tables' ? 'Tables Open:' : 'Assigned Checks'}
                      </Text>
                      <Text style={[styles.utilityCountValue, isIosCompactScreen && styles.utilityCountValueCompact]}>
                        {activeTab === 'tables' ? openTablesCount : assignedChecksCount}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.utilityRightCluster, isCompactScreen && styles.utilityRightClusterCompact]}>
                    <TouchableOpacity
                      onPress={() => setTeamOpen(true)}
                      style={[styles.notesFloatingButton, isCompactScreen && styles.notesFloatingButtonCompact]}
                    >
                      <View style={[styles.notesIconBadge, isCompactScreen && styles.notesIconBadgeCompact]}>
                        <Feather name="users" size={14} color={uiTheme.colors.primaryStrong} />
                      </View>
                      <Text style={[styles.notesTopButtonText, isCompactScreen && styles.notesTopButtonTextCompact]}>Team</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setNotesOpen(true)}
                      style={[styles.notesFloatingButton, isCompactScreen && styles.notesFloatingButtonCompact]}
                    >
                      <View style={[styles.notesIconBadge, isCompactScreen && styles.notesIconBadgeCompact]}>
                        <Feather name="file-text" size={14} color={uiTheme.colors.primaryStrong} />
                      </View>
                      <Text style={[styles.notesTopButtonText, isCompactScreen && styles.notesTopButtonTextCompact]}>Notes</Text>
                      {hasUnreadNotes && <View style={styles.notesUnreadDot} />}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
            <View style={styles.tabContentHost}>
              <View
                pointerEvents={activeTab === 'checks' ? 'auto' : 'none'}
                style={[
                  styles.tabContentPane,
                  activeTab !== 'checks' && styles.tabContentPaneHidden,
                ]}
              >
                <ChecksTab />
              </View>
              <View
                pointerEvents={activeTab === 'tables' ? 'auto' : 'none'}
                style={[
                  styles.tabContentPane,
                  activeTab !== 'tables' && styles.tabContentPaneHidden,
                ]}
              >
                <TablesTab />
              </View>
            </View>
          </View>
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab('checks')}
              style={[
                styles.tab,
                activeTab === 'checks' && styles.tabActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'checks' && styles.tabTextActive,
                ]}
              >
                Checks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('tables')}
              style={[
                styles.tab,
                activeTab === 'tables' && styles.tabActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'tables' && styles.tabTextActive,
                ]}
              >
                Tables
              </Text>
            </TouchableOpacity>
          </View>
          {notesOpen && !teamOpen && (
            <Pressable style={styles.notesDismissOverlay} onPress={() => setNotesOpen(false)} />
          )}
        </View>
        {rightDockWidth > 0 && (
          <View style={[styles.sideDock, { width: rightDockWidth }]}>
            <TeamAssignmentsPanel
              isOpen={teamOpen}
              panelWidth={teamPanelWidth}
              isManager={isManager}
              onClose={() => setTeamOpen(false)}
            />
            <RestaurantNotesPanel
              isOpen={notesOpen}
              panelWidth={notesPanelWidth}
              notes={activeNotes}
              onClose={() => setNotesOpen(false)}
            />
          </View>
        )}
      </View>

      <ConfirmSheet
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={() => {
          void clearAllAssignments();
        }}
        title="Clear all checks?"
        message="This will remove all check assignments and clear all table/check highlights."
        confirmLabel="Clear All"
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<RestaurantId | null>(null);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [accessMode, setAccessMode] = useState<'staff' | 'manager' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSelection = async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTED_RESTAURANT_KEY);
        if (!mounted) return;
        if (saved && RESTAURANTS.some(restaurant => restaurant.id === saved)) {
          setSelectedRestaurantId(saved as RestaurantId);
        }
      } finally {
        if (mounted) setSelectionLoaded(true);
      }
    };

    void loadSelection();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectRestaurant = async (restaurantId: RestaurantId) => {
    setSelectedRestaurantId(restaurantId);
    await AsyncStorage.setItem(SELECTED_RESTAURANT_KEY, restaurantId);
  };

  const handleExitRestaurant = async () => {
    setSelectedRestaurantId(null);
    await AsyncStorage.removeItem(SELECTED_RESTAURANT_KEY);
  };

  const handleSignOut = async () => {
    setSelectedRestaurantId(null);
    setAccessMode(null);
    setPinInput('');
    setPinError(null);
    await AsyncStorage.removeItem(SELECTED_RESTAURANT_KEY);
  };

  const handleDigitPress = (digit: string) => {
    if (pinInput.length >= PIN_LENGTH) return;
    const nextPin = `${pinInput}${digit}`;
    setPinInput(nextPin);
    if (pinError) setPinError(null);

    if (nextPin.length === PIN_LENGTH) {
      if (nextPin === MANAGER_PIN) {
        setAccessMode('manager');
        setPinInput('');
        setPinError(null);
      } else if (nextPin === EMPLOYEE_PIN) {
        setAccessMode('staff');
        setPinInput('');
        setPinError(null);
      } else {
        setPinError('Incorrect code');
        setPinInput('');
      }
    }
  };

  const handleBackspace = () => {
    if (!pinInput.length) return;
    setPinInput(pinInput.slice(0, -1));
    if (pinError) setPinError(null);
  };

  const renderApp = () => {
    if (!accessMode) {
      return (
        <PinLoginScreen
          pinInput={pinInput}
          onDigitPress={handleDigitPress}
          onBackspace={handleBackspace}
          errorText={pinError}
        />
      );
    }

    if (!selectionLoaded) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorTitle}>Loading...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (!selectedRestaurantId) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHero}>
              <View style={styles.logoCard}>
                <Image
                  source={require('./assets/images/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.selectorEyebrow}>The Way Group</Text>
              <Text style={styles.selectorTitle}>Select Restaurant</Text>
              <Text style={styles.selectorSubtitle}>Choose a location to continue</Text>
            </View>

            <View style={styles.selectorButtonsWrap}>
            {RESTAURANTS.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                onPress={() => {
                  void handleSelectRestaurant(restaurant.id);
                }}
                style={styles.restaurantButton}
              >
                <Text style={styles.restaurantButtonText}>{restaurant.name}</Text>
              </TouchableOpacity>
            ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                void handleSignOut();
              }}
              style={styles.selectorLogoutButton}
            >
              <Text style={styles.selectorLogoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    const selectedRestaurant = RESTAURANTS.find(restaurant => restaurant.id === selectedRestaurantId)!;

    return (
      <AppProvider key={selectedRestaurantId} restaurantId={selectedRestaurantId}>
        <AppContent
          restaurantId={selectedRestaurantId}
          restaurantName={selectedRestaurant.name}
          isManager={accessMode === 'manager'}
          onExit={() => { void handleExitRestaurant(); }}
        />
      </AppProvider>
    );
  };

  return <SafeAreaProvider>{renderApp()}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTheme.colors.appBackground,
  },
  content: {
    flex: 1,
    paddingTop: 0,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  primaryPane: {
    flex: 1,
    minWidth: 0,
  },
  notesDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  sideDock: {
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.appBackgroundAlt,
    shadowColor: '#0F172A',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  tabContentHost: {
    flex: 1,
    paddingTop: 0,
  },
  tabContentPane: {
    ...StyleSheet.absoluteFillObject,
  },
  tabContentPaneHidden: {
    opacity: 0,
  },
  sessionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border,
    ...uiTheme.shadow.soft,
  },
  sessionLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signOutButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    justifyContent: 'center',
    ...uiTheme.shadow.soft,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.ink,
  },
  sessionRestaurantBadge: {
    flex: 1,
    marginHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    ...uiTheme.shadow.soft,
  },
  sessionRestaurantBadgeCompact: {
    marginHorizontal: 10,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  sessionRestaurantName: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  sessionRestaurantNamePhone: {
    fontSize: 17,
  },
  clearAllTopButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    justifyContent: 'center',
    ...uiTheme.shadow.soft,
  },
  clearAllTopButtonCompact: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearAllTopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.ink,
  },
  clearAllTopButtonTextCompact: {
    fontSize: 14,
  },
  sessionActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 2,
  },
  notesTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b9cad9',
    backgroundColor: uiTheme.colors.surfaceRaised,
    position: 'relative',
    minWidth: 92,
  },
  notesFloatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    minWidth: 104,
    ...uiTheme.shadow.soft,
  },
  notesFloatingButtonCompact: {
    minWidth: 76,
    minHeight: 40,
    paddingLeft: 8,
    paddingRight: 9,
    paddingVertical: 6,
    gap: 6,
  },
  recallUtilityButton: {
    backgroundColor: uiTheme.colors.primaryMuted,
    borderColor: uiTheme.colors.primary,
  },
  recallUtilityButtonCompact: {
    minWidth: 0,
    paddingLeft: 7,
    paddingRight: 7,
    gap: 0,
  },
  recallIconBadge: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  utilityLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-start',
  },
  utilityLeftClusterCompact: {
    gap: 6,
  },
  utilityRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    justifyContent: 'flex-end',
  },
  utilityRightClusterCompact: {
    gap: 6,
  },
  topUtilityRow: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topUtilityRowCompact: {
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  pageSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  utilityCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: uiTheme.radius.pill,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
  },
  utilityCountPillCompact: {
    paddingHorizontal: 10,
    minHeight: 40,
  },
  utilityCountLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#15803D',
  },
  utilityCountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  utilityCountLabelCompact: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  utilityCountValueCompact: {
    fontSize: 15,
  },
  notesTopButtonActive: {
    backgroundColor: '#e2ecf7',
    borderColor: '#6f8cbf',
  },
  notesTopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: uiTheme.colors.inkSoft,
  },
  notesTopButtonTextCompact: {
    fontSize: 13,
  },
  teamModePill: {
    height: 42,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: uiTheme.radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiTheme.shadow.soft,
  },
  teamModePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  notesIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTheme.colors.primaryMuted,
  },
  notesIconBadgeCompact: {
    width: 22,
    height: 22,
    borderRadius: 7,
  },
  notesIconBadgeActive: {
    backgroundColor: '#d6e3f5',
    borderColor: '#9fb7da',
  },
  notesUnreadDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: uiTheme.colors.unread,
    borderWidth: 1,
    borderColor: uiTheme.colors.surfaceRaised,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: uiTheme.colors.border,
    minHeight: 58,
    ...uiTheme.shadow.soft,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderTopWidth: 3,
    borderTopColor: uiTheme.colors.primaryStrong,
  },
  tabText: {
    fontSize: 14,
    color: uiTheme.colors.inkMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.primaryStrong,
  },
  selectorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: uiTheme.colors.appBackground,
  },
  selectorHero: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    ...uiTheme.shadow.card,
  },
  logoCard: {
    width: 230,
    height: 120,
    borderRadius: 24,
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...uiTheme.shadow.soft,
  },
  logoImage: {
    width: '82%',
    height: '70%',
  },
  selectorEyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: uiTheme.colors.inkMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  selectorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  selectorSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: uiTheme.colors.inkMuted,
    textAlign: 'center',
  },
  selectorButtonsWrap: {
    gap: 16,
  },
  restaurantButton: {
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderColor: uiTheme.colors.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    ...uiTheme.shadow.card,
  },
  restaurantButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    textAlign: 'center',
  },
  selectorLogoutButton: {
    marginTop: 20,
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.dangerBorder,
    backgroundColor: uiTheme.colors.dangerSurface,
    justifyContent: 'center',
  },
  selectorLogoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTheme.colors.dangerText,
  },
  pinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: uiTheme.colors.appBackground,
  },
  pinHero: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    ...uiTheme.shadow.card,
  },
  pinTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 6,
  },
  pinSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: uiTheme.colors.inkMuted,
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    backgroundColor: uiTheme.colors.surfaceRaised,
  },
  pinDotFilled: {
    backgroundColor: uiTheme.colors.primaryStrong,
    borderColor: uiTheme.colors.primaryStrong,
  },
  pinError: {
    color: uiTheme.colors.dangerText,
    fontSize: 13,
    marginBottom: 14,
    minHeight: 18,
  },
  accessModeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  accessModeBadgeStaff: {
    backgroundColor: '#f4f7fa',
    borderColor: '#c4d2de',
  },
  accessModeBadgeManager: {
    backgroundColor: '#DCECF7',
    borderColor: uiTheme.colors.primary,
  },
  accessModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accessModeTextStaff: {
    color: '#5d7487',
  },
  accessModeTextManager: {
    color: uiTheme.colors.primaryStrong,
  },
  keypad: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    ...uiTheme.shadow.card,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keypadButton: {
    width: 74,
    height: 56,
    borderRadius: 16,
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiTheme.shadow.soft,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  keypadBackspaceButton: {
    backgroundColor: uiTheme.colors.primaryMuted,
  },
  keypadBackspaceText: {
    fontSize: 22,
    fontWeight: '700',
    color: uiTheme.colors.primaryStrong,
  },
  keypadSpacer: {
    width: 74,
    height: 56,
  },
});
