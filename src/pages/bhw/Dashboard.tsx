import { useState, useEffect } from 'react';
import { Users, UserPlus, ClipboardList, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BHWDashboard = () => {
    const [stats, setStats] = useState({
        myPatients: 0,
        newReferrals: 0,
        pendingLabs: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentNotes, setRecentNotes] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Get current user and their assigned barangay
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('barangay')
                    .eq('id', user.id)
                    .single();

                const bhwBarangay = profile?.barangay;
                if (!bhwBarangay) return;

                // 2. Fetch counts and notes filtered by barangay
                const [
                    { count: patientCount },
                    { count: referralCount },
                    { count: labCount },
                    { data: notes }
                ] = await Promise.all([
                    // Only my barangay patients
                    supabase.from('patients')
                        .select('*', { count: 'exact', head: true })
                        .eq('barangay', bhwBarangay),

                    // Referrals for patients in my barangay
                    supabase.from('referrals')
                        .select('*, cycle:pregnancy_cycles!inner(patient:patients!inner(barangay))', { count: 'exact', head: true })
                        .eq('status', 'Pending')
                        .eq('cycle.patient.barangay', bhwBarangay),

                    // Laboratories for patients in my barangay
                    supabase.from('laboratories')
                        .select('*, cycle:pregnancy_cycles!inner(patient:patients!inner(barangay))', { count: 'exact', head: true })
                        .eq('status', 'Pending')
                        .eq('cycle.patient.barangay', bhwBarangay),

                    // Notes for patients in my barangay
                    supabase.from('notes')
                        .select('*, cycle:pregnancy_cycles!inner(patient:patients!inner(first_name, last_name, barangay))')
                        .eq('cycle.patient.barangay', bhwBarangay)
                        .order('created_at', { ascending: false })
                        .limit(5)
                ]);

                setStats({
                    myPatients: patientCount || 0,
                    newReferrals: referralCount || 0,
                    pendingLabs: labCount || 0
                });

                // Format notes to match previous structure
                const formattedNotes = (notes || []).map(n => ({
                    ...n,
                    patient: n.cycle?.patient
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Distribution</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-gray-500 italic">Demographics visualization placeholder</p>
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
                            recentNotes.map((note) => (
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
