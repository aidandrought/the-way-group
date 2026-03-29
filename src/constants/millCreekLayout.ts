export const MILL_CREEK_CANVAS_WIDTH = 1760;
export const MILL_CREEK_CANVAS_HEIGHT = 1020;

export type MillCreekLayoutItem = {
  tableNumber: number;
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: number;
};

export const MILL_CREEK_TABLE_LAYOUT: readonly MillCreekLayoutItem[] = [
  { tableNumber: 1, key: 'mc-h-1', left: 86, top: 248, width: 84, height: 196, borderRadius: 18 },
  { tableNumber: 2, key: 'mc-h-2', left: 250, top: 248, width: 84, height: 196, borderRadius: 18 },
  { tableNumber: 3, key: 'mc-h-3', left: 414, top: 248, width: 84, height: 196, borderRadius: 18 },
  { tableNumber: 6, key: 'mc-h-6', left: 86, top: 558, width: 84, height: 196, borderRadius: 18 },
  { tableNumber: 5, key: 'mc-h-5', left: 250, top: 558, width: 84, height: 196, borderRadius: 18 },
  { tableNumber: 4, key: 'mc-h-4', left: 414, top: 558, width: 84, height: 196, borderRadius: 18 },
  { tableNumber: 10, key: 'mc-h-7', left: 1092, top: 28, width: 228, height: 96, borderRadius: 20 },
  { tableNumber: 12, key: 'mc-bar', left: 548, top: 28, width: 520, height: 96, borderRadius: 16 },
  { tableNumber: 11, key: 'mc-patio', left: 1528, top: 320, width: 224, height: 560, borderRadius: 24 },

  { tableNumber: 20, key: 'mc-b-1', left: 558, top: 404, width: 166, height: 110, borderRadius: 18 },
  { tableNumber: 21, key: 'mc-b-2', left: 748, top: 404, width: 166, height: 110, borderRadius: 18 },
  { tableNumber: 22, key: 'mc-b-3', left: 938, top: 404, width: 166, height: 110, borderRadius: 18 },
  { tableNumber: 25, key: 'mc-b-6', left: 558, top: 564, width: 166, height: 110, borderRadius: 18 },
  { tableNumber: 24, key: 'mc-b-5', left: 748, top: 564, width: 166, height: 110, borderRadius: 18 },
  { tableNumber: 23, key: 'mc-b-4', left: 938, top: 564, width: 166, height: 110, borderRadius: 18 },

  { tableNumber: 26, key: 'mc-d-1', left: 564, top: 238, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 27, key: 'mc-d-2', left: 708, top: 238, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 28, key: 'mc-d-3', left: 852, top: 238, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 30, key: 'mc-d-4', left: 996, top: 238, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 31, key: 'mc-d-5', left: 1172, top: 238, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 32, key: 'mc-d-6', left: 1172, top: 412, width: 96, height: 96, borderRadius: 16 },
  { tableNumber: 33, key: 'mc-d-7', left: 1172, top: 574, width: 96, height: 96, borderRadius: 16 },
  { tableNumber: 34, key: 'mc-d-8', left: 1172, top: 742, width: 96, height: 96, borderRadius: 16 },
  { tableNumber: 40, key: 'mc-d-9', left: 996, top: 742, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 41, key: 'mc-d-10', left: 852, top: 742, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 43, key: 'mc-d-11', left: 708, top: 742, width: 98, height: 98, borderRadius: 16 },
  { tableNumber: 44, key: 'mc-d-12', left: 564, top: 742, width: 98, height: 98, borderRadius: 16 },

  { tableNumber: 50, key: 'mc-w-1', left: 1364, top: 172, width: 102, height: 120, borderRadius: 16 },
  { tableNumber: 51, key: 'mc-w-2', left: 1364, top: 330, width: 102, height: 120, borderRadius: 16 },
  { tableNumber: 53, key: 'mc-w-3', left: 1364, top: 488, width: 102, height: 120, borderRadius: 16 },
  { tableNumber: 54, key: 'mc-w-4', left: 1364, top: 790, width: 102, height: 120, borderRadius: 16 },
  { tableNumber: 60, key: 'mc-w-5', left: 1242, top: 892, width: 94, height: 94, borderRadius: 16 },
  { tableNumber: 61, key: 'mc-w-6', left: 1108, top: 892, width: 94, height: 94, borderRadius: 16 },
  { tableNumber: 62, key: 'mc-w-7', left: 974, top: 892, width: 94, height: 94, borderRadius: 16 },
  { tableNumber: 63, key: 'mc-w-8', left: 840, top: 892, width: 94, height: 94, borderRadius: 16 },
  { tableNumber: 64, key: 'mc-w-9', left: 340, top: 886, width: 454, height: 94, borderRadius: 18 },
  { tableNumber: 70, key: 'mc-w-10', left: 186, top: 886, width: 114, height: 94, borderRadius: 18 },

] as const;
