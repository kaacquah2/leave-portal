/**
 * Benefits Screen
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

export default function BenefitsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [benefits, setBenefits] = useState<any[]>([]);

  useEffect(() => {
    loadBenefits();
  }, []);

  const loadBenefits = async () => {
    try {
      const data = await api.getBenefits();
      setBenefits(data || []);
    } catch (error) {
      console.error('Error loading benefits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadBenefits} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Benefits</Text>
      </View>

      {benefits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No benefits information available</Text>
        </View>
      ) : (
        <View style={styles.benefitsList}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <Text style={styles.benefitName}>{benefit.name || benefit.type}</Text>
              {benefit.description && (
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              )}
              {benefit.amount && (
                <Text style={styles.benefitAmount}>
                  GHS {benefit.amount.toFixed(2)}
                </Text>
              )}
              {benefit.effectiveDate && (
                <Text style={styles.benefitDate}>
                  Effective: {new Date(benefit.effectiveDate).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  benefitsList: {
    padding: 16,
  },
  benefitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  benefitAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 8,
  },
  benefitDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

