"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jan", score: 72 },
  { month: "Feb", score: 76 },
  { month: "Mar", score: 81 },
  { month: "Apr", score: 84 },
  { month: "May", score: 89 },
  { month: "Jun", score: 94 },
];

export default function RepositoryHealthChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />

        <Line
          type="monotone"
          dataKey="score"
          strokeWidth={3}
          data={data}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}