/**
 * Offline Role-Based Permissions
 * 
 * Enforces role-based access control for offline operations
 * 
 * Offline Permissions:
 * - Staff: View profile, Submit leave, View balances
 * - Supervisor: View only
 * - HR Officer: View + draft (no approvals offline)
 * - Director: View only
 * - System Admin: No offline admin actions
 */

/**
 * Check if role has permission for action
 * 
 * @param {string} role - User role
 * @param {string} action - Action to check
 * @param {string} resource - Resource type
 * @returns {boolean} True if allowed
 */
function hasPermission(role, action, resource) {
  // Normalize role (handle both uppercase and lowercase)
  const normalizedRole = role?.toUpperCase() || role;

  // Permission matrix
  const permissions = {
    // Staff permissions
    EMPLOYEE: {
      employees: {
        read: (staffId, targetStaffId) => staffId === targetStaffId, // Own profile only
      },
      leaveRequests: {
        read: (staffId, targetStaffId) => staffId === targetStaffId, // Own requests only
        create: (staffId) => true, // Can create own requests
        update: (staffId, targetStaffId) => staffId === targetStaffId, // Own requests only
      },
      leaveBalances: {
        read: (staffId, targetStaffId) => staffId === targetStaffId, // Own balance only
      },
      auditLogs: {
        read: false, // No audit log access
      },
    },

    // Supervisor permissions (view only)
    SUPERVISOR: {
      employees: {
        read: () => true, // Can view all
      },
      leaveRequests: {
        read: () => true, // Can view all
        create: false, // Cannot create offline
        update: false, // Cannot approve offline
      },
      leaveBalances: {
        read: () => true, // Can view all
      },
      auditLogs: {
        read: false, // No audit log access
      },
    },

    // HR Officer permissions (view + draft, no approvals offline)
    HR_OFFICER: {
      employees: {
        read: () => true,
      },
      leaveRequests: {
        read: () => true,
        create: false, // Cannot create offline (must be online for approvals)
        update: false, // Cannot approve offline
      },
      leaveBalances: {
        read: () => true,
        update: false, // Cannot update offline (server-authoritative)
      },
      auditLogs: {
        read: () => true,
      },
    },

    // Director permissions (view only)
    DIRECTOR: {
      employees: {
        read: () => true,
      },
      leaveRequests: {
        read: () => true,
        create: false,
        update: false, // Cannot approve offline
      },
      leaveBalances: {
        read: () => true,
      },
      auditLogs: {
        read: () => true,
      },
    },

    // System Admin (no offline admin actions)
    SYSTEM_ADMIN: {
      employees: {
        read: () => true,
      },
      leaveRequests: {
        read: () => true,
        create: false, // No offline admin actions
        update: false,
      },
      leaveBalances: {
        read: () => true,
        update: false, // No offline admin actions
      },
      auditLogs: {
        read: () => true,
      },
    },
  };

  // Get role permissions
  const rolePermissions = permissions[normalizedRole];
  if (!rolePermissions) {
    // Unknown role - deny by default
    return false;
  }

  // Get resource permissions
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  // Get action permission
  const actionPermission = resourcePermissions[action];
  if (actionPermission === undefined) {
    return false;
  }

  // If boolean, return directly
  if (typeof actionPermission === 'boolean') {
    return actionPermission;
  }

  // If function, it requires context (staffId, etc.)
  // This will be called by the repository layer with proper context
  return actionPermission;
}

/**
 * Check if user can read resource
 */
function canRead(role, resource, context = {}) {
  return hasPermission(role, 'read', resource);
}

/**
 * Check if user can create resource
 */
function canCreate(role, resource, context = {}) {
  const permission = hasPermission(role, 'create', resource);
  if (typeof permission === 'function') {
    return permission(context.staffId, context.targetStaffId);
  }
  return permission;
}

/**
 * Check if user can update resource
 */
function canUpdate(role, resource, context = {}) {
  const permission = hasPermission(role, 'update', resource);
  if (typeof permission === 'function') {
    return permission(context.staffId, context.targetStaffId);
  }
  return permission;
}

/**
 * Check if user can delete resource
 */
function canDelete(role, resource, context = {}) {
  // Offline: No deletions allowed (soft delete only via status updates)
  return false;
}

/**
 * Filter data based on permissions
 * 
 * @param {string} role - User role
 * @param {string} resource - Resource type
 * @param {Array} data - Data to filter
 * @param {Object} context - User context (staffId, etc.)
 * @returns {Array} Filtered data
 */
function filterByPermissions(role, resource, data, context = {}) {
  if (!canRead(role, resource, context)) {
    return [];
  }

  // If user can read all, return all
  if (hasPermission(role, 'read', resource) === true) {
    return data;
  }

  // Otherwise, filter by context (e.g., own records only)
  const permission = hasPermission(role, 'read', resource);
  if (typeof permission === 'function') {
    return data.filter(item => {
      const targetStaffId = item.staff_id || item.staffId;
      return permission(context.staffId, targetStaffId);
    });
  }

  return [];
}

module.exports = {
  hasPermission,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  filterByPermissions,
};

