import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Button } from './ui/Button'

/**
 * What happens when a screen throws while rendering.
 *
 * Without this, one bad render — a null that was not supposed to be null, a
 * message from a peer in a shape nobody expected — unmounts the whole tree and
 * leaves a blank page with nothing but a console trace. With it, the failure
 * costs the screen it happened in and nothing else: the shell, the sidebar and
 * every other panel keep working.
 *
 * A class because there is still no other way to catch a render error in React;
 * `ScreenBoundary` is the hook-shaped front for it.
 */

export type ErrorBoundaryProps = {
  children: ReactNode
  /** Named in the console, so the trace says which part of the app gave up. */
  scope: string
  title: string
  description: string
  retryLabel: string
  reloadLabel: string
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ui] the ${this.props.scope} could not be rendered`, error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error === null) {
      return this.props.children
    }

    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="text-sm font-medium text-fg">{this.props.title}</p>
        <p className="max-w-sm text-xs text-pretty text-fg-muted">{this.props.description}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              this.setState({ error: null })
            }}
          >
            {this.props.retryLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.reload()
            }}
          >
            {this.props.reloadLabel}
          </Button>
        </div>
      </div>
    )
  }
}

export type ScreenBoundaryProps = {
  children: ReactNode
  /** For the console only; not shown to the user. */
  scope: string
  /**
   * Whether a navigation clears a caught error.
   *
   * True for a routed screen: a crash on one route must not follow the reader to
   * the next one — React would otherwise keep the failed tree and show the
   * fallback again on a screen that is perfectly fine.
   *
   * False for a panel that is *not* a route. Changing the key remounts what is
   * inside, and remounting the sidebar would throw away the search the reader
   * had typed the moment they opened a conversation.
   */
  resetOnNavigation?: boolean
}

/** A boundary around one screen, with the copy already translated. */
export function ScreenBoundary({
  children,
  scope,
  resetOnNavigation = true,
}: ScreenBoundaryProps) {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <ErrorBoundary
      key={resetOnNavigation ? location.pathname : 'panel'}
      scope={scope}
      title={t('errors.title')}
      description={t('errors.description')}
      retryLabel={t('errors.retry')}
      reloadLabel={t('errors.reload')}
    >
      {children}
    </ErrorBoundary>
  )
}
