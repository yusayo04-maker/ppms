import { useState, useEffect } from 'react';
import { Users, UserPlus, ClipboardList, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const BHWDashboard = () => {
    const [stats, setStats] = useState({
        myPatients: 0,
        newReferrals: 0,
        pendingLabs: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentNotes, setRecentNotes] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Get current user and their assigned barangay
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Priority: Use barangay from user metadata (most reliable)
                let bhwBarangay = user.user_metadata?.barangay;

                if (!bhwBarangay) {
                    // Fallback: Fetch from profile table
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('barangay')
                        .eq('id', user.id)
                        .single();
                    bhwBarangay = profile?.barangay;
                }

                if (!bhwBarangay) return;

                // 2. Fetch counts, notes, and chart data filtered by barangay
                const [
                    { count: patientCount },
                    { count: referralCount },
                    { count: labCount },
                    { data: notes },
                    { data: referralsRaw }
                ] = await Promise.all([
                    // Only my barangay patients
                    supabase.from('patients')
                        .select('*', { count: 'exact', head: true })
                        .eq('barangay', bhwBarangay),

                    // Referrals for patients in my barangay (Pending only for stats)
                    supabase.from('referrals')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'Pending'),

                    // Laboratories for patients in my barangay
                    supabase.from('laboratories')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'Pending'),

                    // Notes for patients in my barangay
                    supabase.from('notes')
                        .select('*, pregnancy_cycles!inner(patients(*))')
                        .order('created_at', { ascending: false })
                        .limit(5),

                    // All referrals for current year (for the chart)
                    supabase.from('referrals')
                        .select('referred_at, admitted_at')
                        .gte('referred_at', `${new Date().getFullYear()}-01-01`)
                ]);

                // Process Chart Data
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthlyData = months.map(m => ({ month: m, referrals: 0 }));

                (referralsRaw || []).forEach(ref => {
                    // Use referred_at for the chart as requested
                    const dateStr = ref.referred_at || ref.admitted_at;
                    if (dateStr) {
                        const monthIdx = new Date(dateStr).getMonth();
                        monthlyData[monthIdx].referrals += 1;
                    }
                });
                setChartData(monthlyData);

                setStats({
                    myPatients: patientCount || 0,
                    newReferrals: referralCount || 0,
                    pendingLabs: labCount || 0
                });

                // Format notes to match previous structure
                const formattedNotes = (notes || []).map(n => ({
                    ...n,
                    patient: n.pregnancy_cycles?.patients
                }));
                setRecentNotes(formattedNotes);
            } catch (err) {
                console.error('Error fetching BHW dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const statCards = [
        { title: 'My Patients', value: stats.myPatients, icon: <Users size={24} />, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Pending Referrals', value: stats.newReferrals, icon: <UserPlus size={24} />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Pending Labs', value: stats.pendingLabs, icon: <ClipboardList size={24} />, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">BHW Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Welcome! Managing your assigned patients in the barangay.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-xl border p-6 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                            {loading ? (
                                <div className="h-8 w-12 bg-gray-100 animate-pulse rounded"></div>
                            ) : (
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            )}
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Monthly Referrals</h3>
                        <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                            <TrendingUp size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{new Date().getFullYear()} Trend</span>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="referrals"
                                        name="TOTAL REFERRALS"
                                        stroke="#2563eb"
                                        strokeWidth={4}
                                        dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notes</h3>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
                            </div>
                        ) : recentNotes.length > 0 ? (
                            recentNotes.map((note: any) => (
                                <div key={note.id} className="flex gap-4 border-b border-gray-50 pb-3 last:border-0">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0"></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-500 line-clamp-1">{note.content}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(note.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">No recent activity documented.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BHWDashboard;
