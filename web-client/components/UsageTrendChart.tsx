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

interface UsageTrendChartProps {
  data: {
    date: string;
    user: number;
    guest: number;
  }[];
}

// 🎨 Tooltip แบบทางการ: เรียบง่าย ข้อมูลชัด ไม่เน้น Effect เยอะ
const FormalTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-300 p-3 shadow-md rounded-md min-w-[180px]">
        <p className="text-slate-900 text-sm font-bold mb-2 border-b border-slate-200 pb-2">
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
          {/* Summary Row */}
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

export default function UsageTrendChart({ data }: UsageTrendChartProps) {
  return (
    <div className="w-full h-[400px] bg-white p-6 rounded-lg border border-slate-300 shadow-sm flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">
          สถิติการใช้งานรายวัน
        </h3>
        <p className="text-slate-500 text-sm">
          เปรียบเทียบจำนวนผู้ใช้งาน (Registered User) และบุคคลทั่วไป (Guest)
        </p>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0,
            }}
            barGap={4} // ระยะห่างระหว่างแท่งในวันเดียวกัน
          >
            {/* เส้น Grid: ใช้สีเทาอ่อนและเส้นทึบหรือประบางๆ ให้ดูเป็นระเบียบ */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#475569" }} // สีเข้มขึ้นให้อ่านง่าย
              axisLine={{ stroke: "#cbd5e1" }} // มีเส้นแกน X ชัดเจน
              tickLine={false}
              dy={10}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
              tickCount={6}
            />

            <Tooltip
              content={<FormalTooltip />}
              cursor={{ fill: "#f1f5f9" }} // Highlight พื้นหลังตอนชี้
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                paddingBottom: "20px",
                fontSize: "12px",
                color: "#334155",
              }}
              iconType="square" // เปลี่ยนเป็นสี่เหลี่ยมให้ดูทางการ
            />

            {/* Bar 1: User (ใช้สีโทนน้ำเงิน/กรมท่า หรือส้มเข้มที่ไม่ฉูดฉาด) */}
            <Bar
              name="Registered User"
              dataKey="user"
              fill="#ea580c" // สีส้มเข้ม (Burnt Orange) ดูจริงจังกว่าสีส้มสว่าง
              // หรือถ้าอยากได้โทนธุรกิจจ๋าๆ แนะนำสีน้ำเงิน: fill="#1e40af" (Blue 800)
              radius={[2, 2, 0, 0]} // ลดความโค้งมนลง
              barSize={24}
            />

            {/* Bar 2: Guest (สีเทาเข้ม) */}
            <Bar
              name="Guest"
              dataKey="guest"
              fill="#94a3b8" // สีเทา (Slate 400)
              radius={[2, 2, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
