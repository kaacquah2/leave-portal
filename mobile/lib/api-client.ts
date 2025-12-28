/**
 * API Client for React Native
 * Connects to the Next.js API endpoints
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-app.vercel.app';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Token storage key
const TOKEN_KEY = 'auth_token';

/**
 * Store authentication token securely
 */
export async function storeToken(token: string): Promise<void> {
  try {
    // Use SecureStore for sensitive data
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    // Also store in AsyncStorage for quick access
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
}

/**
 * Get authentication token
 */
export async function getToken(): Promise<string | null> {
  try {
    // Try SecureStore first
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return token;
    
    // Fallback to AsyncStorage
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * Remove authentication token
 */
export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

// Request interceptor - add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await removeToken();
      // You can dispatch a logout action here if using Redux/Context
    }
    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Authentication
  async login(email: string, password: string) {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    
    // Store token if provided
    if (response.data.token) {
      await storeToken(response.data.token);
    }
    
    return response.data;
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await removeToken();
    }
  },

  async getCurrentUser() {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  // Leave Management
  async getLeaves(params?: { status?: string; type?: string }) {
    const response = await apiClient.get('/api/leaves', { params });
    return response.data;
  },

  async createLeave(leaveData: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachments?: string[];
  }) {
    const response = await apiClient.post('/api/leaves', leaveData);
    return response.data;
  },

  async getLeave(id: string) {
    const response = await apiClient.get(`/api/leaves/${id}`);
    return response.data;
  },

  async cancelLeave(id: string) {
    const response = await apiClient.post(`/api/leaves/${id}/cancel`);
    return response.data;
  },

  // Leave Balances
  async getLeaveBalances(staffId?: string) {
    const url = staffId ? `/api/balances/${staffId}` : '/api/balances';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Staff Management
  async getStaff() {
    const response = await apiClient.get('/api/staff');
    return response.data;
  },

  async getStaffMember(id: string) {
    const response = await apiClient.get(`/api/staff/${id}`);
    return response.data;
  },

  // Notifications
  async getNotifications() {
    const response = await apiClient.get('/api/notifications');
    return response.data;
  },

  async markNotificationRead(id: string) {
    const response = await apiClient.patch(`/api/notifications/${id}`);
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await apiClient.post('/api/notifications/mark-read');
    return response.data;
  },

  // Documents
  async getDocuments(params?: { staffId?: string; type?: string; category?: string; search?: string }) {
    const response = await apiClient.get('/api/documents', { params });
    return response.data;
  },

  async getDocument(id: string) {
    const response = await apiClient.get(`/api/documents/${id}`);
    return response.data;
  },

  async uploadDocument(file: any, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await apiClient.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteDocument(id: string) {
    const response = await apiClient.delete(`/api/documents/${id}`);
    return response.data;
  },

  // Employee Data
  async getBankAccount() {
    const response = await apiClient.get('/api/employee/bank-account');
    return response.data;
  },

  async updateBankAccount(data: any) {
    const response = await apiClient.patch('/api/employee/bank-account', data);
    return response.data;
  },

  async getBenefits() {
    const response = await apiClient.get('/api/employee/benefits');
    return response.data;
  },

  async getCertifications() {
    const response = await apiClient.get('/api/employee/certifications');
    return response.data;
  },

  async createCertification(data: any) {
    const response = await apiClient.post('/api/employee/certifications', data);
    return response.data;
  },

  async getEmergencyContacts() {
    const response = await apiClient.get('/api/employee/emergency-contacts');
    return response.data;
  },

  async updateEmergencyContacts(data: any) {
    const response = await apiClient.patch('/api/employee/emergency-contacts', data);
    return response.data;
  },

  async getTaxInfo() {
    const response = await apiClient.get('/api/employee/tax-info');
    return response.data;
  },

  async updateTaxInfo(data: any) {
    const response = await apiClient.patch('/api/employee/tax-info', data);
    return response.data;
  },

  async getTrainingRecords() {
    const response = await apiClient.get('/api/employee/training-records');
    return response.data;
  },

  // Payslips
  async getPayslips(params?: { month?: string; year?: string }) {
    const response = await apiClient.get('/api/payslips', { params });
    return response.data;
  },

  async getPayslip(id: string) {
    const response = await apiClient.get(`/api/payslips/${id}`);
    return response.data;
  },

  // Performance Reviews
  async getPerformanceReviews(staffId?: string) {
    const url = staffId ? `/api/performance-reviews?staffId=${staffId}` : '/api/performance-reviews';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Attendance
  async getAttendance(params?: { staffId?: string; startDate?: string; endDate?: string }) {
    const response = await apiClient.get('/api/attendance', { params });
    return response.data;
  },

  async clockIn() {
    const response = await apiClient.post('/api/attendance/clock-in');
    return response.data;
  },

  async clockOut() {
    const response = await apiClient.post('/api/attendance/clock-out');
    return response.data;
  },

  // Timesheets
  async getTimesheets(params?: { staffId?: string; startDate?: string; endDate?: string; status?: string }) {
    const response = await apiClient.get('/api/timesheets', { params });
    return response.data;
  },

  async createTimesheet(data: any) {
    const response = await apiClient.post('/api/timesheets', data);
    return response.data;
  },

  async approveTimesheet(id: string, approved: boolean) {
    const response = await apiClient.post(`/api/timesheets/${id}/approve`, { approved });
    return response.data;
  },

  // Leave Policies
  async getLeavePolicies() {
    const response = await apiClient.get('/api/leave-policies');
    return response.data;
  },

  async createLeavePolicy(data: any) {
    const response = await apiClient.post('/api/leave-policies', data);
    return response.data;
  },

  async updateLeavePolicy(id: string, data: any) {
    const response = await apiClient.patch(`/api/leave-policies/${id}`, data);
    return response.data;
  },

  // Leave Templates
  async getLeaveTemplates() {
    const response = await apiClient.get('/api/leave-templates');
    return response.data;
  },

  // Holidays
  async getHolidays(params?: { year?: string }) {
    const response = await apiClient.get('/api/holidays', { params });
    return response.data;
  },

  async createHoliday(data: any) {
    const response = await apiClient.post('/api/holidays', data);
    return response.data;
  },

  // Staff Management (HR/Admin)
  async createStaff(data: any) {
    const response = await apiClient.post('/api/staff', data);
    return response.data;
  },

  async updateStaff(id: string, data: any) {
    const response = await apiClient.patch(`/api/staff/${id}`, data);
    return response.data;
  },

  async deleteStaff(id: string) {
    const response = await apiClient.delete(`/api/staff/${id}`);
    return response.data;
  },

  // Leave Approvals (Manager/HR)
  async approveLeave(id: string, approved: boolean, comments?: string) {
    const response = await apiClient.patch(`/api/leaves/${id}`, {
      status: approved ? 'approved' : 'rejected',
      comments,
    });
    return response.data;
  },

  async getLeaveApprovalLetter(id: string) {
    const response = await apiClient.get(`/api/leaves/${id}/approval-letter`);
    return response.data;
  },

  // Reports
  async getAnalytics(params?: { startDate?: string; endDate?: string; department?: string }) {
    const response = await apiClient.get('/api/reports/analytics', { params });
    return response.data;
  },

  async exportReport(type: string, params?: any) {
    const response = await apiClient.post('/api/reports/export', { type, ...params });
    return response.data;
  },

  // Admin APIs
  async getAdminUsers() {
    const response = await apiClient.get('/api/admin/users');
    return response.data;
  },

  async createAdminUser(data: any) {
    const response = await apiClient.post('/api/admin/users', data);
    return response.data;
  },

  async updateAdminUser(id: string, data: any) {
    const response = await apiClient.patch(`/api/admin/users/${id}`, data);
    return response.data;
  },

  async getAuditLogs(params?: { userId?: string; action?: string; startDate?: string; endDate?: string }) {
    const response = await apiClient.get('/api/admin/audit-logs', { params });
    return response.data;
  },

  async getPasswordResetRequests() {
    const response = await apiClient.get('/api/admin/password-reset-requests');
    return response.data;
  },

  // Disciplinary Actions
  async getDisciplinaryActions(params?: { staffId?: string; actionType?: string; status?: string }) {
    const response = await apiClient.get('/api/disciplinary', { params });
    return response.data;
  },

  async createDisciplinaryAction(data: any) {
    const response = await apiClient.post('/api/disciplinary', data);
    return response.data;
  },

  // Recruitment
  async getJobs(params?: { status?: string; department?: string }) {
    const response = await apiClient.get('/api/recruitment/jobs', { params });
    return response.data;
  },

  async createJob(data: any) {
    const response = await apiClient.post('/api/recruitment/jobs', data);
    return response.data;
  },

  async getCandidates(params?: { jobId?: string; status?: string }) {
    const response = await apiClient.get('/api/recruitment/candidates', { params });
    return response.data;
  },

  async createCandidate(data: any) {
    const response = await apiClient.post('/api/recruitment/candidates', data);
    return response.data;
  },

  // Salary
  async getSalaryStructures(params?: { staffId?: string }) {
    const response = await apiClient.get('/api/salary', { params });
    return response.data;
  },

  async createSalaryStructure(data: any) {
    const response = await apiClient.post('/api/salary', data);
    return response.data;
  },

  // Push Notifications
  async subscribeToPushNotifications(subscription: any) {
    const response = await apiClient.post('/api/push/subscribe', subscription);
    return response.data;
  },

  async unsubscribeFromPushNotifications() {
    const response = await apiClient.post('/api/push/unsubscribe');
    return response.data;
  },
};

export default apiClient;

