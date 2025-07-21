'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className='p-6'>
      <Alert variant='destructive'>
        <AlertTriangle className='h-4 w-4' />
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription className='mt-2'>
          {error.message || 'An unexpected error occurred.'}
        </AlertDescription>
        <Button variant='outline' size='sm' className='mt-4' onClick={reset}>
          Try again
        </Button>
      </Alert>
    </div>
  );
}
