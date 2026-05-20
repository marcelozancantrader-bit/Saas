"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type Datum = {
  label: string;
  count: number;
  mrrLabel: string;
  color: string;
};

type Props = {
  data: Datum[];
};

export function PlanDistChart({ data }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
            allowDecimals={false}
            width={30}
          />
          <Tooltip
            cursor={{ fill: "#27272a", opacity: 0.3 }}
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value, _name, item) => {
              const datum = (item as { payload?: Datum } | undefined)?.payload;
              const n = typeof value === "number" ? value : Number(value) || 0;
              return [`${n} orgs · ${datum?.mrrLabel ?? ""}`, ""];
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
