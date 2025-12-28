/**
 * Performance Reviews Screen
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

export default function PerformanceScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const data = await api.getPerformanceReviews(user?.staffId);
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
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
        <RefreshControl refreshing={refreshing} onRefresh={loadReviews} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Performance Reviews</Text>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No performance reviews available</Text>
        </View>
      ) : (
        <View style={styles.reviewsList}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewPeriod}>
                  {review.reviewPeriod || review.period}
                </Text>
                {review.overallRating && (
                  <Text style={styles.reviewRating}>
                    {review.overallRating}/5
                  </Text>
                )}
              </View>
              {review.reviewDate && (
                <Text style={styles.reviewDate}>
                  Review Date: {new Date(review.reviewDate).toLocaleDateString()}
                </Text>
              )}
              {review.reviewer && (
                <Text style={styles.reviewer}>
                  Reviewed by: {review.reviewer}
                </Text>
              )}
              {review.comments && (
                <Text style={styles.reviewComments} numberOfLines={3}>
                  {review.comments}
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
  reviewsList: {
    padding: 16,
  },
  reviewCard: {
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewPeriod: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  reviewRating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  reviewDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reviewer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  reviewComments: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
});

