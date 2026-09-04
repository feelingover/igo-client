// 結果・目数の日本語表記（SPEC 9章）
// ControlBar / ScorePanel が共通で使う表示フォーマット。
import type { StoneColor } from '../types';

export const colorJa = (c: StoneColor): string => (c === 'black' ? '黒' : '白');

// 目数の表記。コミ込みで .5 が出るので、整数はそのまま／端数は小数1桁。
export const formatPoints = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

// "B+5.5" → "黒 5.5目勝ち" / "W+R" → "白 中押し勝ち"
export function formatResult(result?: string): string {
  if (!result) return '';
  const [side, margin] = result.split('+');
  const who = side === 'B' ? '黒' : '白';
  if (margin === 'R') return `${who} 中押し勝ち`;
  return `${who} ${margin}目勝ち`;
}
