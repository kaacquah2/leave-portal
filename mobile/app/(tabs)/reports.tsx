/**
 * Reports Screen (HR)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../lib/api-client';

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleExport = async (type: string) => {
    try {
      await api.exportReport(type);
      // Handle export success
    } catch (error) {
      console.error('Error exporting report:', error);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
      </View>

      <View style={styles.content}>
        {analytics && (
          <View style={styles.analyticsCard}>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Leaves:</Text>
              <Text style={styles.statValue}>{analytics.totalLeaves || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Approved:</Text>
              <Text style={styles.statValue}>{analytics.approvedLeaves || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending:</Text>
              <Text style={styles.statValue}>{analytics.pendingLeaves || 0}</Text>
            </View>
          </View>
        )}

        <View style={styles.reportsCard}>
          <Text style={styles.sectionTitle}>Export Reports</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('leaves')}
          >
            <Text style={styles.exportButtonText}>📊 Export Leave Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('staff')}
          >
            <Text style={styles.exportButtonText}>👥 Export Staff Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('attendance')}
          >
            <Text style={styles.exportButtonText}>⏰ Export Attendance Report</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    padding: 16,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reportsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButton: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

