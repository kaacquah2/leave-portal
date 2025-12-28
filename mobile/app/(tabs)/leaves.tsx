/**
 * Leave Management Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api-client';
import { useRouter } from 'expo-router';

export default function LeavesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);

  const loadLeaves = async () => {
    try {
      const data = await api.getLeaves();
      setLeaves(data || []);
    } catch (error) {
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaves();
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
        <RefreshControl refreshing={refreshing} onRefresh={loadLeaves} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Leave Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/leave-request')}
        >
          <Text style={styles.addButtonText}>+ New Request</Text>
        </TouchableOpacity>
      </View>

      {leaves.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leave requests yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/leave-request')}
          >
            <Text style={styles.emptyButtonText}>Apply for Leave</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.leavesList}>
          {leaves.map((leave) => (
            <View key={leave.id} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveType}>{leave.leaveType}</Text>
                <Text
                  style={[
                    styles.leaveStatus,
                    { color: getStatusColor(leave.status) },
                  ]}
                >
                  {leave.status}
                </Text>
              </View>
              <Text style={styles.leaveDates}>
                {new Date(leave.startDate).toLocaleDateString()} -{' '}
                {new Date(leave.endDate).toLocaleDateString()}
              </Text>
              {leave.reason && (
                <Text style={styles.leaveReason} numberOfLines={2}>
                  {leave.reason}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'approved':
      return '#10b981';
    case 'rejected':
      return '#ef4444';
    case 'pending':
      return '#f59e0b';
    default:
      return '#666';
  }
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  leavesList: {
    padding: 16,
  },
  leaveCard: {
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
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  leaveStatus: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  leaveDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  leaveReason: {
    fontSize: 14,
    color: '#666',
  },
});

