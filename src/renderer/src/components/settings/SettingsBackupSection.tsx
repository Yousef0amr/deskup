import React from 'react'
import { Download, Upload } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

interface SettingsBackupSectionProps {
  onExport: () => void
  onImport: () => void
}

export default function SettingsBackupSection({
  onExport,
  onImport
}: SettingsBackupSectionProps): React.JSX.Element {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text">Data Backup & Restore</h3>
        <p className="text-xs text-muted">
          Export all profiles, todos, clipboard items, and notes as a portable JSON file
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onExport}
          className="gap-2"
        >
          <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Export JSON Backup</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onImport}
          className="gap-2"
        >
          <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Import JSON Backup</span>
        </Button>
      </div>
    </Card>
  )
}
