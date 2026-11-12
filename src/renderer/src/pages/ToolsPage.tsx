import React, { useState, useRef } from 'react'
import { Copy, ArrowDown, FilePlus2 } from 'lucide-react'
import { runWorkTool, workTools, type WorkTool } from '../utils/workTools'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'

export default function ToolsPage(): React.JSX.Element {
  const [tool, setTool] = useState<WorkTool>('text')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const inputRevision = useRef(0)
  const current = workTools.find(item => item.id === tool)!

  async function run(action: string) {
    setNotice('')
    const revision = inputRevision.current
    setRunning(true)
    try {
      const result = await runWorkTool(tool, action, input)
      if (revision === inputRevision.current) { setOutput(result); setError('') }
    } catch (err) {
      if (revision === inputRevision.current) { setOutput(''); setError((err as Error).message) }
    } finally { setRunning(false) }
  }

  async function copy() {
    try { await window.deskup.clipboard.copy(output); setNotice('Copied result.'); setError('') }
    catch { setError('Could not copy. Select the result and copy it manually.') }
  }

  async function saveNote() {
    setSaving(true)
    try {
      await window.deskup.notes.create(`${current.name} · ${new Date().toLocaleDateString()}`, output, 'Work tools')
      setNotice('Saved to Notes in the Work tools folder.')
      setError('')
    } catch { setError('Could not save the note. Your result is still available below.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 pb-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text">Work tools</h2>
        <p className="text-xs text-muted mt-1">Everyday conversions, right on your desk. Everything runs locally.</p>
      </header>
      <div className="grid grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)] gap-5">
        <nav aria-label="Work tools" className="flex flex-wrap xl:flex-col gap-2 content-start">
          {workTools.map(item => (
            <Button
              key={item.id}
              type="button"
              variant={tool === item.id ? 'default' : 'secondary'}
              aria-pressed={tool === item.id}
              onClick={() => { inputRevision.current++; setTool(item.id); setOutput(''); setError(''); setNotice('') }}
              className="justify-start h-auto px-4 py-3 text-sm font-medium"
            >
              {item.name}
            </Button>
          ))}
        </nav>
        <Card className="min-w-0 p-5 space-y-4" aria-label={current.name}>
          <div><h3 className="text-lg font-semibold text-text">{current.name}</h3><p className="text-xs text-muted mt-1">{current.description}</p></div>
          <label className="block text-xs font-semibold text-text" htmlFor="tool-input">Input</label>
          <Textarea id="tool-input" value={tool === 'uuid' ? '' : input} disabled={tool === 'uuid'} maxLength={500000} spellCheck={false} onChange={event => { inputRevision.current++; setInput(event.target.value); setOutput(''); setNotice(''); setError('') }} placeholder={tool === 'uuid' ? 'No input needed. Choose how many UUIDs to generate.' : tool === 'jwt' ? 'eyJ… . eyJ… . signature' : tool === 'json' ? '{"project":"Deskup","ready":true}' : tool === 'timestamp' ? '1794301200 or 2026-11-10T09:00:00Z' : 'Paste your text here…'} className="w-full h-44 resize-y font-mono text-sm" />
          <div className="flex flex-wrap gap-2">
            {current.actions.map(action => <Button key={action.id} type="button" variant="outline" size="sm" disabled={running || (!input.trim() && tool !== 'uuid' && tool !== 'hash')} onClick={() => void run(action.id)}>{running ? 'Processing…' : action.label}</Button>)}
            {tool === 'timestamp' && <Button type="button" variant="outline" size="sm" onClick={() => { inputRevision.current++; setInput(new Date().toISOString()); setOutput(''); setNotice(''); setError('') }}>Use current time</Button>}
            <Button type="button" variant="outline" size="sm" className="ml-auto" disabled={!input && !output} onClick={() => { inputRevision.current++; setInput(''); setOutput(''); setError(''); setNotice('') }}>Clear</Button>
          </div>
          <p className="text-xs text-muted">{input.length.toLocaleString()} characters · {input.trim() ? input.trim().split(/\s+/).length.toLocaleString() : 0} words</p>
          {error && <p role="alert" className="text-sm text-rose-500 break-words">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2 items-center border-t border-border pt-4">
            <label className="text-xs font-semibold text-text flex items-center gap-2" htmlFor="tool-output"><ArrowDown className="w-4 h-4" />Result</label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={!output} onClick={() => void copy()}><Copy className="w-3.5 h-3.5" />Copy</Button>
              <Button type="button" variant="outline" size="sm" disabled={!output || tool === 'uuid'} onClick={() => { inputRevision.current++; setInput(output); setOutput(''); setNotice(''); setError('') }}>Use as input</Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={!output || saving} onClick={() => void saveNote()}><FilePlus2 className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save as note'}</Button>
            </div>
          </div>
          <Textarea id="tool-output" readOnly value={output} placeholder="Your result appears here." className="w-full h-48 resize-y font-mono text-sm" />
          <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400 min-h-4">{notice}</p>
          <p className="text-xs text-muted">Input and results are cleared when you leave this page. Save a result as a note to keep it.</p>
        </Card>
      </div>
    </div>
  )
}
