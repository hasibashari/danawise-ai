// src/components/features/categories-client.tsx
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { Category } from '@/generated/prisma';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

interface CategoriesClientProps {
  initialCategories: Category[];
}

export const CategoriesClient = ({ initialCategories }: CategoriesClientProps) => {
  const [categories, setCategories] = useState(initialCategories);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Memoize sorted categories untuk performa (remove unused var warning)
  // const _sortedCategories = useMemo(() =>
  //   [...categories].sort((a, b) => a.name.localeCompare(b.name)),
  //   [categories]
  // );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Something went wrong');

      const newCategory = await response.json();
      setCategories(prev => [newCategory, ...prev]);
      toast.success('Category created!');
      form.reset();
      setIsOpen(false);
    } catch (_error) {
      toast.error('Failed to create category.');
    }
  };

  const handleDelete = async (categoryId: string) => {
    setDeletingId(categoryId);
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.canDelete === false) {
          toast.error(data.message);
        } else {
          throw new Error(data.message || 'Failed to delete category');
        }
        return;
      }

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast.success('Category deleted successfully!');
    } catch (_error) {
      toast.error('Failed to delete category.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-3xl font-bold'>Categories</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add New Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Category</DialogTitle>
              <DialogDescription>Enter a name for your new category.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Food, Salary' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit' className='w-full'>
                  Create Category
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
              <TableHead>Name</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead className='w-24'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category.id}>
                <TableCell className='font-medium'>{category.name}</TableCell>
                <TableCell>{new Date(category.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        disabled={deletingId === category.id}
                        className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{category.name}"? This action cannot be
                          undone.
                          {/* Note: If this category is used by transactions, deletion will be prevented. */}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(category.id)}
                          className='bg-red-600 hover:bg-red-700'
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
