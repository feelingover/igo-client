// 自前ルールエンジン（SPEC 6章のフォールバック #3）
//
// 着手禁止（自殺手）・取り・コウ（同形反復＝positional superko）・area scoring を実装。
// 純粋な盤ロジックのみで RN/DOM 依存ゼロ。Node でそのまま動作検証できる。
import type { BoardState, Point, StoneColor } from '../types';
import { opponent } from '../types';
import type { EngineState, IRuleEngine } from './types';

// engine 内部状態（外には EngineState=unknown として漏らさない）
export interface SelfEngineState {
  size: number;
  board: BoardState; // board[y][x]
  toPlay: StoneColor;
  captures: { black: number; white: number }; // アゲハマ（その色が取った石数）
  passes: number; // 連続パス数
  history: ReadonlySet<string>; // 既出局面のハッシュ（superko 判定用）
}

const inBounds = (size: number, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < size && y < size;

const cloneBoard = (board: BoardState): BoardState =>
  board.map((row) => row.slice());

const emptyBoard = (size: number): BoardState =>
  Array.from({ length: size }, () => Array<StoneColor | null>(size).fill(null));

const hashBoard = (board: BoardState): string => {
  let s = '';
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board.length; x++) {
      const c = board[y][x];
      s += c === 'black' ? 'b' : c === 'white' ? 'w' : '.';
    }
  }
  return s;
};

// (x,y) を含む連（同色の連結群）と、その連の呼吸点(liberty)数を返す。
const groupAndLiberties = (
  board: BoardState,
  size: number,
  sx: number,
  sy: number,
): { stones: Point[]; liberties: number } => {
  const color = board[sy][sx];
  const stones: Point[] = [];
  const liberties = new Set<string>();
  const seen = new Set<string>();
  const stack: Point[] = [{ x: sx, y: sy }];
  seen.add(`${sx},${sy}`);
  while (stack.length > 0) {
    const p = stack.pop()!;
    stones.push(p);
    const neighbors = [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ];
    for (const n of neighbors) {
      if (!inBounds(size, n.x, n.y)) continue;
      const cell = board[n.y][n.x];
      if (cell === null) {
        liberties.add(`${n.x},${n.y}`);
      } else if (cell === color && !seen.has(`${n.x},${n.y}`)) {
        seen.add(`${n.x},${n.y}`);
        stack.push(n);
      }
    }
  }
  return { stones, liberties: liberties.size };
};

// 着手を盤に適用し、取り石を反映した新しい盤を返す（合法性チェックはしない）。
// 戻り値 captured は取った相手石数。自殺手の場合は board がそのまま＝呼吸点ゼロになる。
const applyMove = (
  board: BoardState,
  size: number,
  color: StoneColor,
  point: Point,
): { board: BoardState; captured: number } => {
  const next = cloneBoard(board);
  next[point.y][point.x] = color;
  const enemy = opponent(color);
  let captured = 0;

  // 隣接する相手の連で呼吸点ゼロのものを取り除く
  const neighbors = [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ];
  for (const n of neighbors) {
    if (!inBounds(size, n.x, n.y)) continue;
    if (next[n.y][n.x] !== enemy) continue;
    const grp = groupAndLiberties(next, size, n.x, n.y);
    if (grp.liberties === 0) {
      for (const s of grp.stones) {
        next[s.y][s.x] = null;
        captured++;
      }
    }
  }

  return { board: next, captured };
};

export class SelfRuleEngine implements IRuleEngine {
  emptyState(size: number): SelfEngineState {
    const board = emptyBoard(size);
    return {
      size,
      board,
      toPlay: 'black', // 黒先
      captures: { black: 0, white: 0 },
      passes: 0,
      history: new Set([hashBoard(board)]),
    };
  }

  isLegalMove(state: EngineState, color: StoneColor, point: Point): boolean {
    const s = state as SelfEngineState;
    if (!inBounds(s.size, point.x, point.y)) return false;
    if (s.board[point.y][point.x] !== null) return false; // 既に石がある

    const { board: nextBoard, captured } = applyMove(s.board, s.size, color, point);

    // 自殺手判定：取りを反映した後、自分の連に呼吸点が無ければ非合法
    const ownGroup = groupAndLiberties(nextBoard, s.size, point.x, point.y);
    if (ownGroup.liberties === 0) return false;

    // コウ／同形反復（positional superko）：既出局面を再現する着手は禁止
    // （captured===0 のときは盤が増えるだけなので superko には該当しない＝高速パス）
    if (captured > 0 && s.history.has(hashBoard(nextBoard))) return false;

    return true;
  }

  playMove(state: EngineState, color: StoneColor, point: Point): SelfEngineState {
    const s = state as SelfEngineState;
    const { board: nextBoard, captured } = applyMove(s.board, s.size, color, point);
    const captures = {
      black: s.captures.black + (color === 'black' ? captured : 0),
      white: s.captures.white + (color === 'white' ? captured : 0),
    };
    const history = new Set(s.history);
    history.add(hashBoard(nextBoard));
    return {
      size: s.size,
      board: nextBoard,
      toPlay: opponent(color),
      captures,
      passes: 0, // 着手したのでパス連続は途切れる
      history,
    };
  }

  pass(state: EngineState, color: StoneColor): SelfEngineState {
    const s = state as SelfEngineState;
    return {
      ...s,
      toPlay: opponent(color),
      passes: s.passes + 1,
    };
  }

  capturesBetween(prev: EngineState, next: EngineState): number {
    const p = prev as SelfEngineState;
    const n = next as SelfEngineState;
    // prev→next の差分で「消えた石」の数 = 取られた石数
    let removed = 0;
    for (let y = 0; y < p.size; y++) {
      for (let x = 0; x < p.size; x++) {
        if (p.board[y][x] !== null && n.board[y][x] === null) removed++;
      }
    }
    return removed;
  }

  isGameOver(state: EngineState): boolean {
    return (state as SelfEngineState).passes >= 2; // 両パス
  }

  // area scoring（中国ルール）：自分の石数 + 自分だけが囲んだ空点
  score(
    state: EngineState,
    komi: number,
  ): { winner: StoneColor; margin: number } {
    const s = state as SelfEngineState;
    const size = s.size;
    let black = 0;
    let white = 0;

    const seen = new Set<string>();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = s.board[y][x];
        if (cell === 'black') {
          black++;
          continue;
        }
        if (cell === 'white') {
          white++;
          continue;
        }
        // 空点：連結した空領域をまとめて評価
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        const region: Point[] = [];
        const borderColors = new Set<StoneColor>();
        const stack: Point[] = [{ x, y }];
        seen.add(key);
        while (stack.length > 0) {
          const pt = stack.pop()!;
          region.push(pt);
          const neighbors = [
            { x: pt.x + 1, y: pt.y },
            { x: pt.x - 1, y: pt.y },
            { x: pt.x, y: pt.y + 1 },
            { x: pt.x, y: pt.y - 1 },
          ];
          for (const n of neighbors) {
            if (!inBounds(size, n.x, n.y)) continue;
            const nc = s.board[n.y][n.x];
            if (nc === null) {
              const nk = `${n.x},${n.y}`;
              if (!seen.has(nk)) {
                seen.add(nk);
                stack.push(n);
              }
            } else {
              borderColors.add(nc);
            }
          }
        }
        // 1色だけに囲まれていればその色の地、両色（またはどちらも無し）ならダメ
        if (borderColors.size === 1) {
          if (borderColors.has('black')) black += region.length;
          else white += region.length;
        }
      }
    }

    const whiteTotal = white + komi;
    const diff = black - whiteTotal;
    if (diff >= 0) return { winner: 'black', margin: diff };
    return { winner: 'white', margin: -diff };
  }

  toBoardState(state: EngineState): BoardState {
    return cloneBoard((state as SelfEngineState).board);
  }
}
