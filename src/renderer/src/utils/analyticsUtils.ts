import type { FocusSessionEntry } from '../../../shared/types'

export interface DayFocusStat {
  dayName: string
  dateStr: string
  minutes: number
  percent: number // relative to max
}

export interface ProductivitySummary {
  currentStreakDays: number
  totalWeeklyMinutes: number
  dailyAverageMinutes: number
  mostProductiveDay: string
  dayStats: DayFocusStat[]
}

export function computeProductivitySummary(entries: FocusSessionEntry[]): ProductivitySummary {
  const now = new Date()

  // 1. Compute 7 days of this week (ending today)
  const dayStats: DayFocusStat[] = []
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayTotals = new Map<string, number>()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toDateString()
    dayTotals.set(key, 0)
  }

  for (const entry of entries) {
    const d = new Date(entry.startedAt)
    d.setHours(0, 0, 0, 0)
    const key = d.toDateString()
    if (dayTotals.has(key)) {
      dayTotals.set(key, (dayTotals.get(key) || 0) + Math.round(entry.durationMs / 60000))
    }
  }

  let maxMinutes = 60 // Baseline 60m scale
  let totalWeekly = 0
  let bestDay = 'Today'
  let bestDayMin = -1

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toDateString()
    const minutes = dayTotals.get(key) || 0
    totalWeekly += minutes
    if (minutes > maxMinutes) maxMinutes = minutes
    if (minutes > bestDayMin) {
      bestDayMin = minutes
      bestDay = i === 0 ? 'Today' : dayNames[d.getDay()]
    }

    dayStats.push({
      dayName: i === 0 ? 'Today' : dayNames[d.getDay()],
      dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
      minutes,
      percent: 0 // Will compute below
    })
  }

  // Set relative percentages for bar heights
  dayStats.forEach((ds) => {
    ds.percent = maxMinutes > 0 ? Math.min(100, Math.round((ds.minutes / maxMinutes) * 100)) : 0
  })

  // 2. Compute Consecutive Day Streak
  const daysWithFocus = new Set<string>()
  for (const entry of entries) {
    if (entry.durationMs >= 60000) {
      const d = new Date(entry.startedAt)
      d.setHours(0, 0, 0, 0)
      daysWithFocus.add(d.toDateString())
    }
  }

  let streak = 0
  const checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)

  // If today has no focus, check if yesterday had focus to maintain streak
  if (!daysWithFocus.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (daysWithFocus.has(checkDate.toDateString())) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return {
    currentStreakDays: streak,
    totalWeeklyMinutes: totalWeekly,
    dailyAverageMinutes: Math.round(totalWeekly / 7),
    mostProductiveDay: bestDay,
    dayStats
  }
}

