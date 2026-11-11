export type WorkTool = 'text' | 'json' | 'base64' | 'url' | 'timestamp' | 'uuid' | 'hash' | 'jwt'

export const workTools: { id: WorkTool; name: string; description: string; actions: { id: string; label: string }[] }[] = [
  { id: 'uuid', name: 'UUID generator', description: 'Generate random UUID v4 identifiers for fixtures, records, and request IDs.', actions: [
    { id: 'one', label: 'Generate one UUID' }, { id: 'ten', label: 'Generate 10 UUIDs' }
  ] },
  { id: 'hash', name: 'SHA-256 hash', description: 'Hash the exact UTF-8 input, including spaces and line breaks.', actions: [
    { id: 'sha256', label: 'Calculate SHA-256' }
  ] },
  { id: 'jwt', name: 'JWT inspector', description: 'Decode a JWT header and payload locally. Signatures are NOT verified; decoded claims are untrusted.', actions: [
    { id: 'inspect', label: 'Inspect token' }
  ] },
  { id: 'text', name: 'Text cleanup', description: 'Clean pasted lists, remove duplicates, and change case.', actions: [
    { id: 'trim', label: 'Trim lines' }, { id: 'unique', label: 'Remove duplicate lines' },
    { id: 'sort', label: 'Sort lines A–Z' }, { id: 'upper', label: 'UPPERCASE' }, { id: 'lower', label: 'lowercase' }
  ] },
  { id: 'json', name: 'JSON formatter', description: 'Validate, format, or compact JSON data.', actions: [
    { id: 'format', label: 'Format JSON' }, { id: 'compact', label: 'Compact JSON' }
  ] },
  { id: 'base64', name: 'Base64 converter', description: 'Encode or decode UTF-8 text, including non-English characters.', actions: [
    { id: 'encode', label: 'Encode Base64' }, { id: 'decode', label: 'Decode Base64' }
  ] },
  { id: 'url', name: 'URL encoder', description: 'Encode or decode a URL component, such as a query parameter.', actions: [
    { id: 'encode', label: 'Encode component' }, { id: 'decode', label: 'Decode component' }
  ] },
  { id: 'timestamp', name: 'Timestamp converter', description: 'Convert Unix seconds, milliseconds, or an ISO date with a time zone.', actions: [
    { id: 'seconds', label: 'From Unix seconds' }, { id: 'milliseconds', label: 'From Unix milliseconds' }, { id: 'iso', label: 'From ISO date' }
  ] }
]

export function transformText(tool: WorkTool, action: string, input: string): string {
  if (input.length > 500000) throw new Error('Use up to 500,000 characters per conversion.')
  if (tool === 'uuid') return Array.from({ length: action === 'ten' ? 10 : 1 }, () => crypto.randomUUID()).join('\n')
  if (!input.trim()) throw new Error('Enter some text first.')
  if (tool === 'jwt') {
    const parts = input.trim().split('.')
    if (parts.length !== 3 || !parts[0] || !parts[1]) throw new Error('Enter a three-part JWT: header.payload.signature.')
    try {
      const decode = (value: string) => {
        if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid Base64URL')
        const decoded = JSON.parse(transformText('base64', 'decode', value.replace(/-/g, '+').replace(/_/g, '/')))
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('Expected an object')
        return decoded
      }
      return JSON.stringify({ verification: 'NOT VERIFIED — decoding does not establish authenticity or validity', header: decode(parts[0]), payload: decode(parts[1]) }, null, 2)
    } catch { throw new Error('The JWT header or payload is not valid Base64URL-encoded JSON.') }
  }
  if (tool === 'text') {
    const lines = input.replace(/\r\n?/g, '\n').split('\n')
    if (action === 'trim') return lines.map(line => line.trim()).filter(Boolean).join('\n')
    if (action === 'unique') return [...new Set(lines)].join('\n')
    if (action === 'sort') return lines.sort((a, b) => a.localeCompare(b)).join('\n')
    if (action === 'upper') return input.toUpperCase()
    if (action === 'lower') return input.toLowerCase()
  }
  if (tool === 'json') {
    try { return JSON.stringify(JSON.parse(input), null, action === 'compact' ? undefined : 2) }
    catch (error) { throw new Error(`Invalid JSON: ${(error as Error).message}`) }
  }
  if (tool === 'base64') {
    if (action === 'encode') {
      const bytes = new TextEncoder().encode(input)
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    }
    try {
      const binary = atob(input.replace(/\s/g, ''))
      return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
    } catch { throw new Error('Enter valid Base64 containing UTF-8 text.') }
  }
  if (tool === 'url') {
    try { return action === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input) }
    catch { throw new Error('The URL component contains invalid characters or percent escapes.') }
  }
  if (tool === 'timestamp') {
    const value = input.trim()
    let date: Date
    if (action === 'iso') {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
        throw new Error('Use an ISO date with a time zone, for example 2026-11-10T09:00:00Z.')
      }
      date = new Date(value)
    } else {
      if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error('Enter a numeric Unix timestamp.')
      date = new Date(Number(value) * (action === 'seconds' ? 1000 : 1))
    }
    if (!Number.isFinite(date.getTime())) throw new Error('This date is outside the supported range.')
    return `UTC: ${date.toISOString()}\nLocal: ${date.toLocaleString()}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`
  }
  throw new Error('Choose a supported conversion.')
}

export async function runWorkTool(tool: WorkTool, action: string, input: string): Promise<string> {
  if (tool !== 'hash') return transformText(tool, action, input)
  if (input.length > 500000) throw new Error('Use up to 500,000 characters per conversion.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
