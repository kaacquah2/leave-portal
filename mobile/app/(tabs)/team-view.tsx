/**
 * Team View Screen (Manager)
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
import { api } from '../../lib/api-client';

export default function TeamViewScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamLeaves, setTeamLeaves] = useState<any[]>([]);

  const loadTeamLeaves = async () => {
    try {
      const data = await api.getLeaves();
      setTeamLeaves(data || []);
    } catch (error) {
      console.error('Error loading team leaves:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeamLeaves();
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
        <RefreshControl refreshing={refreshing} onRefresh={loadTeamLeaves} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Team Leave Calendar</Text>
      </View>

      {teamLeaves.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No team leave records</Text>
        </View>
      ) : (
        <View style={styles.leavesList}>
          {teamLeaves.map((leave) => (
            <View key={leave.id} style={styles.leaveCard}>
              <Text style={styles.leaveName}>
                {leave.staff?.firstName} {leave.staff?.lastName}
              </Text>
              <Text style={styles.leaveType}>{leave.leaveType}</Text>
              <Text style={styles.leaveDates}>
                {new Date(leave.startDate).toLocaleDateString()} -{' '}
                {new Date(leave.endDate).toLocaleDateString()}
              </Text>
              <Text
                style={[
                  styles.leaveStatus,
                  { color: getStatusColor(leave.status) },
                ]}
              >
                {leave.status}
              </Text>
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
  leaveName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  leaveType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  leaveDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  leaveStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 8,
  },
});

