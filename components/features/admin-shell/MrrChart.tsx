"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { label: string; value: number };

type Props = {
  data: Point[];
  /** Formato dos valores no tooltip e eixo */
  formatter?: (v: number) => string;
  color?: string;
};

export function MrrChart({ data, formatter = (v) => String(v), color = "#fbbf24" }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={formatter}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e4e4e7" }}
            itemStyle={{ color: color }}
            formatter={(value) => [
              formatter(typeof value === "number" ? value : Number(value) || 0),
              "",
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
