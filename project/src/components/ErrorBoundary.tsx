// src/components/ErrorBoundary.tsx

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', margin: '2rem', border: '2px solid red', borderRadius: '8px', backgroundColor: '#fff5f5' }}>
          <h1 style={{ color: '#c53030', fontSize: '24px' }}>Something went wrong.</h1>
          <p style={{ marginTop: '1rem' }}>Please refresh the page. If the problem persists, check the console for more details.</p>
          <pre style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fed7d7', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;