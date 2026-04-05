'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ExpiryChartPoint } from '@/types'

interface Props {
  data: ExpiryChartPoint[]
}

export default function ExpiryChart({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Expiry Timeline</h3>
      <p className="text-xs text-gray-500 mb-5">Number of facilities expiring per month (next 12 months)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1e3a8a',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px',
            }}
            cursor={{ fill: 'rgba(30, 58, 138, 0.05)' }}
            formatter={(value: number) => [value, 'Facilities']}
          />
          <Bar
            dataKey="count"
            fill="#1d4ed8"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
