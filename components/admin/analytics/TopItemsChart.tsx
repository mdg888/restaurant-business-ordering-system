'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPrice } from '@/lib/utils'

interface Props {
  data: { name: string; qty: number; revenue: number }[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm">
      <p className="text-gray-700 font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-500">
          {p.name === 'qty' ? `${p.value} sold` : formatPrice(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function TopItemsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
      >
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#374151' }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="qty" fill="#f97316" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
