// src/components/features/dashboard-client.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tooltip, Legend } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Category, Transaction } from '@/generated/prisma';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Filter } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Memoized currency formatter untuk performa
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Chart config untuk Bar Chart
const barChartConfig = {
  income: {
    label: 'Income',
    color: '#22c55e',
  },
  expense: {
    label: 'Expense',
    color: '#ef4444',
  },
} satisfies ChartConfig;

type EnrichedTransaction = Transaction & {
  category: Category | null;
  budgetAccount?: { id: string; name: string; type: string } | null;
};

interface DashboardClientProps {
  stats: {
    income: number;
    expense: number;
    balance: number;
  };
  recentTransactions: EnrichedTransaction[];
  categoryData: { name: string; value: number }[];
  timeSeriesData: Pick<Transaction, 'date' | 'amount' | 'type'>[];
  budgetAccounts?: {
    id: string;
    name: string;
    type: string;
    balance: number;
    color?: string | null;
  }[];
}

export const DashboardClient = ({
  stats,
  recentTransactions,
  categoryData,
  timeSeriesData: rawTimeSeriesData,
  budgetAccounts = [],
}: DashboardClientProps) => {
  // State untuk filter budget account dan time range
  const [selectedBudgetAccount, setSelectedBudgetAccount] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('30d');

  // Memoize chart data untuk mencegah re-render - data terpisah untuk setiap batang
  const chartData = useMemo(
    () => [
      { name: 'Income', value: stats.income, type: 'income' },
      { name: 'Expense', value: stats.expense, type: 'expense' },
    ],
    [stats.income, stats.expense]
  );

  // Aggregated data untuk Area Chart - group by date dan sum income/expense
  const filteredData = useMemo(() => {
    const referenceDate = new Date();
    let daysToSubtract = 30;

    // Parse time range dengan format baru
    switch (timeRange) {
      case '7d':
        daysToSubtract = 7;
        break;
      case '30d':
        daysToSubtract = 30;
        break;
      case '90d':
        daysToSubtract = 90;
        break;
      case '365d':
        daysToSubtract = 365;
        break;
      default:
        daysToSubtract = 30;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Filter data berdasarkan range waktu
    const filtered = rawTimeSeriesData.filter(item => new Date(item.date) >= startDate);

    // Group data by date dan aggregate income/expense
    const groupedData = filtered.reduce((acc, transaction) => {
      const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          income: 0,
          expense: 0,
        };
      }

      if (transaction.type === 'INCOME') {
        acc[dateKey].income += transaction.amount;
      } else {
        acc[dateKey].expense += transaction.amount;
      }

      return acc;
    }, {} as Record<string, { date: string; income: number; expense: number }>);

    // Convert ke array dan sort by date
    return Object.values(groupedData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [rawTimeSeriesData, timeRange]);

  const [insight, setInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  // Use useCallback untuk memoize function
  const handleGetInsight = useCallback(async () => {
    setIsLoading(true);
    setInsight('');
    try {
      const response = await fetch('/api/insight');
      if (!response.ok) throw new Error('Failed to fetch insight');

      const data = await response.json();
      setInsight(data.insight);
    } catch (_error) {
      toast.error('Could not get AI insight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div>
      {/* Header dengan Filter */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
        <h2 className='text-3xl font-bold'>Dashboard</h2>

        <div className='flex flex-col sm:flex-row gap-2'>
          <Select value={selectedBudgetAccount} onValueChange={setSelectedBudgetAccount}>
            <SelectTrigger className='w-full sm:w-[200px]'>
              <Filter className='mr-2 h-4 w-4' />
              <SelectValue placeholder='All Accounts' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Accounts</SelectItem>
              {budgetAccounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className='w-full sm:w-[150px]'>
              <SelectValue placeholder='Time Range' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='7d'>Last 7 days</SelectItem>
              <SelectItem value='30d'>Last 30 days</SelectItem>
              <SelectItem value='90d'>Last 90 days</SelectItem>
              <SelectItem value='365d'>Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bagian Kartu Ringkasan */}
      <div className='grid gap-4 md:grid-cols-3 mb-8'>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>{formatCurrency(stats.income)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>Total Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>{formatCurrency(stats.expense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{formatCurrency(stats.balance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tombol Insight AI */}
      <div className='flex items-center justify-end mb-6'>
        <Button onClick={handleGetInsight} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Get AI Insight'}
        </Button>
      </div>

      {/* Bagian Insight AI */}
      {insight && (
        <Alert className='mb-8 bg-blue-50 border-blue-200'>
          <Lightbulb className='h-4 w-4' />
          <AlertTitle className='font-semibold text-blue-800'>Financial Insight</AlertTitle>
          <AlertDescription className='text-blue-700'>{insight}</AlertDescription>
        </Alert>
      )}

      {/* Bagian Grafik dan Transaksi Terakhir */}
      <div className='grid gap-8 lg:grid-cols-3'>
        {/* Grafik Area Interaktif untuk Time Series */}
        <Card className='lg:col-span-2'>
          <CardHeader className='flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row'>
            <div className='grid flex-1 gap-1'>
              <CardTitle>Income & Expense Trend</CardTitle>
              <CardDescription>Financial activity for selected range</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className='hidden w-[160px] rounded-lg sm:ml-auto sm:flex'
                aria-label='Select a value'
              >
                <SelectValue placeholder='Last 30 days' />
              </SelectTrigger>
              <SelectContent className='rounded-xl'>
                <SelectItem value='90d' className='rounded-lg'>
                  Last 3 months
                </SelectItem>
                <SelectItem value='30d' className='rounded-lg'>
                  Last 30 days
                </SelectItem>
                <SelectItem value='7d' className='rounded-lg'>
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
            {filteredData.length === 0 ? (
              <div className='flex items-center justify-center h-[250px] text-muted-foreground'>
                No data available for selected time range
              </div>
            ) : (
              <ChartContainer
                config={{
                  income: {
                    label: 'Income',
                    color: '#22c55e',
                  },
                  expense: {
                    label: 'Expense',
                    color: '#ef4444',
                  },
                }}
                className='aspect-auto h-[250px] w-full'
              >
                <ResponsiveContainer width='100%' height={250}>
                  <AreaChart
                    data={filteredData}
                    margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                  >
                    <defs>
                      <linearGradient id='fillIncome' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#22c55e' stopOpacity={0.8} />
                        <stop offset='95%' stopColor='#22c55e' stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id='fillExpense' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#ef4444' stopOpacity={0.8} />
                        <stop offset='95%' stopColor='#ef4444' stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis
                      dataKey='date'
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={value => {
                        const date = new Date(value);
                        return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tickFormatter={value => `Rp${Number(value) / 1000}k`} />
                    <ChartTooltip
                      cursor={{ stroke: '#ccc', strokeDasharray: '5 5' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length && hoveredArea) {
                          // Filter payload berdasarkan area yang di-hover
                          const filteredPayload = payload.filter(
                            entry => entry.dataKey === hoveredArea
                          );
                          if (filteredPayload.length > 0) {
                            const entry = filteredPayload[0];
                            return (
                              <div className='bg-white p-3 border rounded shadow-lg'>
                                <p className='font-medium mb-2'>
                                  {new Date(label).toLocaleDateString('id-ID', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                                <div className='flex items-center gap-2'>
                                  <div
                                    className='w-3 h-3 rounded-full'
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className='text-sm'>
                                    {entry.dataKey === 'income' ? 'Income' : 'Expense'}:{' '}
                                    {formatCurrency(Number(entry.value))}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        }
                        return null;
                      }}
                    />
                    <Area
                      dataKey='income'
                      type='monotone'
                      fill='url(#fillIncome)'
                      stroke='#22c55e'
                      strokeWidth={2}
                      name='Income'
                      activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2, fill: '#fff' }}
                      onMouseEnter={() => setHoveredArea('income')}
                      onMouseLeave={() => setHoveredArea(null)}
                    />
                    <Area
                      dataKey='expense'
                      type='monotone'
                      fill='url(#fillExpense)'
                      stroke='#ef4444'
                      strokeWidth={2}
                      name='Expense'
                      activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                      onMouseEnter={() => setHoveredArea('expense')}
                      onMouseLeave={() => setHoveredArea(null)}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Grafik Pie Chart untuk Kategori */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Expense Categories</CardTitle>
            <CardDescription>
              {categoryData.length === 0
                ? 'No expense data available'
                : `Total: ${formatCurrency(
                    categoryData.reduce((sum, item) => sum + item.value, 0)
                  )}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className='flex items-center justify-center h-[300px] text-muted-foreground'>
                No expense categories to display
              </div>
            ) : (
              <ResponsiveContainer height={300} width='100%'>
                <PieChart>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    labelFormatter={label => `Category: ${label}`}
                  />
                  <Legend verticalAlign='bottom' height={36} formatter={value => value} />
                  <Pie
                    data={categoryData}
                    dataKey='value'
                    nameKey='name'
                    cx='50%'
                    cy='50%'
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    strokeWidth={2}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bagian Bar Chart dan Transaksi Terakhir */}
      <div className='grid gap-8 md:grid-cols-2 mt-8'>
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense Summary</CardTitle>
            <CardDescription>Overall financial comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig}>
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey='name' tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis
                  tickFormatter={value => `Rp${Number(value) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const entry = payload[0];
                      return (
                        <div className='bg-white p-3 border rounded shadow-lg'>
                          <p className='font-medium mb-2'>{entry.payload?.name}</p>
                          <div className='flex items-center gap-2'>
                            <div
                              className='w-3 h-3 rounded-full'
                              style={{
                                backgroundColor:
                                  entry.payload?.type === 'income' ? '#22c55e' : '#ef4444',
                              }}
                            />
                            <span className='text-sm'>
                              {entry.payload?.type === 'income' ? 'Total Income' : 'Total Expense'}:{' '}
                              {formatCurrency(Number(entry.value))}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey='value' radius={4}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === 'income' ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </Bar>
                <Legend
                  content={() => (
                    <div className='flex justify-center gap-4 mt-4'>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 bg-green-500 rounded-sm'></div>
                        <span className='text-sm'>Income</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 bg-red-500 rounded-sm'></div>
                        <span className='text-sm'>Expense</span>
                      </div>
                    </div>
                  )}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Budget Accounts Summary */}
        {budgetAccounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Budget Accounts</CardTitle>
              <CardDescription>Your account balances overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {budgetAccounts.map(account => (
                  <div
                    key={account.id}
                    className='flex items-center justify-between p-3 rounded-lg bg-muted/50'
                  >
                    <div className='flex items-center gap-3'>
                      <div
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: account.color || '#0088FE' }}
                      />
                      <div>
                        <p className='font-medium'>{account.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {account.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='font-semibold'>{formatCurrency(account.balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className='font-medium'>{tx.description}</div>
                      <div className='text-sm text-muted-foreground'>
                        {format(new Date(tx.date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold',
                        tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
