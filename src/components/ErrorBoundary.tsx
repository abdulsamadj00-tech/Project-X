
import * as React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-rose-500/10 rounded-3xl border border-rose-500/20 text-center backdrop-blur-xl">
          <div className="bg-rose-500/20 p-4 rounded-full mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-rose-300 mb-2 font-display">Something went wrong</h2>
          <p className="text-rose-400/80 mb-6 max-w-md mx-auto text-sm">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-rose-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

