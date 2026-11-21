import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  componentStack: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ARGUS crashed:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? '' })
  }

  render() {
    const { error, componentStack } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash" role="alert">
        <h1>ARGUS hit an error</h1>
        <p>Reload to restart the demo. If it happens again, copy the details below.</p>
        <pre>{`${error.name}: ${error.message}\n\nBrowser: ${navigator.userAgent}\n${componentStack}`}</pre>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
