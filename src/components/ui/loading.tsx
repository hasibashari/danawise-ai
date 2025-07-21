import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  text?: string;
}

export const Loading = ({ className, text = 'Loading...' }: LoadingProps) => {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className='flex items-center space-x-2'>
        <Loader2 className='h-4 w-4 animate-spin' />
        <span className='text-sm text-muted-foreground'>{text}</span>
      </div>
    </div>
  );
};

export const PageLoading = () => {
  return (
    <div className='flex items-center justify-center min-h-[400px]'>
      <div className='flex items-center space-x-2'>
        <Loader2 className='h-6 w-6 animate-spin' />
        <span className='text-lg text-muted-foreground'>Loading...</span>
      </div>
    </div>
  );
};
