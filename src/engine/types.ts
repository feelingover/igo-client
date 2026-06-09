// ルールエンジンのインターフェース（SPEC 6章）
import type { BoardState, Point, StoneColor } from '../types';

export interface IRuleEngine {
  emptyState(size: number): EngineState;
  isLegalMove(state: EngineState, color: StoneColor, point: Point): boolean;
  // 着手後の新状態を返す（取り石反映済み・イミュータブル）
  playMove(state: EngineState, color: StoneColor, point: Point): EngineState;
  // パス後の新状態を返す。
  // NOTE: SPEC の IRuleEngine には pass が無かったが、EngineState は外部から
  // 不透明（unknown）なため「両パス終局（isGameOver）」を engine 内で正しく
  // 判定するにはパスも状態遷移として engine を通す必要がある。最小の追加。
  pass(state: EngineState, color: StoneColor): EngineState;
  // prev→next の差分で取れた石数
  capturesBetween(prev: EngineState, next: EngineState): number;
  isGameOver(state: EngineState): boolean; // 両パス
  // area scoring（中国ルール）。komi は引数で受ける（デフォ 6.5 など）
  score(state: EngineState, komi: number): { winner: StoneColor; margin: number };
  toBoardState(state: EngineState): BoardState;
}

export type EngineState = unknown; // アダプタ内部型。外には漏らさない
