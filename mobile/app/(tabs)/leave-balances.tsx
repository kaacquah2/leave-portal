/**
 * Leave Balances Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api-client';

export default function LeaveBalancesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<any>({});

  const loadBalances = async () => {
    try {
      const data = await api.getLeaveBalances(user?.staffId);
      setBalances(data || {});
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const balanceTypes = [
    { key: 'annual', label: 'Annual Leave', color: '#10b981' },
    { key: 'sick', label: 'Sick Leave', color: '#f59e0b' },
    { key: 'unpaid', label: 'Unpaid Leave', color: '#ef4444' },
    { key: 'specialService', label: 'Special Service', color: '#8b5cf6' },
    { key: 'training', label: 'Training Leave', color: '#06b6d4' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadBalances} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Leave Balances</Text>
      </View>

      <View style={styles.balancesContainer}>
        {balanceTypes.map((type) => {
          const balance = balances[type.key] || 0;
          return (
            <View key={type.key} style={styles.balanceCard}>
              <View style={[styles.balanceIcon, { backgroundColor: `${type.color}20` }]}>
                <Text style={[styles.balanceIconText, { color: type.color }]}>
                  {type.label[0]}
                </Text>
              </View>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>{type.label}</Text>
                <Text style={[styles.balanceValue, { color: type.color }]}>
                  {balance} days
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Balance Information</Text>
        <Text style={styles.infoText}>
          Your leave balances are updated automatically based on your leave accrual policy.
          Contact HR if you notice any discrepancies.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  balancesContainer: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  balanceIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

