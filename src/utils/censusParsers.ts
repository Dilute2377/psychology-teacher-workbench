export type CensusScaleType = 'MHT' | 'SCL-90' | 'PHQ-9' | 'GAD-7' | 'SDS' | 'SAS'
export type ParsedScaleResult = { scores: Record<string, number>; isFlagged: boolean; flaggedReasons: string[] }

export const SCALE_OPTIONS: Array<{ value: CensusScaleType; label: string; template: Record<string, number | string> }> = [
  { value: 'MHT', label: 'MHT 中小学生心理健康诊断测验', template: { 学号: '20260101', 姓名: '示例学生', 班级: '1班', 学习焦虑: 5, 对人焦虑: 3, 孤独倾向: 2, 自责倾向: 2, 过敏倾向: 1, 身体症状: 2, 恐怖倾向: 1, 冲动倾向: 1 } },
  { value: 'SCL-90', label: 'SCL-90 症状自评量表', template: { 学号: '20260101', 姓名: '示例学生', 班级: '1班', 躯体化: 1.2, 强迫症状: 1.6, 抑郁: 1.4, 焦虑: 1.8 } },
  { value: 'PHQ-9', label: 'PHQ-9 抑郁症状筛查', template: { 学号: '20260101', 姓名: '示例学生', 班级: '1班', PHQ1: 0, PHQ2: 1, PHQ3: 0, PHQ4: 0, PHQ5: 0, PHQ6: 0, PHQ7: 0, PHQ8: 0, PHQ9: 0 } },
  { value: 'GAD-7', label: 'GAD-7 广泛性焦虑量表', template: { 学号: '20260101', 姓名: '示例学生', 班级: '1班', GAD1: 0, GAD2: 1, GAD3: 0, GAD4: 0, GAD5: 0, GAD6: 0, GAD7: 0 } },
  { value: 'SDS', label: 'SDS 抑郁自评量表', template: { 学号: '20260101', 姓名: '示例学生', 班级: '1班', SDS1: 1, SDS2: 1, SDS3: 1, SDS4: 1 } },
  { value: 'SAS', label: 'SAS 焦虑自评量表', template: { 学号: '20260101', 姓名: '示例学生', 班级: '1班', SAS1: 1, SAS2: 1, SAS3: 1, SAS4: 1 } },
]

const identityKeys = new Set(['学号', '学生学号', 'studentno', '姓名', '学生姓名', 'studentname', '班级', '班别', 'classname'])
const number = (value: unknown) => { const result = Number(value); return Number.isFinite(result) ? result : undefined }
const normalized = (value: string) => value.replace(/[\s_\-]/g, '').toLowerCase()
function findScore(row: Record<string, unknown>, aliases: string[]) { const entry = Object.entries(row).find(([key]) => aliases.some((alias) => normalized(key) === normalized(alias))); return entry ? number(entry[1]) : undefined }
function questionValues(row: Record<string, unknown>, prefixes: string[] = []) {
  return Object.entries(row).flatMap(([key, value]) => { const match = normalized(key).match(/(?:q|题目?|item|phq|gad|sds|sas)?(\d{1,3})$/i); if (!match || (prefixes.length && !prefixes.some((prefix) => normalized(key).startsWith(normalized(prefix))))) return []; const score = number(value); return score === undefined ? [] : [{ index: Number(match[1]), score }] }).sort((a, b) => a.index - b.index)
}
function severity(total: number, thresholds: [number, number, number]) { return total < thresholds[0] ? '正常' : total < thresholds[1] ? '轻度' : total < thresholds[2] ? '中度' : '重度' }
function result(scores: Record<string, number>, reasons: string[]): ParsedScaleResult { return { scores, isFlagged: reasons.length > 0, flaggedReasons: reasons } }

function parseMht(row: Record<string, unknown>): ParsedScaleResult {
  const factors: Array<[string, string[]]> = [['学习焦虑', ['学习焦虑', '学业焦虑']], ['对人焦虑', ['对人焦虑', '社交焦虑']], ['孤独倾向', ['孤独倾向']], ['自责倾向', ['自责倾向']], ['过敏倾向', ['过敏倾向', '敏感倾向']], ['身体症状', ['身体症状', '躯体症状']], ['恐怖倾向', ['恐怖倾向']], ['冲动倾向', ['冲动倾向']]]
  const scores: Record<string, number> = {}
  const items = questionValues(row)
  factors.forEach(([name, aliases], index) => { const direct = findScore(row, aliases); scores[name] = direct ?? items.slice(index * 12, (index + 1) * 12).reduce((sum, item) => sum + item.score, 0) })
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0); scores['总焦虑分'] = total
  return result(scores, [...Object.entries(scores).filter(([key, score]) => key !== '总焦虑分' && score >= 8).map(([key]) => `${key}因子超标`), ...(total >= 65 ? ['总焦虑分达到 65'] : [])])
}
const sclFactors: Array<[string, number[]]> = [['躯体化', [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58]], ['强迫症状', [3, 9, 10, 28, 38, 45, 46, 51, 55, 65]], ['人际关系敏感', [6, 21, 34, 36, 37, 41, 61, 69, 73]], ['抑郁', [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79]], ['焦虑', [2, 17, 23, 33, 39, 57, 72, 78, 80, 86]], ['敌对', [11, 24, 63, 67, 74, 81]], ['恐怖', [13, 25, 47, 50, 70, 75, 82]], ['偏执', [8, 18, 43, 68, 76, 83]], ['精神病性', [7, 16, 35, 62, 77, 84, 85, 87, 88, 90]], ['其他', [19, 44, 59, 60, 64, 66]]]
function parseScl90(row: Record<string, unknown>): ParsedScaleResult {
  const items = new Map(questionValues(row).map((item) => [item.index, item.score])); const scores: Record<string, number> = {}
  sclFactors.forEach(([name, indexes]) => { const direct = findScore(row, [name]); const values = indexes.map((index) => items.get(index)).filter((score): score is number => score !== undefined); scores[name] = direct ?? (values.length ? Number((values.reduce((sum, score) => sum + score, 0) / values.length).toFixed(2)) : 0) })
  const all = [...items.values()]; scores['总均分'] = all.length ? Number((all.reduce((sum, score) => sum + score, 0) / all.length).toFixed(2)) : Number((Object.values(scores).reduce((sum, score) => sum + score, 0) / sclFactors.length).toFixed(2))
  return result(scores, Object.entries(scores).filter(([name, score]) => name !== '总均分' && score >= 2).map(([name]) => `${name}因子偏高`))
}
function parseBrief(row: Record<string, unknown>, scale: 'PHQ-9' | 'GAD-7'): ParsedScaleResult { const items = questionValues(row, [scale.startsWith('PHQ') ? 'phq' : 'gad']); const total = items.reduce((sum, item) => sum + item.score, 0); const level = severity(total, scale === 'PHQ-9' ? [5, 10, 15] : [5, 10, 15]); const label = scale === 'PHQ-9' ? 'PHQ-9总分' : 'GAD-7总分'; return result({ [label]: total, 风险等级: total }, total >= 10 ? [`${label} ${total} 分（${level}）`] : []) }
function parseSelfRating(row: Record<string, unknown>, scale: 'SDS' | 'SAS'): ParsedScaleResult { const reverse = scale === 'SDS' ? new Set([2, 5, 6, 11, 12, 14, 16, 17, 18, 20]) : new Set([5, 9, 13, 17, 19]); const items = questionValues(row, [scale.toLowerCase()]); const raw = items.reduce((sum, item) => sum + (reverse.has(item.index) ? 5 - item.score : item.score), 0); const standard = Math.round(raw * 1.25); const threshold = scale === 'SDS' ? 53 : 50; return result({ 原始分: raw, 标准分: standard }, standard >= threshold ? [`${scale} 标准分 ${standard} 分，达到预警线`] : []) }

export function parseScaleRow(row: Record<string, unknown>, scale: CensusScaleType): ParsedScaleResult { if (scale === 'MHT') return parseMht(row); if (scale === 'SCL-90') return parseScl90(row); if (scale === 'PHQ-9' || scale === 'GAD-7') return parseBrief(row, scale); return parseSelfRating(row, scale) }
export function identityColumns(row: Record<string, unknown>) { return Object.fromEntries(Object.entries(row).filter(([key]) => identityKeys.has(normalized(key)))) }
