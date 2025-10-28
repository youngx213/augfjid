import React, { useEffect, useState } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import Toast from 'react-native-toast-message';
import FlashMessage from 'react-native-flash-message';
import SplashScreen from 'react-native-splash-screen';
import Orientation from 'react-native-orientation-locker';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Store
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';

// Services
import { initializeServices } from './src/services/initializeServices';
import { setupPushNotifications } from './src/services/pushNotifications';

// Theme
import { lightTheme, darkTheme } from './src/theme/theme';

// Components
import LoadingScreen from './src/components/LoadingScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, initializeAuth } = useAuthStore();
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Lock orientation to portrait
      Orientation.lockToPortrait();

      // Initialize services
      await initializeServices();

      // Setup push notifications
      await setupPushNotifications();

      // Initialize auth
      await initializeAuth();

      // Hide splash screen
      SplashScreen.hide();

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      SplashScreen.hide();
      setIsInitialized(true);
    }
  };

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <NavigationContainer theme={theme}>
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={theme.colors.primary}
              translucent={Platform.OS === 'android'}
            />
            <AppNavigator isAuthenticated={isAuthenticated} />
            <Toast />
            <FlashMessage position="top" />
          </NavigationContainer>
        </PaperProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
