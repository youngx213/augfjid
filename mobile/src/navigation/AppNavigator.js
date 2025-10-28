import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import AccountsScreen from '../screens/main/AccountsScreen';
import AnalyticsScreen from '../screens/main/AnalyticsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Business Screens
import SubscriptionScreen from '../screens/business/SubscriptionScreen';
import PaymentScreen from '../screens/business/PaymentScreen';
import InvoiceScreen from '../screens/business/InvoiceScreen';
import SupportScreen from '../screens/business/SupportScreen';
import AffiliateScreen from '../screens/business/AffiliateScreen';

// Game Screens
import GameDashboardScreen from '../screens/game/GameDashboardScreen';
import PresetsScreen from '../screens/game/PresetsScreen';
import OverlayScreen from '../screens/game/OverlayScreen';

// Components
import DrawerContent from '../components/DrawerContent';
import TabBarIcon from '../components/TabBarIcon';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: 'transparent' },
      cardOverlayEnabled: true,
      cardStyleInterpolator: ({ current: { progress } }) => ({
        cardStyle: {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        },
      }),
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => (
        <TabBarIcon
          routeName={route.name}
          focused={focused}
          color={color}
          size={size}
        />
      ),
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
      }}
    />
    <Tab.Screen
      name="Accounts"
      component={AccountsScreen}
      options={{
        tabBarLabel: 'Accounts',
      }}
    />
    <Tab.Screen
      name="Analytics"
      component={AnalyticsScreen}
      options={{
        tabBarLabel: 'Analytics',
      }}
    />
    <Tab.Screen
      name="Game"
      component={GameDashboardScreen}
      options={{
        tabBarLabel: 'Game',
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarLabel: 'Settings',
      }}
    />
  </Tab.Navigator>
);

// Business Stack
const BusinessStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#007AFF',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen
      name="Subscription"
      component={SubscriptionScreen}
      options={{ title: 'Subscription' }}
    />
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ title: 'Payment' }}
    />
    <Stack.Screen
      name="Invoice"
      component={InvoiceScreen}
      options={{ title: 'Invoices' }}
    />
    <Stack.Screen
      name="Support"
      component={SupportScreen}
      options={{ title: 'Support' }}
    />
    <Stack.Screen
      name="Affiliate"
      component={AffiliateScreen}
      options={{ title: 'Affiliate' }}
    />
  </Stack.Navigator>
);

// Game Stack
const GameStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#FF6B6B',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen
      name="GameDashboard"
      component={GameDashboardScreen}
      options={{ title: 'Game Dashboard' }}
    />
    <Stack.Screen
      name="Presets"
      component={PresetsScreen}
      options={{ title: 'Presets' }}
    />
    <Stack.Screen
      name="Overlay"
      component={OverlayScreen}
      options={{ title: 'Overlay' }}
    />
  </Stack.Navigator>
);

// Main Drawer Navigator
const MainDrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <DrawerContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: {
        width: 280,
      },
    }}
  >
    <Drawer.Screen
      name="MainTabs"
      component={MainTabNavigator}
      options={{
        drawerLabel: 'Home',
        drawerIcon: ({ color, size }) => (
          <Icon name="home" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Business"
      component={BusinessStack}
      options={{
        drawerLabel: 'Business',
        drawerIcon: ({ color, size }) => (
          <Icon name="business" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Game"
      component={GameStack}
      options={{
        drawerLabel: 'Game',
        drawerIcon: ({ color, size }) => (
          <Icon name="games" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        drawerLabel: 'Profile',
        drawerIcon: ({ color, size }) => (
          <Icon name="person" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// Main App Navigator
const AppNavigator = ({ isAuthenticated }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainDrawerNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
