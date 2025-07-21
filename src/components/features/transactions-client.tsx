// src/components/features/transactions-client.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import type { Category, Transaction } from '@/generated/prisma';
import { CalendarIcon, Loader2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  date: z.date(),
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  budgetAccountId: z.string().optional(), // Tambahan untuk budget account
});

type TransactionFormValues = z.infer<typeof formSchema>;

type EnrichedTransaction = Transaction & {
  category: Category | null;
  budgetAccount?: { id: string; name: string; type: string } | null;
};

interface TransactionsClientProps {
  initialTransactions: EnrichedTransaction[];
  categories: Category[];
  budgetAccounts?: { id: string; name: string; type: string }[];
}

// Memoized currency formatter
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);

export const TransactionsClient = ({
  initialTransactions,
  categories,
  budgetAccounts = [],
}: TransactionsClientProps) => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  // Handler untuk delete transaksi
  const handleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const response = await fetch(`/api/transactions/${transactionToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      setTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete));
      toast.success('Transaction deleted successfully!');
    } catch {
      toast.error('Something went wrong during deletion.');
    } finally {
      setShowDeleteDialog(false);
      setTransactionToDelete(null);
    }
  };

  // Memoize category options untuk performa
  const categoryOptions = useMemo(
    () =>
      categories.map(cat => ({
        value: cat.id,
        label: cat.name,
      })),
    [categories]
  );

  // Load more transactions dengan pagination
  const loadMoreTransactions = useCallback(
    async (page: number = 1) => {
      if (isLoading) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/transactions?page=${page}&limit=10`);
        if (!response.ok) throw new Error('Failed to load transactions');

        const data = await response.json();
        if (page === 1) {
          setTransactions(data.transactions);
        } else {
          setTransactions(prev => [...prev, ...data.transactions]);
        }
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setHasMore(data.pagination.page < data.pagination.totalPages);
      } catch (_error) {
        toast.error('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // Load initial data jika diperlukan
  useEffect(() => {
    if (initialTransactions.length === 0) {
      loadMoreTransactions(1);
    }
  }, [initialTransactions.length, loadMoreTransactions]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: new Date(),
      type: 'EXPENSE' as const,
      categoryId: '',
      budgetAccountId: '',
    },
  });

  // Optimized submit handler dengan useCallback
  const onSubmit = useCallback(
    async (values: TransactionFormValues) => {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error('Something went wrong');
        const newTransaction = await response.json();

        // Untuk memperbarui UI, kita perlu mencari data kategori yang sesuai
        const category = categories.find(c => c.id === newTransaction.categoryId);
        setTransactions(prev => [{ ...newTransaction, category }, ...prev]);
        toast.success('Transaction recorded!');
        form.reset();
        setIsOpen(false);
      } catch (_error) {
        toast.error('Failed to record transaction.');
      }
    },
    [categories, form]
  );

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMoreTransactions(currentPage + 1);
    }
  }, [hasMore, isLoading, currentPage, loadMoreTransactions]);

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-3xl font-bold'>Transactions</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add New Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record a New Transaction</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. Lunch with client'
                          {...field}
                          value={
                            typeof field.value === 'string' ? field.value : String(field.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='amount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          {...field}
                          value={
                            typeof field.value === 'number' ? field.value : Number(field.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={
                          typeof field.value === 'string' ? field.value : String(field.value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='INCOME'>Income</SelectItem>
                          <SelectItem value='EXPENSE'>Expense</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='categoryId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={
                          typeof field.value === 'string' ? field.value : String(field.value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a category' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='budgetAccountId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Account (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select an account (optional)' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='none'>No Account</SelectItem>
                          {budgetAccounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='date'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {field.value ? (
                                format(
                                  field.value instanceof Date ? field.value : new Date(field.value),
                                  'PPP'
                                )
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0' align='start'>
                          <Calendar
                            mode='single'
                            selected={
                              field.value instanceof Date ? field.value : new Date(field.value)
                            }
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit' className='w-full'>
                  Create Transaction
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
              <TableHead className='w-[50px]'></TableHead> {/* Kolom baru untuk actions */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => (
              <TableRow key={tx.id}>
                <TableCell>{format(new Date(tx.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className='font-medium'>{tx.description}</TableCell>
                <TableCell>
                  <span className='bg-gray-200 px-2 py-1 rounded-md text-sm'>
                    {tx.category?.name || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>
                  {tx.budgetAccount ? (
                    <span className='bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm'>
                      {tx.budgetAccount.name}
                    </span>
                  ) : (
                    <span className='text-muted-foreground text-sm'>No Account</span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold',
                    tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {tx.type === 'EXPENSE' && '-'}
                  {formatCurrency(tx.amount)}
                </TableCell>
                {/* Tombol Aksi (Delete) */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' className='h-8 w-8 p-0'>
                        <span className='sr-only'>Open menu</span>
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onSelect={() => {
                          setTransactionToDelete(tx.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                      {/* Di sini nanti bisa tambahkan Edit */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this transaction record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination dan Load More */}
      <div className='flex items-center justify-between mt-6'>
        <div className='text-sm text-muted-foreground'>
          Showing {transactions.length} transactions
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </div>

        {hasMore && (
          <Button onClick={handleLoadMore} disabled={isLoading} variant='outline'>
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
