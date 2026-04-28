'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface ExpenseChartsProps {
  maintenance: { type: string; cost: number; service_date: string }[]
  fuel: { total_cost: number; date: string }[]
  byCategory: Record<string, number>
}

function buildMonthlyData(
  maintenance: { cost: number; service_date: string }[],
  fuel: { total_cost: number; date: string }[]
) {
  const months: Record<string, { month: string; maintenance: number; fuel: number }> = {}

  const addToMonth = (date: string, field: 'maintenance' | 'fuel', amount: number) => {
    const [year, month] = date.split('-')
    const key = `${year}-${month}`
    if (!months[key]) months[key] = { month: `${year}-${month}`, maintenance: 0, fuel: 0 }
    months[key][field] += amount
  }

  for (const m of maintenance) addToMonth(m.service_date, 'maintenance', Number(m.cost))
  for (const f of fuel) addToMonth(f.date, 'fuel', Number(f.total_cost))

  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month))
}

export function ExpenseCharts({ maintenance, fuel, byCategory }: ExpenseChartsProps) {
  const monthlyData = buildMonthlyData(maintenance, fuel)

  const pieData = Object.entries(byCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: parseFloat(value.toFixed(2)),
  }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="maintenance" name="Maintenance" fill="#3b82f6" />
                <Bar dataKey="fuel" name="Fuel" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No expense data yet
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By Category</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: $${value}`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No expense data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
