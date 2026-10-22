import {
   Bar,
   BarChart,
   CartesianGrid,
   Cell,
   Legend,
   Line,
   LineChart,
   Pie,
   PieChart,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
} from "recharts";
import type { DistributionPoint, RecruitmentTrendPoint, SalaryPoint } from "../homeData";
import type { SectionStatus } from "../useHomeData";
import SectionPlaceholder from "./SectionPlaceholder";

const tooltipStyle = { backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" };

type Props = {
   status: SectionStatus;
   trend: RecruitmentTrendPoint[];
   distribution: DistributionPoint[];
   salaryByPosition: SalaryPoint[];
};

export default function RecruitmentCharts({ status, trend, distribution, salaryByPosition }: Props) {
   const hasTrend = trend.some((point) => point.jobs > 0);

   return (
      <section className="space-y-6">
         <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
               Tình hình tuyển dụng hiện tại
            </h2>
         </div>

         <div className="grid gap-6">
            <div className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-12 md:px-8">
               <h3 className="text-lg font-bold text-slate-900">Biểu đồ tăng trưởng</h3>
               <p className="mt-0.5 text-sm text-slate-700">Số lượng việc làm mới và công ty tuyển dụng mỗi tháng</p>

               <div className="mt-6">
                  {status === "ready" && hasTrend ? (
                     <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                           <XAxis dataKey="month" />
                           <YAxis />
                           <Tooltip contentStyle={tooltipStyle} />
                           <Legend />
                           <Line type="monotone" dataKey="jobs" stroke="#047857" name="Số việc làm" strokeWidth={2} dot={{ fill: "#047857", r: 4 }} />
                           <Line type="monotone" dataKey="companies" stroke="#0369a1" name="Số công ty tuyển" strokeWidth={2} dot={{ fill: "#0369a1", r: 4 }} />
                        </LineChart>
                     </ResponsiveContainer>
                  ) : (
                     <SectionPlaceholder status={status} height={300} />
                  )}
               </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
               <div className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-12 md:px-8">
                  <h3 className="text-lg font-bold text-slate-900">Phân bố việc làm theo ngành</h3>
                  <div className="mt-6">
                     {status === "ready" && distribution.length ? (
                        <ResponsiveContainer width="100%" height={250}>
                           <PieChart>
                              <Pie
                                 data={distribution}
                                 cx="50%"
                                 cy="50%"
                                 labelLine={false}
                                 label={({ name, value }: { name?: string; value?: number }) => `${name}: ${value}`}
                                 outerRadius={80}
                                 fill="#8884d8"
                                 dataKey="value"
                              >
                                 {distribution.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                 ))}
                              </Pie>
                              <Tooltip />
                           </PieChart>
                        </ResponsiveContainer>
                     ) : (
                        <SectionPlaceholder status={status} height={250} />
                     )}
                  </div>
               </div>

               <div className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-12 md:px-8">
                  <h3 className="text-lg font-bold text-slate-900">Mức lương trung bình</h3>
                  <div className="mt-6">
                     {status === "ready" && salaryByPosition.length ? (
                        <ResponsiveContainer width="100%" height={250}>
                           <BarChart data={salaryByPosition} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="position" />
                              <YAxis />
                              <Tooltip contentStyle={tooltipStyle} />
                              <Bar dataKey="salary" name="Lương (triệu)" radius={[8, 8, 0, 0]}>
                                 {salaryByPosition.map((entry) => (
                                    <Cell key={entry.position} fill={entry.color} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     ) : (
                        <SectionPlaceholder status={status} height={250} />
                     )}
                  </div>
               </div>
            </div>
         </div>
      </section>
   );
}
