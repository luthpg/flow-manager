// --- Constants (Grid System) ---
export const GRID_SIZE = 20; // 1 unit = 20px

// Layout Constraints
export const NODE_W_WIDE = GRID_SIZE * 7; // 7 units
export const NODE_W_SQUARE = GRID_SIZE * 3; // 3 units
export const NODE_H = GRID_SIZE * 3; // 3 units
export const GAP_SIZE = GRID_SIZE * 2; // 2 units

// スロットサイズ (枠 + 隙間) = 180x100
export const SLOT_WIDTH = NODE_W_WIDE + GAP_SIZE;
export const SLOT_HEIGHT = NODE_H + GAP_SIZE;

// 中央寄せオフセット (スロット内の余白 / 2)
export const OFFSET_Y = GAP_SIZE / 2;
