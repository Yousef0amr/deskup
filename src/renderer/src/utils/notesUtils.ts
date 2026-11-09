import type { NoteItem } from '../../../shared/types'

export const DEFAULT_FOLDERS = ['General', 'Work', 'Personal', 'Ideas', 'Dev']

export interface NoteColorOption {
  id: string
  name: string
  bg: string
  dot: string
  border: string
  ring: string
}

export const NOTE_COLORS: NoteColorOption[] = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-500/10', dot: 'bg-indigo-500', border: 'border-indigo-500/30', ring: 'ring-indigo-500' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', border: 'border-emerald-500/30', ring: 'ring-emerald-500' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500/10', dot: 'bg-amber-500', border: 'border-amber-500/30', ring: 'ring-amber-500' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-500/10', dot: 'bg-rose-500', border: 'border-rose-500/30', ring: 'ring-rose-500' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500/10', dot: 'bg-purple-500', border: 'border-purple-500/30', ring: 'ring-purple-500' },
  { id: 'slate', name: 'Slate', bg: 'bg-slate-500/10', dot: 'bg-slate-400', border: 'border-slate-500/30', ring: 'ring-slate-500' }
]

export interface NoteTemplate {
  id: string
  title: string
  description: string
  folder: string
  content: string
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    title: 'Untitled Note',
    description: 'Empty scratchpad to write thoughts freely',
    folder: 'General',
    content: ''
  },
  {
    id: 'meeting',
    title: 'Meeting Notes',
    description: 'Attendees, agenda, discussion points, action items',
    folder: 'Work',
    content: `# Meeting Notes
**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## Agenda
- [ ] Topic 1: 
- [ ] Topic 2: 

## Notes & Discussion
- Key insight: 

## Action Items
- [ ] Task 1 (@assignee)
- [ ] Task 2 (@assignee)
`
  },
  {
    id: 'project',
    title: 'Project Roadmap',
    description: 'Goals, milestones, architecture and requirements',
    folder: 'Dev',
    content: `# Project Roadmap
**Objective:** 

## Milestones
- [ ] Phase 1: Planning & Setup
- [ ] Phase 2: Core Implementation
- [ ] Phase 3: QA & Verification

## Architecture & Requirements
\`\`\`
Client -> API -> Database
\`\`\`

## Notes
- Technical considerations:
`
  },
  {
    id: 'brain-dump',
    title: 'Daily Brain Dump',
    description: 'Clear your mind, capture ideas and daily priorities',
    folder: 'Ideas',
    content: `# Daily Brain Dump
**Date:** ${new Date().toLocaleDateString()}

## Top 3 Focus Priorities
1. 
2. 
3. 

## Ideas & Insights
- 

## Quick Scratchpad
- 
`
  },
  {
    id: 'code-snippet',
    title: 'Code Snippet & Debug Notes',
    description: 'Problem explanation, stack trace, and working solution',
    folder: 'Dev',
    content: `# Bug & Code Notes
**Component:** 
**Error:** 

## Reproduction
\`\`\`bash
npm run dev
\`\`\`

## Solution
\`\`\`typescript
// Paste working snippet here
\`\`\`
`
  }
]

export function getFolderStyle(folder?: string): { bg: string; text: string; border: string } {
  const f = folder?.toLowerCase() || 'general'
  if (f.includes('work')) {
    return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' }
  }
  if (f.includes('personal')) {
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' }
  }
  if (f.includes('idea')) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' }
  }
  if (f.includes('dev') || f.includes('code')) {
    return { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' }
  }
  return { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' }
}

export function exportNoteAsFile(note: NoteItem): void {
  const filename = `${(note.title || 'note').replace(/[/\\?%*:|"<>]/g, '_')}.md`
  const blob = new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

