import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Chip,
  Surface,
  useTheme,
} from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from 'react-query';

// Services
import { dashboardService } from '../../services/dashboardService';
import { useAuthStore } from '../../store/authStore';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import StatsCard from '../../components/StatsCard';
import QuickActionCard from '../../components/QuickActionCard';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery('dashboard', dashboardService.getDashboardData, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const pieChartData = [
    {
      name: 'Active',
      population: dashboardData?.stats?.activeAccounts || 0,
      color: '#4CAF50',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Inactive',
      population: dashboardData?.stats?.inactiveAccounts || 0,
      color: '#F44336',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Error',
      population: dashboardData?.stats?.errorAccounts || 0,
      color: '#FF9800',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load dashboard data" onRetry={refetch} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>
              Welcome back, {user?.username || 'User'}! 👋
            </Title>
            <Paragraph style={{ color: theme.colors.onSurface }}>
              Here's what's happening with your TikTok accounts today.
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatsCard
            title="Total Accounts"
            value={dashboardData?.stats?.totalAccounts || 0}
            icon="account-multiple"
            color="#007AFF"
          />
          <StatsCard
            title="Active Bots"
            value={dashboardData?.stats?.activeBots || 0}
            icon="robot"
            color="#4CAF50"
          />
          <StatsCard
            title="Total Gifts"
            value={dashboardData?.stats?.totalGifts || 0}
            icon="gift"
            color="#FF6B6B"
          />
          <StatsCard
            title="Revenue"
            value={`$${dashboardData?.stats?.totalRevenue || 0}`}
            icon="currency-usd"
            color="#FF9800"
          />
        </View>

        {/* Quick Actions */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>Quick Actions</Title>
            <View style={styles.quickActionsContainer}>
              <QuickActionCard
                title="Add Account"
                icon="plus"
                onPress={() => navigation.navigate('Accounts')}
                color="#007AFF"
              />
              <QuickActionCard
                title="View Analytics"
                icon="chart-line"
                onPress={() => navigation.navigate('Analytics')}
                color="#4CAF50"
              />
              <QuickActionCard
                title="Game Dashboard"
                icon="gamepad-variant"
                onPress={() => navigation.navigate('Game')}
                color="#FF6B6B"
              />
              <QuickActionCard
                title="Settings"
                icon="cog"
                onPress={() => navigation.navigate('Settings')}
                color="#9C27B0"
              />
            </View>
          </Card.Content>
        </Card>

        {/* Charts Section */}
        <View style={styles.chartsContainer}>
          {/* Revenue Chart */}
          <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={{ color: theme.colors.onSurface }}>Revenue Trend</Title>
              {dashboardData?.revenueChart && (
                <LineChart
                  data={dashboardData.revenueChart}
                  width={width - 40}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              )}
            </Card.Content>
          </Card>

          {/* Gifts Chart */}
          <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={{ color: theme.colors.onSurface }}>Gifts Received</Title>
              {dashboardData?.giftsChart && (
                <BarChart
                  data={dashboardData.giftsChart}
                  width={width - 40}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                />
              )}
            </Card.Content>
          </Card>

          {/* Account Status Pie Chart */}
          <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={{ color: theme.colors.onSurface }}>Account Status</Title>
              <PieChart
                data={pieChartData}
                width={width - 40}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        </View>

        {/* Recent Activity */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>Recent Activity</Title>
            {dashboardData?.recentActivity?.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Icon
                  name={activity.icon}
                  size={24}
                  color={activity.color || theme.colors.primary}
                />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]}>
                    {activity.title}
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.colors.onSurface }]}>
                    {activity.time}
                  </Text>
                </View>
                <Chip
                  mode="outlined"
                  compact
                  style={[
                    styles.activityChip,
                    { borderColor: activity.color || theme.colors.primary },
                  ]}
                >
                  {activity.status}
                </Chip>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* System Status */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>System Status</Title>
            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <Icon name="server" size={20} color="#4CAF50" />
                <Text style={[styles.statusText, { color: theme.colors.onSurface }]}>
                  Backend: Online
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Icon name="database" size={20} color="#4CAF50" />
                <Text style={[styles.statusText, { color: theme.colors.onSurface }]}>
                  Database: Connected
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Icon name="wifi" size={20} color="#4CAF50" />
                <Text style={[styles.statusText, { color: theme.colors.onSurface }]}>
                  Network: Stable
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('Accounts')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  chartsContainer: {
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 16,
    elevation: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  activityChip: {
    marginLeft: 8,
  },
  statusContainer: {
    marginTop: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default DashboardScreen;
