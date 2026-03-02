import { useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { palette } from '../theme/colors';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.background,
    card: '#ffffff',
    text: palette.textPrimary,
    border: '#d8dde6',
    notification: palette.secondary
  }
};

const sanitizeBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\/+$/, '');
};

const getExpoDebugHost = () => {
  const possibleHosts = [
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.expoConfig?.hostUri
  ];

  const hostWithPort = possibleHosts.find((entry) => typeof entry === 'string' && entry.trim().length > 0) || '';
  return hostWithPort.split(':')[0].trim();
};

const uniq = (values) => {
  const set = new Set();

  values.forEach((value) => {
    const normalized = sanitizeBaseUrl(value);
    if (normalized) {
      set.add(normalized);
    }
  });

  return Array.from(set);
};

const expoHost = getExpoDebugHost();
const detectedLanUrl = expoHost ? `http://${expoHost}:3000` : '';

const platformFallbackUrls =
  Platform.OS === 'android'
    ? ['http://10.0.2.2:3000', detectedLanUrl, 'http://localhost:3000']
    : ['http://localhost:3000', detectedLanUrl];

const webBaseUrls = uniq([process.env.EXPO_PUBLIC_WEB_URL, ...platformFallbackUrls]);

const tabs = [
  {
    name: 'Home',
    path: '/',
    icon: 'home-outline'
  },
  {
    name: 'Wishlist',
    path: '/wishlist',
    icon: 'heart-outline'
  },
  {
    name: 'Cart',
    path: '/cart',
    icon: 'bag-handle-outline'
  },
  {
    name: 'Orders',
    path: '/orders',
    icon: 'receipt-outline'
  },
  {
    name: 'Account',
    path: '/settings/account',
    icon: 'person-outline'
  }
];

const buildTabUrl = (baseUrl, path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color={palette.primary} />
  </View>
);

const WebTabScreen = ({ route }) => {
  const tabPath = route.params?.path || '/';
  const [baseUrlIndex, setBaseUrlIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastError, setLastError] = useState(null);

  const currentBaseUrl = webBaseUrls[baseUrlIndex] || 'http://localhost:3000';
  const currentUrl = buildTabUrl(currentBaseUrl, tabPath);

  const tryNextBaseUrl = () => {
    if (baseUrlIndex < webBaseUrls.length - 1) {
      setBaseUrlIndex((prev) => prev + 1);
      return true;
    }

    return false;
  };

  const handleError = (event) => {
    const nativeEvent = event?.nativeEvent || {};

    if (tryNextBaseUrl()) {
      return;
    }

    setLastError(nativeEvent);
  };

  const handleRetry = () => {
    setLastError(null);
    setBaseUrlIndex(0);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <View style={styles.webviewContainer}>
      <WebView
        key={`${route.key}:${baseUrlIndex}:${reloadKey}`}
        source={{ uri: currentUrl }}
        startInLoadingState
        renderLoading={LoadingView}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onLoadStart={() => setLastError(null)}
        onError={handleError}
        style={styles.webview}
      />

      {lastError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load page</Text>
          <Text style={styles.errorText}>Tried URL: {currentUrl}</Text>
          <Text style={styles.errorText}>
            {lastError.description || 'Check server and network settings.'}
          </Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const RootNavigator = () => (
  <NavigationContainer theme={navTheme}>
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => {
        const activeTab = tabs.find((tab) => tab.name === route.name);
        const iconName = activeTab?.icon || 'ellipse-outline';

        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.textSecondary,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#d8dde6',
            height: 60,
            paddingBottom: 8,
            paddingTop: 6
          },
          tabBarIcon: ({ color, size }) => <Ionicons name={iconName} size={size} color={color} />
        };
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={WebTabScreen}
          initialParams={{ path: tab.path }}
        />
      ))}
    </Tab.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  webviewContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '30%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 8
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.textSecondary
  },
  retryButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  }
});

export default RootNavigator;
