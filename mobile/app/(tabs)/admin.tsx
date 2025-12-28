/**
 * Admin Screen (HR/Admin only)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'expo-router';

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();

  if (user?.role !== 'hr' && user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>You don't have permission to access this page.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff Management</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>👥 Manage Staff</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>➕ Add New Staff</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Management</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>✅ Approve Leaves</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>📊 Leave Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>⚙️ Leave Policies</Text>
        </TouchableOpacity>
      </View>

      {user?.role === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Administration</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>👤 User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>📋 Audit Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>⚙️ System Settings</Text>
          </TouchableOpacity>
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
  header: {
    backgroundColor: '#1e40af',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 48,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});

