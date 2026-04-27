// Centralized grade normalization utility for Studentle
// Handles legacy codes, trims, and validates allowed grades

const LEGACY_GRADE_MAP: Record<string, string> = {
  '8': '11',
  '27': '11',
  '7': '10',
  '28': '10',
}

const ALLOWED_GRADES = ['0', '9', '10', '11', '12']

/**
 * Normalizes any grade input to a valid grade string.
 * - Maps legacy codes to current grades
 * - Trims and removes quotes
 * - Returns '0' if invalid (teacher fallback)
 */
export function normalizeGrade(rawGrade: string): string {
  const clean = String(rawGrade || '')
    .replace(/"/g, '')
    .trim()
  if (LEGACY_GRADE_MAP[clean]) return LEGACY_GRADE_MAP[clean]
  if (ALLOWED_GRADES.includes(clean)) return clean
  return '0' // fallback to teacher if invalid
}
