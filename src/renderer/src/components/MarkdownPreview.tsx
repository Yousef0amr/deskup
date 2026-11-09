import React from 'react'

interface MarkdownPreviewProps {
  content: string
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps): React.JSX.Element {
  if (!content.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-xs italic py-16">
        Nothing to preview yet. Switch back to Edit to write markdown.
      </div>
    )
  }

  const lines = content.split('\n')
  const renderedElements: React.JSX.Element[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []

  const formatInline = (text: string): React.ReactNode => {
    // Bold: **text**
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-text">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-text">{part.slice(1, -1)}</em>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-elevated font-mono text-xs text-indigo-500">
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
  }

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        renderedElements.push(
          <pre
            key={`code-${idx}`}
            className="p-3.5 my-2 rounded-xl bg-elevated/80 border border-border/80 font-mono text-xs overflow-x-auto text-text leading-relaxed"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        )
        codeBuffer = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      return
    }

    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={idx} className="text-xl font-bold text-text mt-4 mb-2 pb-1 border-b border-border/60">
          {formatInline(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={idx} className="text-base font-bold text-text mt-3 mb-1.5">
          {formatInline(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={idx} className="text-sm font-semibold text-text mt-2 mb-1">
          {formatInline(line.slice(4))}
        </h3>
      )
    } else if (line.trim().startsWith('- [ ] ') || line.trim().startsWith('- [x] ')) {
      const isChecked = line.trim().startsWith('- [x] ')
      const text = line.trim().slice(6)
      renderedElements.push(
        <div key={idx} className="flex items-center gap-2 py-0.5 text-xs text-text">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="rounded border-border text-indigo-600 focus:ring-0 cursor-default"
          />
          <span className={isChecked ? 'line-through text-muted' : ''}>{formatInline(text)}</span>
        </div>
      )
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      renderedElements.push(
        <li key={idx} className="list-disc list-inside text-xs text-text py-0.5 ml-2">
          {formatInline(line.trim().slice(2))}
        </li>
      )
    } else if (line.trim().startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={idx}
          className="border-l-2 border-indigo-500 pl-3 py-1 my-1.5 text-xs text-muted italic bg-elevated/40 rounded-r-lg"
        >
          {formatInline(line.trim().slice(2))}
        </blockquote>
      )
    } else if (line.trim() === '---') {
      renderedElements.push(<hr key={idx} className="my-3 border-border/60" />)
    } else if (!line.trim()) {
      renderedElements.push(<div key={idx} className="h-2" />)
    } else {
      renderedElements.push(
        <p key={idx} className="text-xs text-text leading-relaxed">
          {formatInline(line)}
        </p>
      )
    }
  })

  return <div className="space-y-1 overflow-y-auto max-h-[480px] pr-2 select-text">{renderedElements}</div>
}

