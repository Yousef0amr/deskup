import React from 'react'
import { ArrowRight, Globe, AppWindow, FolderOpen } from 'lucide-react'
import type { Profile } from '../../../shared/types'

export interface WorkspaceTemplate {
  name: string
  icon: string
  color: string
  description: string
  delayMs: number
  category: string
  items: Array<{ type: 'app' | 'folder' | 'url'; label: string; target: string }>
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    name: 'Full-Stack Dev',
    icon: '💻',
    color: '#6366f1',
    category: 'Development',
    description: 'Launch your editor, local dev server, and GitHub repo dashboard in one go.',
    delayMs: 250,
    items: [
      { type: 'url', label: 'Localhost (Port 3000)', target: 'http://localhost:3000' },
      { type: 'url', label: 'GitHub Dashboard', target: 'https://github.com' },
      { type: 'app', label: 'VS Code / IDE', target: 'code' }
    ]
  },
  {
    name: 'Design & UI/UX',
    icon: '🎨',
    color: '#ec4899',
    category: 'Creative',
    description: 'Jump straight into design mode with Figma, inspiration feeds, and asset tools.',
    delayMs: 200,
    items: [
      { type: 'url', label: 'Figma Workspace', target: 'https://www.figma.com' },
      { type: 'url', label: 'Dribbble Inspiration', target: 'https://dribbble.com' }
    ]
  },
  {
    name: 'Deep Focus & Notes',
    icon: '📝',
    color: '#f59e0b',
    category: 'Productivity',
    description: 'Distraction-free setup for research, writing, and documentation.',
    delayMs: 150,
    items: [
      { type: 'url', label: 'Notion Workspace', target: 'https://notion.so' },
      { type: 'url', label: 'Google Docs', target: 'https://docs.google.com' }
    ]
  },
  {
    name: 'Daily Standup & Comms',
    icon: '☕',
    color: '#10b981',
    category: 'Communication',
    description: 'Start your workday opening email, team calendar, and meeting agendas.',
    delayMs: 150,
    items: [
      { type: 'url', label: 'Mailbox', target: 'https://mail.google.com' },
      { type: 'url', label: 'Google Calendar', target: 'https://calendar.google.com' }
    ]
  }
]

interface WorkspaceTemplatesProps {
  onSelectTemplate: (profile: Profile) => void
}

export default function WorkspaceTemplates({
  onSelectTemplate
}: WorkspaceTemplatesProps): React.JSX.Element {
  const handleUse = (tmpl: WorkspaceTemplate) => {
    const newProfile: Profile = {
      id: 'prof_' + Date.now(),
      name: tmpl.name,
      icon: tmpl.icon,
      color: tmpl.color,
      launchDelayMs: tmpl.delayMs,
      items: tmpl.items.map((it) => ({
        id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
        type: it.type,
        label: it.label,
        target: it.target
      }))
    }
    onSelectTemplate(newProfile)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Starter Workflow Templates</h3>
          <p className="text-xs text-muted">
            Click any template to customize targets and create your workspace instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {WORKSPACE_TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.name}
            className="group p-4 rounded-2xl bg-surface/70 border border-border/80 hover:border-indigo-500/50 hover:bg-elevated/80 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: tmpl.color }}
            />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl p-2 rounded-xl bg-elevated/60 border border-border/40 select-none">
                  {tmpl.icon}
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${tmpl.color}15`,
                    color: tmpl.color
                  }}
                >
                  {tmpl.category}
                </span>
              </div>

              <h4 className="font-semibold text-text text-sm mb-1">{tmpl.name}</h4>
              <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2">
                {tmpl.description}
              </p>

              {/* Items chips preview */}
              <div className="space-y-1 mb-4">
                {tmpl.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 text-[10px] text-muted truncate px-2 py-1 rounded-md bg-elevated/40 border border-border/30"
                  >
                    {item.type === 'url' && <Globe className="w-3 h-3 text-cyan-500 shrink-0" />}
                    {item.type === 'app' && <AppWindow className="w-3 h-3 text-indigo-500 shrink-0" />}
                    {item.type === 'folder' && <FolderOpen className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleUse(tmpl)}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-elevated text-text hover:bg-indigo-600 hover:text-white border border-border/60 hover:border-indigo-500 group-hover:shadow-md"
            >
              <span>Use Template</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

