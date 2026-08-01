'use client'

import { Inbox, AlertTriangle, Loader2 } from 'lucide-react'

type StateProps = {
  icon?: React.ReactNode
  title: string
  body?: React.ReactNode
  actions?: React.ReactNode
}

export function EmptyState({ icon, title, body, actions }: StateProps) {
  return (
    <div className="state-panel" role="status">
      <div className="state-panel__icon">{icon ?? <Inbox size={20} strokeWidth={1.75} />}</div>
      <div className="state-panel__title">{title}</div>
      {body && <div className="state-panel__body">{body}</div>}
      {actions && <div className="state-panel__actions">{actions}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', body, actions }: StateProps) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <div className="state-panel__icon">
        <AlertTriangle size={20} strokeWidth={1.75} />
      </div>
      <div className="state-panel__title">{title}</div>
      {body && <div className="state-panel__body">{body}</div>}
      {actions && <div className="state-panel__actions">{actions}</div>}
    </div>
  )
}

export function LoadingState({ title = 'Loading', body, actions }: StateProps) {
  return (
    <div className="state-panel" role="status">
      <div className="state-panel__icon">
        <Loader2 size={20} strokeWidth={1.75} className="state-panel__spin" />
      </div>
      <div className="state-panel__title">{title}</div>
      {body && <div className="state-panel__body">{body}</div>}
      {actions && <div className="state-panel__actions">{actions}</div>}
    </div>
  )
}
