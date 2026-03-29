export type StatusColor = "blue" | "green" | "purple" | "orange" | "yellow";

export type TeamAssignmentShift = "lunch" | "dinner";

export interface Check {
  id: string;
  checkNumber: number;
  tableId: string | null;
  color?: StatusColor;
  updatedAt: unknown;
  updatedByDeviceId: string;
}

export interface Table {
  id: string;
  tableNumber: number;
  color?: StatusColor;
}

export interface RestaurantChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checkedAtMs?: number | null;
}

export interface RestaurantNote {
  id: string;
  text: string;
  kind?: "note" | "checklist";
  subject?: string | null;
  parentId?: string | null;
  pinned?: boolean;
  checklistItems?: RestaurantChecklistItem[];
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
}

export interface TeamAssignment {
  id: string;
  shift: TeamAssignmentShift;
  role: string;
  teamMember: string;
  inTime: string;
  outTime: string;
  assignedTableIds?: string[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AppState {
  checks: Check[];
  tables: Table[];
  notes: RestaurantNote[];
  teamAssignments: TeamAssignment[];
  selectedCheck: Check | null;
  selectedTable: Table | null;
}
