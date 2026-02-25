import type { RestaurantId } from './restaurants';

export type TableLayoutColumn = { key: string; rows: number[][] };
export type TableLayoutCell = number | null;
export type TableLayoutRow = TableLayoutCell[];
export type RestaurantTableLayoutColumn = { key: string; rows: TableLayoutRow[] };

const MILL_CREEK_TABLE_COLUMNS: RestaurantTableLayoutColumn[] = [
  { key: 'A', rows: [[1, 2, 3], [4, 5, 6]] },
  { key: 'B', rows: [[10], [11]] },
  { key: 'C', rows: [[20], [21], [22], [23]] },
  { key: 'D', rows: [[24], [25], [26], [27], [28]] },
  { key: 'E', rows: [[30], [31], [32], [33], [34]] },
  { key: 'F', rows: [[40, 41, 43, 44], [50, 51, 53, 54]] },
  { key: 'G', rows: [[60], [61], [62], [63], [64]] },
  { key: 'H', rows: [[70, 71], [72, 73], [74, 75], [76, 77], [78]] },
];

// Everett layout based on provided floor plan image, arranged for the existing horizontal table map UI.
const EVERETT_TABLE_COLUMNS: RestaurantTableLayoutColumn[] = [
  // Main left block: stack 1s / 20s / 40s bands so it reads like the floor map
  { key: 'A', rows: [[1], [20], [40]] },
  { key: 'B', rows: [[2], [21], [null]] },
  { key: 'C', rows: [[3], [22], [41]] },
  { key: 'D', rows: [[4], [23], [null]] },
  { key: 'E', rows: [[5], [24], [42]] },
  { key: 'F', rows: [[6], [25], [null]] },
  { key: 'G', rows: [[10], [26], [43]] },
  { key: 'H', rows: [[null], [null], [44]] },

  // Right-side lower clusters: 30s, 34-39, and the 11-16 two-top / two-mid / two-bottom stack
  { key: 'I', rows: [[30], [34], [11, 12]] },
  { key: 'J', rows: [[31], [35], [13, 14]] },
  { key: 'K', rows: [[32], [36], [15, 16]] },
  { key: 'L', rows: [[33], [37]] },
  { key: 'M', rows: [[null], [38]] },
  { key: 'N', rows: [[null], [39]] },
];

// Mukilteo simplified layout: ordered by zones with all required tables.
const MUKILTEO_TABLE_COLUMNS: RestaurantTableLayoutColumn[] = [
  // Zone 4 patio (left-side of map)
  { key: 'A', rows: [[60, 61, 62, 63, 64], [65, 66, 67, 68, 69]] },
  // Zone 3 windows / tops
  { key: 'B', rows: [[50, 51, 52], [40, 41, 42], [43, 44, 6]] },
  // Zone 2 booths / 2-tops (plus 5)
  { key: 'C', rows: [[30, 31], [32, 33], [34, 5]] },
  // Zone 1 high tops & bar (right-side of map)
  { key: 'D', rows: [[10]] },
  { key: 'E', rows: [[null], [1], [null]] },
  { key: 'F', rows: [[null], [2], [null]] },
  { key: 'G', rows: [[null], [3], [null]] },
  { key: 'H', rows: [[null], [4], [null]] },
];

export function getTableLayoutColumns(restaurantId: RestaurantId): RestaurantTableLayoutColumn[] {
  if (restaurantId === 'everett') return EVERETT_TABLE_COLUMNS;
  if (restaurantId === 'mukilteo') return MUKILTEO_TABLE_COLUMNS;
  return MILL_CREEK_TABLE_COLUMNS;
}

export function getTableNumbersForRestaurant(restaurantId: RestaurantId): number[] {
  const numbers = new Set<number>();
  getTableLayoutColumns(restaurantId).forEach(column => {
    column.rows.forEach(row => {
      row.forEach(tableNumber => {
        if (typeof tableNumber === 'number') {
          numbers.add(tableNumber);
        }
      });
    });
  });
  if (restaurantId === 'mukilteo') {
    numbers.add(70); // Event Space (custom labeled area in Mukilteo layout)
  }
  return [...numbers].sort((a, b) => a - b);
}
