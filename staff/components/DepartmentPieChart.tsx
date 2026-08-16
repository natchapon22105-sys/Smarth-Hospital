"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#22D3EE",
  "#A78BFA",
  "#F472B6",
  "#FBBF24",
  "#34D399",
  "#F87171",
  "#60A5FA",
];

export default function DepartmentPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const hasData = data && data.length > 0;
  const chartData = hasData ? data : [{ name: "", value: 1 }];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={95}
          innerRadius={50}
          paddingAngle={hasData ? 2 : 0}
          label={hasData ? ({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          : false}
          labelLine={hasData}
        >
          {hasData ? (
            data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))
          ) : (
            <Cell fill="#374151" />
          )}
        </Pie>
        {hasData && (
          <>
            <Tooltip
              contentStyle={{
                background: "#071427",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#fff",
              }}
              formatter={(value, name) => [`${value} ครั้ง`, name as string]}
            />
            <Legend
              wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
            />
          </>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
