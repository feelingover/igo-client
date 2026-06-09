// SVG碁盤本体（SPEC 9章）
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useGameStore } from '../state/gameStore';
import type { Move, Point } from '../types';
import { BoardGrid } from './BoardGrid';
import { Stone } from './Stone';
import { coord, createGeometry, nearestIntersection } from './boardGeometry';

const BOARD_BG = '#e3b96b'; // 榧(かや)っぽい盤の色

const lastPlayPoint = (moves: Move[]): Point | null => {
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i];
    if (m.type === 'play') return m.point;
  }
  return null;
};

export function GobanBoard({ boardPx }: { boardPx: number }) {
  const game = useGameStore((s) => s.game);
  const preview = useGameStore((s) => s.preview);
  const tapPoint = useGameStore((s) => s.tapPoint);

  if (!game) return null;
  const g = createGeometry(game.boardSize, boardPx);

  const handleRelease = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    tapPoint(nearestIntersection(g, locationX, locationY));
  };

  const board = game.currentBoard;
  const last = lastPlayPoint(game.moves);

  const stones = [];
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      const c = board[y][x];
      if (!c) continue;
      stones.push(
        <Stone key={`s${x}-${y}`} cx={coord(g, x)} cy={coord(g, y)} r={g.stoneR} color={c} />,
      );
    }
  }

  return (
    <View
      style={{ width: boardPx, height: boardPx }}
      onStartShouldSetResponder={() => game.status === 'playing'}
      onResponderRelease={handleRelease}
    >
      <Svg width={boardPx} height={boardPx}>
        <Rect x={0} y={0} width={boardPx} height={boardPx} fill={BOARD_BG} rx={6} />
        <BoardGrid geometry={g} />
        {stones}

        {/* 直前の手のマーカー（小さな円） */}
        {last && (
          <Circle
            cx={coord(g, last.x)}
            cy={coord(g, last.y)}
            r={g.stoneR * 0.35}
            fill="none"
            stroke={board[last.y][last.x] === 'black' ? '#fff' : '#000'}
            strokeWidth={1.5}
          />
        )}

        {/* プレビュー（半透明の仮置き石） */}
        {preview && (
          <Stone
            cx={coord(g, preview.x)}
            cy={coord(g, preview.y)}
            r={g.stoneR}
            color={game.nextToPlay}
            opacity={0.45}
          />
        )}
      </Svg>
    </View>
  );
}
