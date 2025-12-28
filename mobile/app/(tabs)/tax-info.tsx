/**
 * Tax Info Screen
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

export default function TaxInfoScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [taxInfo, setTaxInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    tin: '',
    ssnit: '',
    taxRelief: '',
  });

  useEffect(() => {
    loadTaxInfo();
  }, []);

  const loadTaxInfo = async () => {
    try {
      const data = await api.getTaxInfo();
      setTaxInfo(data);
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading tax info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.updateTaxInfo(formData);
      setEditing(false);
      loadTaxInfo();
      Alert.alert('Success', 'Tax information updated');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update tax information');
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
        <Text style={styles.title}>Tax Information</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editButton}>
              {taxInfo ? 'Edit' : 'Add'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => { setEditing(false); loadTaxInfo(); }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {!taxInfo && !editing ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tax information</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.addButtonText}>Add Tax Information</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>TIN (Tax Identification Number)</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.tin}
                  onChangeText={(text) => setFormData({ ...formData, tin: text })}
                  placeholder="Enter TIN"
                />
              ) : (
                <Text style={styles.value}>{taxInfo?.tin || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>SSNIT Number</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.ssnit}
                  onChangeText={(text) => setFormData({ ...formData, ssnit: text })}
                  placeholder="Enter SSNIT number"
                />
              ) : (
                <Text style={styles.value}>{taxInfo?.ssnit || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tax Relief</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.taxRelief}
                  onChangeText={(text) => setFormData({ ...formData, taxRelief: text })}
                  placeholder="Enter tax relief amount"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.value}>
                  {taxInfo?.taxRelief ? `GHS ${taxInfo.taxRelief}` : 'N/A'}
                </Text>
              )}
            </View>
          </View>
        )}
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
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});

