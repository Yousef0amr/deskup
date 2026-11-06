import React, { useState, useEffect } from 'react'
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react'

export default function ClockWidget(): React.JSX.Element {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours()
  let greeting = 'Good morning'
  let Icon = Sunrise

  if (hours >= 12 && hours < 17) {
    greeting = 'Good afternoon'
    Icon = Sun
  } else if (hours >= 17 && hours < 22) {
    greeting = 'Good evening'
    Icon = Sunset
  } else if (hours >= 22 || hours < 5) {
    greeting = 'Working late'
    Icon = Moon
  }

  const timeString = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  const dateString = time.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5" />
          <span>{greeting}</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-text">{dateString}</h2>
      </div>
      <div className="font-mono text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-300 bg-elevated/60 px-4 py-2 rounded-xl border border-border/50">
        {timeString}
      </div>
    </div>
  )
}

