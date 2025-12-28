/**
 * Entry point - Redirects based on auth status
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    // Redirect based on role
    const role = user?.role;
    if (role === 'hr') {
      return <Redirect href="/(tabs)/hr-dashboard" />;
    } else if (role === 'manager') {
      return <Redirect href="/(tabs)/manager-dashboard" />;
    } else if (role === 'admin') {
      return <Redirect href="/(tabs)/admin-dashboard" />;
    } else {
      return <Redirect href="/(tabs)/dashboard" />;
    }
  }

  return <Redirect href="/login" />;
}

