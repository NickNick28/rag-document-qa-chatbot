"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TokenUsageChartProps {
  data: {
    date: string;
    user: number;
    guest: number;
  }[];
}

// Custom Tooltip ให้ดูสวยงาม
const TokenTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 shadow-lg rounded-lg min-w-[180px]">
        <p className="text-slate-800 text-sm font-bold mb-2 border-b border-slate-100 pb-2">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: entry.fill }}
                ></span>
                {entry.name}
              </span>
              <span className="font-semibold text-slate-900">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-slate-100 font-bold text-slate-800">
            <span>Total</span>
            <span>
              {(payload[0].value + payload[1].value).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function TokenUsageChart({ data }: TokenUsageChartProps) {
  return (
    <div className="w-full h-[400px] bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">
          Daily Token Consumption
        </h3>
        <p className="text-slate-500 text-sm">
          ปริมาณการใช้ Token รายวัน (คำนวณจากส่วนต่างยอดสะสม)
        </p>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickCount={6}
            />
            <Tooltip content={<TokenTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: "20px", fontSize: "12px" }}
              iconType="square"
            />

            {/* User: สีม่วง */}
            <Bar
              name="Registered User"
              dataKey="user"
              fill="#8b5cf6" // Violet-500
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            {/* Guest: สีเทา */}
            <Bar
              name="Guest"
              dataKey="guest"
              fill="#94a3b8" // Slate-400
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
