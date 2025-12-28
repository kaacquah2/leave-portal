/**
 * Staff Management Screen (HR)
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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api-client';

export default function StaffManagementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStaff = async () => {
    try {
      const data = await api.getStaff();
      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const filteredStaff = staff.filter((member) =>
    `${member.firstName} ${member.lastName} ${member.staffId}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

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
        <RefreshControl refreshing={refreshing} onRefresh={loadStaff} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Staff Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/staff-form')}
        >
          <Text style={styles.addButtonText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredStaff.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No staff found' : 'No staff members'}
          </Text>
        </View>
      ) : (
        <View style={styles.staffList}>
          {filteredStaff.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.staffCard}
              onPress={() => router.push({
                pathname: '/staff-detail',
                params: { id: member.id },
              } as any)}
            >
              <View style={styles.staffHeader}>
                <Text style={styles.staffName}>
                  {member.firstName} {member.lastName}
                </Text>
                <Text style={styles.staffId}>{member.staffId}</Text>
              </View>
              <Text style={styles.staffDepartment}>
                {member.department || 'No department'}
              </Text>
              <Text style={styles.staffPosition}>
                {member.position || 'No position'}
              </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  staffList: {
    padding: 16,
  },
  staffCard: {
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
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  staffId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  staffDepartment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  staffPosition: {
    fontSize: 14,
    color: '#666',
  },
});

