import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 m-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <p className="font-semibold mb-1">Something went wrong loading this page.</p>
          <p className="text-sm font-mono whitespace-pre-wrap">{String(this.state.error?.message || this.state.error)}</p>
        </div>
      )
    }
    return this.props.children
  }
}