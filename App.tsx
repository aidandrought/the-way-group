import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConfirmSheet } from './src/components/ConfirmSheet';
import { AppProvider } from './src/contexts/AppContext';
import { useApp } from './src/contexts/AppContext';
import { RESTAURANTS, type RestaurantId } from './src/constants/restaurants';
import { ChecksTab } from './src/screens/ChecksTab';
import { TablesTab } from './src/screens/TablesTab';

const SELECTED_RESTAURANT_KEY = 'selectedRestaurant:v1';

function AppContent({
  restaurantName,
  onSignOut,
}: {
  restaurantName: string;
  onSignOut: () => void;
}) {
  const { state, clearAllAssignments } = useApp();
  const [activeTab, setActiveTab] = useState<'checks' | 'tables'>('checks');
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const hasAssignmentsOrHighlights =
    state.checks.some(check => check.tableId || check.color) ||
    state.tables.some(table => table.color);

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
        <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.sessionRestaurantBadge}>
          <Text style={styles.sessionRestaurantName} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearAllPress} style={styles.clearAllTopButton}>
          <Text style={styles.clearAllTopButtonText}>Clear all Checks</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {activeTab === 'checks' ? <ChecksTab /> : <TablesTab />}
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

  const handleSignOut = async () => {
    setSelectedRestaurantId(null);
    await AsyncStorage.removeItem(SELECTED_RESTAURANT_KEY);
  };

  if (!selectionLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedRestaurantId) {
    return (
      <SafeAreaView style={styles.container}>
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
        </View>
      </SafeAreaView>
    );
  }

  const selectedRestaurant = RESTAURANTS.find(restaurant => restaurant.id === selectedRestaurantId)!;

  return (
    <AppProvider key={selectedRestaurantId} restaurantId={selectedRestaurantId}>
      <AppContent restaurantName={selectedRestaurant.name} onSignOut={() => { void handleSignOut(); }} />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    flex: 1,
  },
  sessionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#eef5fb',
    borderBottomWidth: 1,
    borderBottomColor: '#cfddea',
  },
  signOutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff4f4',
    borderWidth: 1,
    borderColor: '#e3aaaa',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a12d2d',
  },
  sessionRestaurantBadge: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#b9d2e8',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sessionRestaurantName: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#163a52',
  },
  clearAllTopButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5e92b8',
    backgroundColor: '#b9eaf8',
  },
  clearAllTopButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e506f',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  tabActive: {
    backgroundColor: '#e2ecf7',
    borderTopWidth: 3,
    borderTopColor: '#708fc5',
  },
  tabText: {
    fontSize: 16,
    color: '#555555',
  },
  tabTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  selectorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#eaf3fb',
  },
  selectorHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCard: {
    width: 230,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#bcd4ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#1c4f7a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  logoImage: {
    width: '82%',
    height: '70%',
  },
  selectorEyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#2f6f9f',
    fontWeight: '700',
    marginBottom: 6,
  },
  selectorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#15344a',
    marginBottom: 6,
    textAlign: 'center',
  },
  selectorSubtitle: {
    fontSize: 14,
    color: '#4c6c84',
    textAlign: 'center',
  },
  selectorButtonsWrap: {
    backgroundColor: '#d8eaf8',
    borderWidth: 1,
    borderColor: '#afd0e8',
    borderRadius: 18,
    padding: 10,
  },
  restaurantButton: {
    backgroundColor: '#ffffff',
    borderColor: '#b7d4ea',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#2b5f87',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  restaurantButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#12344c',
    textAlign: 'center',
  },
});
