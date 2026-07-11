// 모든 State 화면이 공유하는 박스 그리기 상수. 이전에는 menu/index.js와
// menu/devModeScreen.js에 각각 중복 정의되어 있었다.
const BOX_WIDTH = 50;
const DIVIDER = "=".repeat(BOX_WIDTH);
const THIN_DIVIDER = "─".repeat(BOX_WIDTH);

export { BOX_WIDTH, DIVIDER, THIN_DIVIDER };
