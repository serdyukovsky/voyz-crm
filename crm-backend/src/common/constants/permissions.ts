export const PERMISSIONS = {
  // Deals
  DEALS_VIEW: 'deals.view',
  DEALS_CREATE: 'deals.create',
  DEALS_UPDATE: 'deals.update',
  DEALS_DELETE: 'deals.delete',
  DEALS_UPDATE_RESTRICTED: 'deals.update_restricted', // Can update only unrestricted fields

  // Tasks
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_UPDATE: 'tasks.update',
  TASKS_DELETE: 'tasks.delete',

  // Fields
  FIELDS_VIEW: 'fields.view',
  FIELDS_MANAGE: 'fields.manage', // Create, update, delete custom fields

  // Pipelines
  PIPELINES_VIEW: 'pipelines.view',
  PIPELINES_MANAGE: 'pipelines.manage',

  // Users
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',

  // Import/Export
  IMPORT: 'import',
  EXPORT: 'export',

  // Integrations
  INTEGRATIONS_VIEW: 'integrations.view',
  INTEGRATIONS_MANAGE: 'integrations.manage',

  // Logs
  LOGS_VIEW: 'logs.view',
} as const;

export const ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),
  MANAGER: [
    PERMISSIONS.DEALS_VIEW,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_UPDATE,
    PERMISSIONS.DEALS_UPDATE_RESTRICTED,
    // MANAGER cannot delete deals
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    // MANAGER can delete only own tasks (checked in controller)
    PERMISSIONS.FIELDS_VIEW,
    PERMISSIONS.PIPELINES_VIEW,
    // MANAGER cannot manage pipelines (create/delete)
    PERMISSIONS.USERS_VIEW,
    // MANAGER cannot manage users (create/update/delete)
    PERMISSIONS.EXPORT,
    PERMISSIONS.INTEGRATIONS_VIEW,
    PERMISSIONS.LOGS_VIEW,
  ],
  VIEWER: [
    PERMISSIONS.DEALS_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.FIELDS_VIEW,
    PERMISSIONS.PIPELINES_VIEW,
  ],
} as const;

