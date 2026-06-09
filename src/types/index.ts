// ドメイン型定義（SPEC 5章）

export type StoneColor = 'black' | 'white';

// 0-indexed, 左上原点。x=列, y=行
export type Point = { x: number; y: number };

export type Move =
  | { type: 'play'; color: StoneColor; point: Point; moveNumber: number }
  | { type: 'pass'; color: StoneColor; moveNumber: number }
  | { type: 'resign'; color: StoneColor; moveNumber: number };

export type BoardState = (StoneColor | null)[][]; // board[y][x]

export type GameStatus = 'playing' | 'finished';

export interface GameState {
  gameId: string;
  boardSize: number; // 9
  moves: Move[]; // 真実
  currentBoard: BoardState; // moves から導出したキャッシュ
  nextToPlay: StoneColor; // 黒先
  captures: { black: number; white: number }; // アゲハマ
  status: GameStatus;
  result?: string; // 例 "B+5.5", "W+R"(投了)
}

export const opponent = (color: StoneColor): StoneColor =>
  color === 'black' ? 'white' : 'black';
