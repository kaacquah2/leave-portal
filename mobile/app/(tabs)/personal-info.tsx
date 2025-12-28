/**
 * Personal Info Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api-client';

export default function PersonalInfoScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      if (user?.staffId) {
        const data = await api.getStaffMember(user.staffId);
        setStaff(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (user?.staffId) {
        await api.updateStaff(user.staffId, formData);
        setEditing(false);
        loadStaff();
        Alert.alert('Success', 'Personal information updated');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update information');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!staff) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Staff information not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Personal Information</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => { setEditing(false); setFormData(staff); }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>First Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.firstName || ''}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              />
            ) : (
              <Text style={styles.value}>{staff.firstName || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.lastName || ''}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              />
            ) : (
              <Text style={styles.value}>{staff.lastName || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'N/A'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Staff ID</Text>
            <Text style={styles.value}>{staff.staffId || 'N/A'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.department || ''}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
              />
            ) : (
              <Text style={styles.value}>{staff.department || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Position</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.position || ''}
                onChangeText={(text) => setFormData({ ...formData, position: text })}
              />
            ) : (
              <Text style={styles.value}>{staff.position || 'N/A'}</Text>
            )}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});

