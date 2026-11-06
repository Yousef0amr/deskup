import React, { useState, useEffect, useRef } from 'react'
import { StickyNote, Check, Trash2 } from 'lucide-react'

export default function QuickNotes(): React.JSX.Element {
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('idle')
  const [loading, setLoading] = useState(true)
  const revision = useRef(0)

  useEffect(() => {
    async function load() {
      try {
        const text = await window.deskup.notes.get()
        setContent(text)
        setLoading(false)
      } catch (err) {
        setSaveStatus('error')
        console.error('Failed to load notes:', err)
      }
    }
    load()
  }, [])

  const save = async (text: string) => {
    const currentRevision = ++revision.current
    setSaveStatus('saving')
    try {
      // Send immediately: there is no stale debounce left behind on clear or navigation.
      await window.deskup.notes.save(text)
      if (revision.current === currentRevision) setSaveStatus('saved')
    } catch {
      if (revision.current === currentRevision) setSaveStatus('error')
    }
  }
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setContent(text)
    void save(text)
  }
  const handleClear = () => {
    if (content && confirm('Clear all notes?')) {
      setContent('')
      void save('')
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-text text-base">Quick Scratchpad</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {saveStatus === 'saving' && (
            <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] animate-pulse">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          <span className="text-muted text-[11px]">{wordCount} words</span>
          {content && (
            <button
              onClick={handleClear}
              className="text-muted hover:text-rose-400 p-1 rounded transition-colors"
              title="Clear notes"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {saveStatus === 'error' && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 mb-2">
        {loading ? 'Could not load notes. Reopen this page to retry.' : 'Notes could not be saved.'}
        {!loading && <button onClick={() => void save(content)} className="underline ml-2">Retry</button>}
      </p>}
      <textarea
        disabled={loading}
        value={content}
        onChange={handleChange}
        placeholder="Type thoughts, links, code snippets or scratch notes here... Auto-saves automatically."
        className="flex-1 w-full p-3.5 bg-elevated/50 border border-border/60 rounded-xl text-xs text-text placeholder-muted font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed min-h-[160px]"
      />
    </div>
  )
}

