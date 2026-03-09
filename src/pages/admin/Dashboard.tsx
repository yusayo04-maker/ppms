import { useState, useEffect } from 'react';
import { Users, ClipboardList, AlertCircle, TrendingUp, Activity, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const StatCard = ({ title, value, icon, change, changeType, loading }: any) => (
    <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
                ) : (
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                )}
            </div>
            <div className={`p-3 rounded-lg ${changeType === 'increase' ? 'bg-green-50 text-green-600' :
                changeType === 'decrease' ? 'bg-red-50 text-red-600' :
                    'bg-blue-50 text-blue-600'
                }`}>
                {icon}
            </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
            <TrendingUp size={16} className={`mr-1 ${changeType === 'increase' ? 'text-green-500' :
                changeType === 'decrease' ? 'text-red-500' :
                    'text-gray-400'
                }`} />
            <span className={
                changeType === 'increase' ? 'text-green-600 font-medium' :
                    changeType === 'decrease' ? 'text-red-600 font-medium' :
                        'text-gray-500'
            }>
                {change}
            </span>
            <span className="text-gray-500 ml-2">vs last month</span>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        activePatients: 0,
        pendingReferrals: 0,
        pastDueLabs: 0,
        completedCycles: 0,
        totalSmsSent: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [demographicsData, setDemographicsData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [
                    { count: activePatientsCount },
                    { count: pendingReferralsCount },
                    { count: pastDueLabsCount },
                    { count: completedCyclesCount },
                    { count: smsCount },
                    { data: activities },
                    { data: patients }
                ] = await Promise.all([
                    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('is_admitted', true),
                    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
                    supabase.from('laboratories').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
                    supabase.from('pregnancy_cycles').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
                    supabase.from('sms_logs').select('*', { count: 'exact', head: true }).eq('status', 'success'),
                    supabase.from('notes')
                        .select('*, patient:patients(first_name, last_name)')
                        .order('created_at', { ascending: false })
                        .limit(5),
                    supabase.from('patients').select('barangay').eq('is_admitted', true)
                ]);

                setStats({
                    activePatients: activePatientsCount || 0,
                    pendingReferrals: pendingReferralsCount || 0,
                    pastDueLabs: pastDueLabsCount || 0,
                    completedCycles: completedCyclesCount || 0,
                    totalSmsSent: smsCount || 0
                });
                setRecentActivity(activities || []);

                // Process demographics data
                if (patients) {
                    const counts: { [key: string]: number } = {};
                    patients.forEach(p => {
                        counts[p.barangay] = (counts[p.barangay] || 0) + 1;
                    });
                    const chartData = Object.entries(counts).map(([name, value]) => ({
                        name,
                        value
                    })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 barangays
                    setDemographicsData(chartData);
                }

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1">System Overview</h1>
                <p className="text-sm font-medium text-gray-500">
                    Welcome back. Here's what's happening across the municipality.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    title="Active Patients"
                    value={stats.activePatients}
                    icon={<Users size={24} />}
                    change="+0%"
                    changeType="neutral"
                    loading={loading}
                />
                <StatCard
                    title="Pending Referrals"
                    value={stats.pendingReferrals}
                    icon={<ClipboardList size={24} />}
                    change="+0"
                    changeType="neutral"
                    loading={loading}
                />
                <StatCard
                    title="Labs Pending"
                    value={stats.pastDueLabs}
                    icon={<AlertCircle size={24} />}
                    change="+0"
                    changeType="neutral"
                    loading={loading}
                />
                <StatCard
                    title="SMS Reminders"
                    value={stats.totalSmsSent}
                    icon={<MessageSquare size={24} />}
                    change="+2"
                    changeType="increase"
                    loading={loading}
                />
                <StatCard
                    title="Completed Cycles"
                    value={stats.completedCycles}
                    icon={<Activity size={24} />}
                    change="+0"
                    changeType="neutral"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Patient Distribution</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Top 5 Barangays</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                                <Loader2 className="animate-spin text-blue-500" />
                            </div>
                        ) : demographicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={demographicsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            padding: '12px'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                        {demographicsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl">
                                <Activity size={32} className="text-slate-300 mb-2" />
                                <p className="text-slate-400 font-bold text-sm">Insufficient data for chart</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8 text-center lg:text-left">Recent Activity</h3>
                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                            </div>
                        ) : recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex gap-4 group cursor-default">
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-50 group-hover:scale-125 transition-transform" />
                                    </div>
                                    <div className="flex-1 border-b border-slate-50 pb-4">
                                        <p className="text-sm font-bold text-gray-900 leading-tight">
                                            {activity.title || 'Note added'}
                                        </p>
                                        <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-tight">
                                            {activity.patient ? `${activity.patient.first_name} ${activity.patient.last_name}` : 'Unknown Patient'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-300 mt-2 flex items-center">
                                            <TrendingUp size={10} className="mr-1" />
                                            {new Date(activity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                                    <Activity size={24} />
                                </div>
                                <p className="text-sm font-bold text-slate-400">No recent activity</p>
                                <p className="text-xs text-slate-300 mt-1">Activity logs will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
