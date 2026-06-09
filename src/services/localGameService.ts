// Phase1 ゲームサービス実装（SPEC 7章）
// メモリ内で GameState を保持し、submitMove で IRuleEngine を直叩きして新状態を返す。
// async で統一（Phase2 で remoteGameService に差し替えてもインターフェースを変えないため）。
import { createRuleEngine } from '../engine/ruleEngine';
import type { EngineState, IRuleEngine } from '../engine/types';
import type { GameState, Move, StoneColor } from '../types';
import { opponent } from '../types';
import type { IGameService } from './gameService';

// 9路の中国ルールのコミ。環境によって差し替えたくなったら引数化する（Phase1 は定数）。
const DEFAULT_KOMI = 6.5;

interface GameRecord {
  state: GameState;
  engine: IRuleEngine;
  engineState: EngineState; // moves[] を反映した現在局面（キャッシュ）
  komi: number;
}

const formatResult = (winner: StoneColor, margin: number): string =>
  `${winner === 'black' ? 'B' : 'W'}+${margin}`;

const clone = (state: GameState): GameState => ({
  ...state,
  moves: state.moves.slice(),
  currentBoard: state.currentBoard.map((row) => row.slice()),
  captures: { ...state.captures },
});

export class LocalGameService implements IGameService {
  private games = new Map<string, GameRecord>();
  private seq = 0;

  async createGame(boardSize: number): Promise<GameState> {
    const engine = createRuleEngine();
    const engineState = engine.emptyState(boardSize);
    const gameId = `local-${Date.now()}-${this.seq++}`;
    const state: GameState = {
      gameId,
      boardSize,
      moves: [],
      currentBoard: engine.toBoardState(engineState),
      nextToPlay: 'black', // 黒先
      captures: { black: 0, white: 0 },
      status: 'playing',
    };
    this.games.set(gameId, { state, engine, engineState, komi: DEFAULT_KOMI });
    return clone(state);
  }

  async submitMove(gameId: string, move: Move): Promise<GameState> {
    const rec = this.games.get(gameId);
    if (!rec) throw new Error(`game not found: ${gameId}`);
    const { engine, state } = rec;

    if (state.status === 'finished') {
      throw new Error('game is already finished');
    }
    if (move.color !== state.nextToPlay) {
      throw new Error(`not ${move.color}'s turn`);
    }

    switch (move.type) {
      case 'play': {
        if (!engine.isLegalMove(rec.engineState, move.color, move.point)) {
          throw new Error('illegal move');
        }
        const next = engine.playMove(rec.engineState, move.color, move.point);
        const captured = engine.capturesBetween(rec.engineState, next);
        rec.engineState = next;
        state.captures = {
          black: state.captures.black + (move.color === 'black' ? captured : 0),
          white: state.captures.white + (move.color === 'white' ? captured : 0),
        };
        state.moves.push(move);
        state.currentBoard = engine.toBoardState(next);
        state.nextToPlay = opponent(move.color);
        break;
      }
      case 'pass': {
        const next = engine.pass(rec.engineState, move.color);
        rec.engineState = next;
        state.moves.push(move);
        state.nextToPlay = opponent(move.color);
        // 両パス → 終局して中国ルールでスコア
        if (engine.isGameOver(next)) {
          const { winner, margin } = engine.score(next, rec.komi);
          state.status = 'finished';
          state.result = formatResult(winner, margin);
        }
        break;
      }
      case 'resign': {
        state.moves.push(move);
        // 投了 → 相手の勝ち（W+R / B+R）
        const winner = opponent(move.color);
        state.status = 'finished';
        state.result = `${winner === 'black' ? 'B' : 'W'}+R`;
        state.nextToPlay = opponent(move.color);
        break;
      }
    }

    return clone(state);
  }

  async getGame(gameId: string): Promise<GameState> {
    const rec = this.games.get(gameId);
    if (!rec) throw new Error(`game not found: ${gameId}`);
    return clone(rec.state);
  }
}

// Phase1 はシングルトンで十分
export const localGameService = new LocalGameService();
