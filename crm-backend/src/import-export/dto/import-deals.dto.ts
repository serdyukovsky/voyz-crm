/**
 * DTO for import deals request
 * CRITICAL: CSV parsing is done on frontend, backend receives parsed rows
 */

export interface ImportDealsDto {
  rows: Record<string, string>[]; // Parsed CSV rows from frontend
  mapping: {
    title?: string; // CSV column name for title
    number?: string;
    stageId?: string;
    ownerId?: string;
    amount?: string;
    budget?: string;
    email?: string;
    phone?: string;
    assignedToId?: string;
    companyId?: string;
    expectedCloseAt?: string;
    description?: string;
    tags?: string;
    rejectionReasons?: string;
    customFields?: Record<string, string>;
  };
  pipelineId: string;
  workspaceId?: string;
  defaultAssignedToId?: string;
  userValueMapping?: Record<string, string>; // Manual mapping: { "CSV value": "user-id" }
}






