import React from 'react'
import { Plus, Sparkles, Zap, Clock, ExternalLink } from 'lucide-react'
import type { Profile } from '../../../shared/types'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import WorkspaceTemplates from './WorkspaceTemplates'

interface WorkspaceEmptyStateProps {
  onCreateProfile: () => void
  onSelectTemplate: (templateProfile: Profile) => void
}

export default function WorkspaceEmptyState({
  onCreateProfile,
  onSelectTemplate
}: WorkspaceEmptyStateProps): React.JSX.Element {
  return (
    <div className="space-y-8">
      <Card className="p-8 border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <Badge variant="info" className="gap-1.5 py-1 px-3 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Supercharge Your Setup</span>
          </Badge>
          <h3 className="text-xl font-bold text-text">Welcome to Deskup Workspaces</h3>
          <p className="text-xs text-muted leading-relaxed">
            A workspace profile bundles all the apps, terminal folders, and browser links you need for a specific project. Launch everything simultaneously with smooth sequential delays.
          </p>
        </div>

        <Button
          type="button"
          onClick={onCreateProfile}
          className="gap-2 shrink-0 px-6 py-3"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Profile</span>
        </Button>
      </Card>

      <WorkspaceTemplates onSelectTemplate={onSelectTemplate} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <Card className="p-5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-text text-sm">One-Click Multi-Launch</h4>
          <p className="text-xs text-muted leading-relaxed">
            Combine native desktop software, project directories in File Explorer, and browser URLs in a unified setup.
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-text text-sm">Staggered Launch Delays</h4>
          <p className="text-xs text-muted leading-relaxed">
            Prevent CPU freezing and window race conditions with customizable millisecond delays between app launches.
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ExternalLink className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-text text-sm">Everywhere Access</h4>
          <p className="text-xs text-muted leading-relaxed">
            Launch profiles directly from the Dashboard, right-click the Windows system tray icon, or trigger background hotkeys.
          </p>
        </Card>
      </div>
    </div>
  )
}
