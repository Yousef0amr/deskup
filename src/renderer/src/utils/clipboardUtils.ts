export type ClipCategory = 'all' | 'pinned' | 'links' | 'code' | 'text'

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}

export function detectClipType(text: string): 'url' | 'code' | 'text' {
  const trimmed = text.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return 'url'
  }
  if (
    trimmed.includes('function') ||
    trimmed.includes('const ') ||
    trimmed.includes('let ') ||
    trimmed.includes('var ') ||
    trimmed.includes('import ') ||
    trimmed.includes('export ') ||
    trimmed.includes('class ') ||
    trimmed.includes('SELECT ') ||
    trimmed.includes('SELECT*') ||
    trimmed.includes('FROM ') ||
    (trimmed.includes('{') && trimmed.includes('}')) ||
    (trimmed.includes('(') && trimmed.includes(')')) ||
    trimmed.startsWith('git ') ||
    trimmed.startsWith('npm ') ||
    trimmed.startsWith('pnpm ') ||
    trimmed.startsWith('yarn ') ||
    trimmed.startsWith('curl ') ||
    trimmed.startsWith('docker ')
  ) {
    return 'code'
  }
  return 'text'
}

