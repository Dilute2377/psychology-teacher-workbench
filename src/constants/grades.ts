export type SchoolStage = 'primary' | 'junior' | 'senior'

export const K12_GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'] as const
export type K12Grade = typeof K12_GRADES[number]

export const STAGE_GRADES: Record<SchoolStage, readonly K12Grade[]> = {
  primary: K12_GRADES.slice(0, 6),
  junior: K12_GRADES.slice(6, 9),
  senior: K12_GRADES.slice(9, 12),
}

export const STAGE_LABELS: Record<SchoolStage, string> = { primary: '小学', junior: '初中', senior: '高中' }

export function sortGrades<T extends string>(grades: T[]) {
  return [...grades].sort((left, right) => {
    const leftIndex = K12_GRADES.indexOf(left as K12Grade)
    const rightIndex = K12_GRADES.indexOf(right as K12Grade)
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) || left.localeCompare(right, 'zh-CN')
  })
}

export function sortClassNames<T extends string>(classes: T[]) {
  return [...classes].sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10) || left.localeCompare(right, 'zh-CN'))
}

export function classNames(count: number) {
  return Array.from({ length: Math.max(1, Math.min(99, Number(count) || 1)) }, (_, index) => `${index + 1}班`)
}
