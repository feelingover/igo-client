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

// 交点の帰属（SPEC 6章 area scoring）。石があればその色、
// 空点は「片方の色だけに囲まれていれば」その色＝地。null はダメ（どちらの地でもない）。
export type PointOwner = StoneColor | null;

// 片側のスコア内訳。中国ルールなので 石 + 地（+ 白のみコミ）。
export interface ScoreBreakdown {
  stones: number; // 盤上に残っている自分の石数
  territory: number; // 自分だけが囲んだ空点＝地
  komi: number; // 黒は 0、白はコミ（例 6.5）
  total: number; // stones + territory + komi
}

// 終局時のスコア詳細。UI で地を可視化するために内訳と帰属マップを持つ。
export interface ScoreResult {
  winner: StoneColor;
  margin: number; // 勝ち幅（目数）
  black: ScoreBreakdown;
  white: ScoreBreakdown;
  ownership: PointOwner[][]; // ownership[y][x]（BoardState と同じ形）
}

export interface GameState {
  gameId: string;
  boardSize: number; // 9
  moves: Move[]; // 真実
  currentBoard: BoardState; // moves から導出したキャッシュ
  nextToPlay: StoneColor; // 黒先
  captures: { black: number; white: number }; // アゲハマ
  status: GameStatus;
  result?: string; // 例 "B+5.5", "W+R"(投了)
  score?: ScoreResult; // 両パス終局時のみ（投了は地を数えないので undefined）
}

export const opponent = (color: StoneColor): StoneColor =>
  color === 'black' ? 'white' : 'black';
