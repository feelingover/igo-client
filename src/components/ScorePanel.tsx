// 終局時のスコア内訳表示（SPEC 9章）
// 中国ルールの area scoring を「石 ＋ 地（＋ コミ）＝ 合計」で見せる。
// 盤上の地マーカー（TerritoryMarkers）と色を対応させ、凡例で地の数を示す。
import { StyleSheet, Text, View } from 'react-native';
import type { ScoreBreakdown, ScoreResult, StoneColor } from '../types';
import { colorJa, formatPoints } from './resultFormat';

function ScoreRow({ color, score }: { color: StoneColor; score: ScoreBreakdown }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, color === 'black' ? styles.black : styles.white]} />
      <Text style={styles.rowLabel}>{colorJa(color)}</Text>
      <Text style={styles.rowFormula}>
        石 {score.stones} ＋ 地 {score.territory}
        {score.komi > 0 ? ` ＋ コミ ${formatPoints(score.komi)}` : ''}
      </Text>
      <Text style={styles.rowTotal}>{formatPoints(score.total)} 目</Text>
    </View>
  );
}

function LegendItem({ color, territory }: { color: StoneColor; territory: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.chip, color === 'black' ? styles.black : styles.white]} />
      <Text style={styles.legendText}>
        {colorJa(color)}地 {territory} 目
      </Text>
    </View>
  );
}

export function ScorePanel({ score }: { score: ScoreResult }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>地の内訳（中国ルール／石＋地）</Text>
      <ScoreRow color="black" score={score.black} />
      <ScoreRow color="white" score={score.white} />
      <View style={styles.legend}>
        <LegendItem color="black" territory={score.black.territory} />
        <LegendItem color="white" territory={score.white.territory} />
        <Text style={styles.legendNote}>■ は盤上のマーカーと同じ色です</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f6f0e3',
    borderWidth: 1,
    borderColor: '#d8cbb0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  heading: { fontSize: 13, fontWeight: '700', color: '#7a6a52' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#3a2f1c' },
  chip: { width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: '#3a2f1c' },
  black: { backgroundColor: '#111' },
  white: { backgroundColor: '#fff' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: '#222', width: 24 },
  rowFormula: { flex: 1, fontSize: 14, color: '#555' },
  rowTotal: { fontSize: 15, fontWeight: '700', color: '#222' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2d8c2',
    paddingTop: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 13, color: '#555' },
  legendNote: { fontSize: 12, color: '#9a8b72' },
});
