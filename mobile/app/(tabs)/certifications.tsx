/**
 * Certifications Screen
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

export default function CertificationsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
  });

  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      const data = await api.getCertifications();
      setCertifications(data || []);
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.issuer) {
      Alert.alert('Error', 'Name and issuer are required');
      return;
    }

    try {
      await api.createCertification(formData);
      setCertifications([...certifications, formData]);
      setFormData({
        name: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        certificateNumber: '',
      });
      setEditing(false);
      loadCertifications();
      Alert.alert('Success', 'Certification added');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add certification');
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
        <Text style={styles.title}>Certifications</Text>
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
          <Text style={styles.formTitle}>Add Certification</Text>
          <TextInput
            style={styles.input}
            placeholder="Certification Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Issuing Organization *"
            value={formData.issuer}
            onChangeText={(text) => setFormData({ ...formData, issuer: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Issue Date (YYYY-MM-DD)"
            value={formData.issueDate}
            onChangeText={(text) => setFormData({ ...formData, issueDate: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Expiry Date (YYYY-MM-DD)"
            value={formData.expiryDate}
            onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Certificate Number"
            value={formData.certificateNumber}
            onChangeText={(text) => setFormData({ ...formData, certificateNumber: text })}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
            <Text style={styles.saveButtonText}>Save Certification</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.certificationsList}>
        {certifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No certifications</Text>
          </View>
        ) : (
          certifications.map((cert, index) => (
            <View key={index} style={styles.certificationCard}>
              <Text style={styles.certificationName}>{cert.name}</Text>
              <Text style={styles.certificationIssuer}>Issued by: {cert.issuer}</Text>
              {cert.issueDate && (
                <Text style={styles.certificationDate}>
                  Issued: {new Date(cert.issueDate).toLocaleDateString()}
                </Text>
              )}
              {cert.expiryDate && (
                <Text style={styles.certificationDate}>
                  Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                </Text>
              )}
              {cert.certificateNumber && (
                <Text style={styles.certificationNumber}>
                  Number: {cert.certificateNumber}
                </Text>
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
  certificationsList: {
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
  certificationCard: {
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
  certificationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  certificationIssuer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  certificationDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  certificationNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

