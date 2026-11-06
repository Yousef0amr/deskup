import React, { useState, useEffect, useRef } from 'react'
import { StickyNote, Check, Trash2, Copy } from 'lucide-react'

export default function QuickNotes(): React.JSX.Element {
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
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
    if (content && confirm('Clear all notes in scratchpad?')) {
      setContent('')
      void save('')
    }
  }

  const handleCopyAll = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length

  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-text text-base">Quick Scratchpad</h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {saveStatus === 'saving' && (
            <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}

          <div className="h-3 w-px bg-border/60 mx-1" />

          {content && (
            <>
              <button
                type="button"
                onClick={handleCopyAll}
                className="text-muted hover:text-text p-1 rounded transition-colors"
                title="Copy all notes"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="text-muted hover:text-rose-500 p-1 rounded transition-colors"
                title="Clear notes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {saveStatus === 'error' && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 mb-2">
          {loading ? 'Could not load notes.' : 'Notes could not be saved.'}
          {!loading && (
            <button onClick={() => void save(content)} className="underline ml-2">
              Retry
            </button>
          )}
        </p>
      )}

      {/* Editor Body */}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          disabled={loading}
          value={content}
          onChange={handleChange}
          placeholder="Type thoughts, links, code snippets or scratch notes here... Auto-saves automatically."
          className="flex-1 w-full p-3.5 bg-elevated/50 border border-border/60 rounded-xl text-xs text-text placeholder-muted font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed min-h-[190px]"
        />
        <div className="flex justify-between items-center text-[10px] text-muted pt-2 px-1">
          <span>Markdown & plain text supported</span>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars</span>
        </div>
      </div>
    </div>
  )
}
