/**
 * Tab Navigation Layout - Role-based navigation
 */

import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { user } = useAuth();

  // Employee tabs
  if (user?.role === 'employee') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1e40af',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="leaves"
          options={{
            title: 'Leaves',
            tabBarLabel: 'Leaves',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📅</Text>,
          }}
        />
        <Tabs.Screen
          name="leave-request"
          options={{
            href: null, // Hide from tab bar, accessible via navigation
          }}
        />
        <Tabs.Screen
          name="leave-balances"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="leave-history"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payslips"
          options={{
            title: 'Payslips',
            tabBarLabel: 'Payslips',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💰</Text>,
          }}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: 'Documents',
            tabBarLabel: 'Docs',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📄</Text>,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarLabel: 'Alerts',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔔</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
          }}
        />
        <Tabs.Screen
          name="personal-info"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="emergency-contacts"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="bank-account"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="tax-info"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="benefits"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="certifications"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="training"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="performance"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="bank-account"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="tax-info"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="benefits"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="certifications"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="training"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="performance"
          options={{ href: null }}
        />
      </Tabs>
    );
  }

  // HR tabs
  if (user?.role === 'hr') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1e40af',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="hr-dashboard"
          options={{
            title: 'HR Dashboard',
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="staff-management"
          options={{
            title: 'Staff',
            tabBarLabel: 'Staff',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="leave-management"
          options={{
            title: 'Leaves',
            tabBarLabel: 'Leaves',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📅</Text>,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarLabel: 'Reports',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
          }}
        />
      </Tabs>
    );
  }

  // Manager tabs
  if (user?.role === 'manager') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1e40af',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="manager-dashboard"
          options={{
            title: 'Dashboard',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Approvals',
            tabBarLabel: 'Approvals',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>✅</Text>,
          }}
        />
        <Tabs.Screen
          name="team-view"
          options={{
            title: 'Team',
            tabBarLabel: 'Team',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
          }}
        />
      </Tabs>
    );
  }

  // Admin tabs
  if (user?.role === 'admin') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1e40af',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="admin-dashboard"
          options={{
            title: 'Admin',
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="user-management"
          options={{
            title: 'Users',
            tabBarLabel: 'Users',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="audit-logs"
          options={{
            title: 'Audit',
            tabBarLabel: 'Audit',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
          }}
        />
      </Tabs>
    );
  }

  // Default fallback
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

