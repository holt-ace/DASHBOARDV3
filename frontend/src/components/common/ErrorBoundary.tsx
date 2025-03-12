import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'react-bootstrap';
import Logger from '@/utils/logger';
import DebugHelper from '@/utils/debugHelper';

interface Props {
  componentName?: string;
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * A React error boundary that catches errors in its child component tree
 * and displays a fallback UI instead of crashing the entire application.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console and any error reporting service
    const componentName = this.props.componentName || 'Unknown';
    Logger.error(`[ERROR BOUNDARY] Error caught in ${componentName}:`, error);
    Logger.error(`[ERROR BOUNDARY] Component Stack:`, errorInfo.componentStack);
    
    // Use the debug helper to track this error
    DebugHelper.renderError(componentName, error);
    
    this.setState({
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      const customFallback = this.props.fallback;
      if (customFallback) {
        return customFallback;
      }
      
      // Default fallback UI
      return (
        <Alert variant="danger" className="m-3">
          <Alert.Heading>Component Error</Alert.Heading>
          <p>
            There was an error rendering the {this.props.componentName || 'component'}.
          </p>
          {this.state.error && (
            <pre className="error-message p-2 bg-light">
              {this.state.error.toString()}
            </pre>
          )}
          <div className="d-flex justify-content-end">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={this.handleReset}
            >
              Try Again
            </Button>
          </div>
        </Alert>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;