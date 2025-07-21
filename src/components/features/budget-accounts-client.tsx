// src/components/features/budget-accounts-client.tsx
'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  Edit,
  Trash2,
  DollarSign,
} from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  type: z.enum(['BANK', 'EWALLET', 'CASH', 'INVESTMENT', 'CREDIT_CARD']),
  balance: z.coerce.number().min(0, 'Balance cannot be negative'),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Type untuk budget account dengan count
type BudgetAccountWithCount = {
  id: string;
  name: string;
  type: 'BANK' | 'EWALLET' | 'CASH' | 'INVESTMENT' | 'CREDIT_CARD';
  balance: number;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    transactions: number;
  };
};

interface BudgetAccountsClientProps {
  initialBudgetAccounts: BudgetAccountWithCount[];
}

// Icon mapping berdasarkan type
const getAccountIcon = (type: string) => {
  switch (type) {
    case 'BANK':
      return <CreditCard className='h-6 w-6' />;
    case 'EWALLET':
      return <Wallet className='h-6 w-6' />;
    case 'CASH':
      return <Banknote className='h-6 w-6' />;
    case 'INVESTMENT':
      return <TrendingUp className='h-6 w-6' />;
    case 'CREDIT_CARD':
      return <CreditCard className='h-6 w-6' />;
    default:
      return <DollarSign className='h-6 w-6' />;
  }
};

// Currency formatter
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);

// Color options untuk account
const colorOptions = [
  { value: '#0088FE', label: 'Blue' },
  { value: '#00C49F', label: 'Green' },
  { value: '#FFBB28', label: 'Yellow' },
  { value: '#FF8042', label: 'Orange' },
  { value: '#8884d8', label: 'Purple' },
  { value: '#82ca9d', label: 'Mint' },
  { value: '#ffc658', label: 'Gold' },
  { value: '#ff7300', label: 'Red' },
];

export const BudgetAccountsClient = ({ initialBudgetAccounts }: BudgetAccountsClientProps) => {
  const [budgetAccounts, setBudgetAccounts] = useState(initialBudgetAccounts);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BudgetAccountWithCount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BudgetAccountWithCount | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'BANK',
      balance: 0,
      color: colorOptions[0].value,
    },
  });

  // Reset form when opening/closing dialog
  const resetForm = useCallback(() => {
    form.reset({
      name: '',
      type: 'BANK',
      balance: 0,
      color: colorOptions[0].value,
    });
    setEditingAccount(null);
  }, [form]);

  // Handle create/update
  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const url = editingAccount
          ? `/api/budget-accounts/${editingAccount.id}`
          : '/api/budget-accounts';

        const method = editingAccount ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Something went wrong');
        }

        const budgetAccount = await response.json();

        if (editingAccount) {
          // Update existing account
          setBudgetAccounts(prev =>
            prev.map(acc => (acc.id === editingAccount.id ? budgetAccount : acc))
          );
          toast.success('Budget account updated successfully!');
        } else {
          // Add new account
          setBudgetAccounts(prev => [budgetAccount, ...prev]);
          toast.success('Budget account created successfully!');
        }

        resetForm();
        setIsOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save budget account';
        toast.error(message);
      }
    },
    [editingAccount, resetForm]
  );

  // Handle edit
  const handleEdit = useCallback(
    (account: BudgetAccountWithCount) => {
      setEditingAccount(account);
      form.reset({
        name: account.name,
        type: account.type,
        balance: account.balance,
        color: account.color || colorOptions[0].value,
      });
      setIsOpen(true);
    },
    [form]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingAccount) return;

    try {
      const response = await fetch(`/api/budget-accounts/${deletingAccount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }

      setBudgetAccounts(prev => prev.filter(acc => acc.id !== deletingAccount.id));

      toast.success('Budget account deleted successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      toast.error(message);
    } finally {
      setShowDeleteDialog(false);
      setDeletingAccount(null);
    }
  }, [deletingAccount]);

  // Calculate total balance
  const totalBalance = budgetAccounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold'>Budget Accounts</h2>
          <p className='text-muted-foreground'>
            Manage your accounts and track balances across different sources
          </p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={open => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Edit Budget Account' : 'Create New Budget Account'}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? 'Update your budget account details'
                  : 'Add a new account to track your finances'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g., BCA, GoPay, Cash' {...field} />
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
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select account type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='BANK'>Bank Account</SelectItem>
                          <SelectItem value='EWALLET'>E-Wallet</SelectItem>
                          <SelectItem value='CASH'>Cash</SelectItem>
                          <SelectItem value='INVESTMENT'>Investment</SelectItem>
                          <SelectItem value='CREDIT_CARD'>Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='balance'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input type='number' step='0.01' placeholder='0' {...field} />
                      </FormControl>
                      <FormDescription>Enter your current account balance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='color'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Theme</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select color' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className='flex items-center gap-2'>
                                <div
                                  className='w-4 h-4 rounded-full border'
                                  style={{ backgroundColor: color.value }}
                                />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='flex justify-end gap-2 pt-4'>
                  <Button type='button' variant='outline' onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type='submit'>
                    {editingAccount ? 'Update Account' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Balance</CardTitle>
          <CardDescription>Combined balance across all your accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-3xl font-bold'>{formatCurrency(totalBalance)}</div>
          <p className='text-sm text-muted-foreground'>
            Across {budgetAccounts.length} account{budgetAccounts.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {budgetAccounts.map(account => (
          <Card key={account.id} className='relative'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='flex items-center gap-2'>
                <div
                  className='p-2 rounded-full'
                  style={
                    account.color
                      ? {
                          backgroundColor: `${account.color}20`,
                          color: account.color,
                        }
                      : {}
                  }
                >
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <CardTitle className='text-base'>{account.name}</CardTitle>
                  <CardDescription className='text-xs'>
                    {account.type
                      .replace('_', ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, l => l.toUpperCase())}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className='h-8 w-8 p-0'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={() => handleEdit(account)}>
                    <Edit className='mr-2 h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='text-red-600'
                    onClick={() => {
                      setDeletingAccount(account);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{formatCurrency(account.balance)}</div>
              <p className='text-xs text-muted-foreground'>
                {account._count.transactions} transaction
                {account._count.transactions !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {budgetAccounts.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Wallet className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-2'>No Budget Accounts Yet</h3>
            <p className='text-muted-foreground text-center mb-4'>
              Create your first budget account to start tracking your finances across different
              sources.
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAccount?.name}"?
              {deletingAccount?._count.transactions ? (
                <span className='block mt-2 text-amber-600'>
                  This account has {deletingAccount._count.transactions} transaction(s). The account
                  will be deactivated instead of permanently deleted.
                </span>
              ) : (
                <span className='block mt-2'>This action cannot be undone.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-red-600 hover:bg-red-700'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
