import type { RestaurantId } from './restaurants';

export type TableLayoutColumn = { key: string; rows: number[][] };
export type TableLayoutCell = number | null;
export type TableLayoutRow = TableLayoutCell[];
export type RestaurantTableLayoutColumn = { key: string; rows: TableLayoutRow[] };

const MILL_CREEK_TABLE_COLUMNS: RestaurantTableLayoutColumn[] = [
  { key: 'H', rows: [[1, 2, 3], [6, 5, 4], [10, 11, 12]] },
  { key: 'B', rows: [[20, 21, 22], [25, 24, 23]] },
  { key: 'D', rows: [[26, 27, 28, 30], [34, 33, 32, 31], [40, 41, 43, 44]] },
  { key: 'W', rows: [[50, 51, 53, 54, 60], [64, 63, 62, 61, 70]] },
  { key: 'P', rows: [[71, 72, 73, 74], [78, 77, 76, 75]] },
];

// POE layout (restaurantId: "everett"): mapped to 38 active table slots.
const EVERETT_TABLE_COLUMNS: RestaurantTableLayoutColumn[] = [
  { key: 'A', rows: [[1, 2, 3, 4, 5, 6]] },
  { key: 'B', rows: [[7, 8, 9, 10, 11, 12]] },
  { key: 'C', rows: [[13, 14, 15, 16, 17, 18]] },
  { key: 'D', rows: [[19, 20, 21, 22, 23, 24]] },
  { key: 'E', rows: [[25, 26, 27, 28, 29, 30]] },
  { key: 'F', rows: [[31, 32, 33, 34, 35, 36]] },
  { key: 'G', rows: [[37, 38]] },
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
