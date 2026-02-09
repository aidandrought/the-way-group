import { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppProvider } from './src/contexts/AppContext';
import { ChecksTab } from './src/screens/ChecksTab';
import { TablesTab } from './src/screens/TablesTab';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'checks' | 'tables'>('checks');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
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
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
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
});
