import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/shared/user-nav';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { MobileNav } from '@/components/shared/mobile-nav';

// Daftar route sidebar
const routes = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/budget-accounts', label: 'Budget Accounts' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/categories', label: 'Categories' },
  { href: '/agent', label: 'AI Agent' },
  { href: '/profile', label: 'Profile' },
];

// Komponen layout utama (server component) dengan optimasi performa
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-screen'>
      {/* Desktop Sidebar */}
      <aside className='hidden md:flex w-64 bg-gray-100 p-4 border-r flex-col'>
        <h1 className='text-xl font-bold mb-8'>DanaWise AI</h1>
        <nav className='flex flex-col space-y-2'>
          {routes.map(route => (
            <Link
              key={route.href}
              href={route.href}
              className={cn('px-3 py-2 rounded-md hover:bg-gray-200 transition-colors')}
              prefetch={true} // Prefetch untuk navigasi yang lebih cepat
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </aside>
      
      <div className='flex flex-col flex-1'>
        <header className='flex h-16 items-center justify-between border-b px-4 md:px-8'>
          {/* Mobile Navigation */}
          <div className='flex items-center gap-4'>
            <MobileNav />
            <h1 className='text-xl font-bold md:hidden'>DanaWise AI</h1>
          </div>
          
          <ErrorBoundary>
            <UserNav />
          </ErrorBoundary>
        </header>
        <main className='flex-1 p-4 md:p-8 bg-gray-50'>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
