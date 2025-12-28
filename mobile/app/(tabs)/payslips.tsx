/**
 * Payslips Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api-client';

export default function PayslipsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payslips, setPayslips] = useState<any[]>([]);

  const loadPayslips = async () => {
    try {
      const data = await api.getPayslips();
      setPayslips(data || []);
    } catch (error) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, []);

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
        <RefreshControl refreshing={refreshing} onRefresh={loadPayslips} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Payslips</Text>
      </View>

      {payslips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No payslips available</Text>
        </View>
      ) : (
        <View style={styles.payslipsList}>
          {payslips.map((payslip) => (
            <TouchableOpacity key={payslip.id} style={styles.payslipCard}>
              <View style={styles.payslipHeader}>
                <Text style={styles.payslipPeriod}>
                  {payslip.month} {payslip.year}
                </Text>
                <Text style={styles.payslipAmount}>
                  GHS {payslip.netPay?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.payslipDetails}>
                <View style={styles.payslipDetailRow}>
                  <Text style={styles.payslipDetailLabel}>Gross Pay:</Text>
                  <Text style={styles.payslipDetailValue}>
                    GHS {payslip.grossPay?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.payslipDetailRow}>
                  <Text style={styles.payslipDetailLabel}>Deductions:</Text>
                  <Text style={styles.payslipDetailValue}>
                    GHS {payslip.totalDeductions?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  payslipsList: {
    padding: 16,
  },
  payslipCard: {
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
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  payslipPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  payslipAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  payslipDetails: {
    gap: 8,
  },
  payslipDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payslipDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  payslipDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

