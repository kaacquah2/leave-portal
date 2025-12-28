/**
 * Leave Management Screen (HR)
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
import { useRouter } from 'expo-router';
import { api } from '../../lib/api-client';

export default function LeaveManagementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const loadLeaves = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      const data = await api.getLeaves(params);
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
  }, [filter]);

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await api.approveLeave(id, approved);
      loadLeaves();
    } catch (error: any) {
      console.error('Error approving leave:', error);
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
        <RefreshControl refreshing={refreshing} onRefresh={loadLeaves} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Leave Management</Text>
        <View style={styles.filterContainer}>
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filter === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {leaves.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leave requests found</Text>
        </View>
      ) : (
        <View style={styles.leavesList}>
          {leaves.map((leave) => (
            <View key={leave.id} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View>
                  <Text style={styles.leaveType}>{leave.leaveType}</Text>
                  <Text style={styles.leaveStaff}>
                    {leave.staff?.firstName} {leave.staff?.lastName}
                  </Text>
                </View>
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
              {leave.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(leave.id, true)}
                  >
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleApprove(leave.id, false)}
                  >
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: '#1e40af',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#1e40af',
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leaveType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  leaveStaff: {
    fontSize: 14,
    color: '#666',
  },
  leaveStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  leaveDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

