import React from 'react'
import { Card } from './card'
import { Skeleton } from './skeleton'

/** Generic full-page skeleton used as the router Suspense fallback. */
export function PageSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading page" className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-72 space-y-3 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-4/5 rounded-lg" />
        </Card>
        <Card className="h-72 space-y-3 p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </Card>
      </div>
    </div>
  )
}

/** Kanban board loading skeleton matching BoardPage layout. */
export function BoardSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading board" className="flex h-[calc(100vh-3.5rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-52 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((col) => (
          <Card key={col} className="flex flex-col gap-3 p-3.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            {[0, 1, 2].map((card) => (
              <div key={card} className="space-y-2 rounded-lg border border-border/60 bg-surface p-3">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Whiteboard loading skeleton matching toolbar + canvas layout. */
export function WhiteboardSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading whiteboard" className="flex h-[calc(100vh-3.5rem)] flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-surface/60">
        <div className="flex h-full items-center justify-center">
          <div className="grid grid-cols-2 gap-6 opacity-70">
            <Skeleton className="h-28 w-44 rounded-xl" />
            <Skeleton className="h-28 w-44 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Settings page skeleton matching stacked configuration cards. */
export function SettingsSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading settings" className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Clipboard history list skeleton. */
export function ClipboardListSkeleton({ count = 5 }: { count?: number }): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading clipboard history" className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface/70 p-3 px-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded-md" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Workspaces grid skeleton matching ProfileCard dimensions. */
export function ProfilesGridSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading workspaces" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </Card>
      ))}
    </div>
  )
}

/** Note editor canvas skeleton for NotesPage. */
export function NoteEditorSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading note editor" className="flex flex-1 flex-col gap-4">
      <div className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-52" />
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 space-y-2.5 pt-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    </div>
  )
}
