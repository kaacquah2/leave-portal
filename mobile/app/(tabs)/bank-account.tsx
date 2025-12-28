/**
 * Bank Account Screen
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

export default function BankAccountScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    branch: '',
  });

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const data = await api.getBankAccount();
      setAccount(data);
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading bank account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.bankName || !formData.accountNumber) {
      Alert.alert('Error', 'Bank name and account number are required');
      return;
    }

    try {
      await api.updateBankAccount(formData);
      setEditing(false);
      loadAccount();
      Alert.alert('Success', 'Bank account information updated');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update bank account');
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
        <Text style={styles.title}>Bank Account</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editButton}>
              {account ? 'Edit' : 'Add'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => { setEditing(false); loadAccount(); }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {!account && !editing ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bank account information</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.addButtonText}>Add Bank Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Bank Name *</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.bankName}
                  onChangeText={(text) => setFormData({ ...formData, bankName: text })}
                  placeholder="Enter bank name"
                />
              ) : (
                <Text style={styles.value}>{account?.bankName || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Number *</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.accountNumber}
                  onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                  placeholder="Enter account number"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.value}>{account?.accountNumber || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.accountName}
                  onChangeText={(text) => setFormData({ ...formData, accountName: text })}
                  placeholder="Enter account name"
                />
              ) : (
                <Text style={styles.value}>{account?.accountName || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Branch</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.branch}
                  onChangeText={(text) => setFormData({ ...formData, branch: text })}
                  placeholder="Enter branch"
                />
              ) : (
                <Text style={styles.value}>{account?.branch || 'N/A'}</Text>
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

