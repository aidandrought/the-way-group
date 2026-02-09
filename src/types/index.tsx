export type StatusColor = "blue" | "green" | "purple";

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

export interface AppState {
  checks: Check[];
  tables: Table[];
  selectedCheck: Check | null;
  selectedTable: Table | null;
}
