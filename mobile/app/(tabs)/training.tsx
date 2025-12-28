/**
 * Training Records Screen
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

export default function TrainingScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainings, setTrainings] = useState<any[]>([]);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      const data = await api.getTrainingRecords();
      setTrainings(data || []);
    } catch (error) {
      console.error('Error loading trainings:', error);
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
        <RefreshControl refreshing={refreshing} onRefresh={loadTrainings} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Training Records</Text>
      </View>

      {trainings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No training records available</Text>
        </View>
      ) : (
        <View style={styles.trainingsList}>
          {trainings.map((training, index) => (
            <View key={index} style={styles.trainingCard}>
              <Text style={styles.trainingName}>
                {training.programName || training.name}
              </Text>
              {training.description && (
                <Text style={styles.trainingDescription}>{training.description}</Text>
              )}
              <View style={styles.trainingDetails}>
                {training.startDate && (
                  <Text style={styles.trainingDetail}>
                    Start: {new Date(training.startDate).toLocaleDateString()}
                  </Text>
                )}
                {training.endDate && (
                  <Text style={styles.trainingDetail}>
                    End: {new Date(training.endDate).toLocaleDateString()}
                  </Text>
                )}
                {training.status && (
                  <Text
                    style={[
                      styles.trainingStatus,
                      { color: getStatusColor(training.status) },
                    ]}
                  >
                    {training.status}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return '#10b981';
    case 'in progress':
      return '#f59e0b';
    case 'pending':
      return '#6b7280';
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
  trainingsList: {
    padding: 16,
  },
  trainingCard: {
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
  trainingName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  trainingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  trainingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trainingDetail: {
    fontSize: 12,
    color: '#666',
  },
  trainingStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

