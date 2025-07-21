'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='p-6'>
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className='mt-2'>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </AlertDescription>
            <Button
              variant='outline'
              size='sm'
              className='mt-4'
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try again
            </Button>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
