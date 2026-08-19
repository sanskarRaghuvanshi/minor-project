import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__content">
            <h2>Something went wrong</h2>
            <p className="error-boundary__message">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <div className="error-boundary__actions">
              <button className="btn btn--primary" onClick={this.handleRetry} type="button">
                Try Again
              </button>
              <button className="btn btn--secondary" onClick={() => window.location.href = '/'} type="button">
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
