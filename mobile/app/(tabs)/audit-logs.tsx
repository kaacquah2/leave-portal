/**
 * Audit Logs Screen (Admin)
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

export default function AuditLogsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    try {
      const data = await api.getAuditLogs();
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
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
        <RefreshControl refreshing={refreshing} onRefresh={loadLogs} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Audit Logs</Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No audit logs found</Text>
        </View>
      ) : (
        <View style={styles.logsList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logDate}>
                  {new Date(log.timestamp).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.logUser}>User: {log.userEmail || log.userId}</Text>
              {log.details && (
                <Text style={styles.logDetails}>{log.details}</Text>
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
  logsList: {
    padding: 16,
  },
  logCard: {
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
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  logDate: {
    fontSize: 12,
    color: '#666',
  },
  logUser: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

