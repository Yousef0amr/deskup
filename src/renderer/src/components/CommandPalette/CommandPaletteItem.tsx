import React from 'react'
import {
  Rocket,
  FileText,
  Clock,
  Clipboard,
  Compass,
  Sun,
  Moon,
  Laptop,
  Plus,
  CornerDownLeft
} from 'lucide-react'
import type { PaletteCommand } from '../../utils/commandPaletteUtils'

interface CommandPaletteItemProps {
  command: PaletteCommand
  isSelected: boolean
  onSelect: () => void
}

export default function CommandPaletteItem({
  command,
  isSelected,
  onSelect
}: CommandPaletteItemProps): React.JSX.Element {
  const renderIcon = () => {
    switch (command.iconType) {
      case 'rocket':
        return <Rocket className="w-4 h-4 text-indigo-500" />
      case 'file':
        return <FileText className="w-4 h-4 text-amber-500" />
      case 'clock':
        return <Clock className="w-4 h-4 text-purple-500" />
      case 'clipboard':
        return <Clipboard className="w-4 h-4 text-emerald-500" />
      case 'sun':
        return <Sun className="w-4 h-4 text-amber-400" />
      case 'moon':
        return <Moon className="w-4 h-4 text-indigo-400" />
      case 'laptop':
        return <Laptop className="w-4 h-4 text-blue-400" />
      case 'plus':
        return <Plus className="w-4 h-4 text-indigo-500" />
      default:
        return <Compass className="w-4 h-4 text-muted" />
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-elevated text-text'
          : 'hover:bg-elevated text-text'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div
          className={`p-1.5 rounded-lg shrink-0 ${
            isSelected ? 'bg-surface border border-border text-indigo-600 dark:text-indigo-400' : 'bg-elevated border border-border/50'
          }`}
        >
          {renderIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs truncate">{command.title}</span>
            {command.badge && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-md font-medium uppercase tracking-wider shrink-0 ${
                  isSelected ? 'bg-surface border border-border text-muted' : 'bg-elevated border border-border/60 text-muted'
                }`}
              >
                {command.badge}
              </span>
            )}
          </div>
          {command.subtitle && (
            <p
              className={`text-[11px] truncate mt-0.5 ${
                isSelected ? 'text-muted' : 'text-muted'
              }`}
            >
              {command.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1.5">
        {isSelected && (
          <span className="flex items-center gap-1 text-[10px] text-muted px-1.5 py-0.5 font-mono">
            <span>Press</span>
            <CornerDownLeft className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  )
}

