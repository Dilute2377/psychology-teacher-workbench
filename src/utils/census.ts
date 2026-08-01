/** 心理普查因子的展示与业务映射，避免各页面各自解释原始 Excel 列名。 */
const factorNames: Record<string, string> = {
  anxiety: '对人焦虑',
  depression: '抑郁倾向',
  academic: '学习焦虑',
  loneliness: '孤独倾向',
  interpersonal: '人际敏感',
  '对人焦虑': '对人焦虑',
  '抑郁倾向': '抑郁倾向',
  '学习焦虑': '学习焦虑',
  '孤独倾向': '孤独倾向',
  '人际敏感': '人际敏感',
  '总分': '总分',
  '总得分': '总分',
}

export function formatCensusFactor(factor: string) {
  return factorNames[factor.trim().toLowerCase()] ?? factor
}

export function isCensusFactorFlagged(factor: string, score: number, reasons: string[]) {
  const label = formatCensusFactor(factor)
  const hasExplicitReason = reasons.some((reason) =>
    (reason.includes(factor) || reason.includes(label)) && /(超标|预警|异常)/.test(reason),
  )
  return hasExplicitReason || (score >= 8 && reasons.length > 0)
}

/** 将普查异常因子转换为咨询问题分类，保证一键约访进入现有全局分类体系。 */
export function censusReasonsToConsultationCategories(reasons: string[]) {
  const categories = reasons.flatMap((reason) => {
    if (/学习|academic/i.test(reason)) return ['学业压力']
    if (/对人|人际|孤独|loneliness|anxiety/i.test(reason)) return ['人际交往']
    if (/抑郁|情绪|depression/i.test(reason)) return ['情绪困扰']
    if (/危机|自伤|高危/i.test(reason)) return ['危机干预']
    return []
  })
  return [...new Set(categories)]
}
