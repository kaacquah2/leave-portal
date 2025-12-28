/**
 * Emergency Contacts Screen
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

export default function EmergencyContactsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await api.getEmergencyContacts();
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }

    try {
      await api.updateEmergencyContacts([...contacts, formData]);
      setContacts([...contacts, formData]);
      setFormData({ name: '', relationship: '', phone: '', email: '', address: '' });
      setEditing(false);
      Alert.alert('Success', 'Emergency contact added');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add contact');
    }
  };

  const handleDelete = async (index: number) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = contacts.filter((_, i) => i !== index);
              await api.updateEmergencyContacts(updated);
              setContacts(updated);
              Alert.alert('Success', 'Contact deleted');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete contact');
            }
          },
        },
      ]
    );
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
        <Text style={styles.title}>Emergency Contacts</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditing(false)}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Emergency Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Relationship"
            value={formData.relationship}
            onChangeText={(text) => setFormData({ ...formData, relationship: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone *"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
            <Text style={styles.saveButtonText}>Save Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contactsList}>
        {contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No emergency contacts</Text>
          </View>
        ) : (
          contacts.map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <TouchableOpacity onPress={() => handleDelete(index)}>
                  <Text style={styles.deleteButton}>Delete</Text>
                </TouchableOpacity>
              </View>
              {contact.relationship && (
                <Text style={styles.contactDetail}>Relationship: {contact.relationship}</Text>
              )}
              <Text style={styles.contactDetail}>Phone: {contact.phone}</Text>
              {contact.email && (
                <Text style={styles.contactDetail}>Email: {contact.email}</Text>
              )}
              {contact.address && (
                <Text style={styles.contactDetail}>Address: {contact.address}</Text>
              )}
            </View>
          ))
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
  addButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    color: '#fff',
    fontSize: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    padding: 16,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  contactCard: {
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
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

