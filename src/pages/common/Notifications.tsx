import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VALLADOLID_BARANGAYS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import {
    Bell,
    User,
    MapPin,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    Filter,
    Loader2,
} from 'lucide-react';

interface Notification {
    id: string;
    patient_id: string;
    type: 'lab_overdue' | 'referral' | 'system';
    title: string;
    content: string;
    barangay_target: string;
    is_dismissed: boolean;
    created_at: string;
    patient?: {
        first_name: string;
        last_name: string;
    };
}

import { useNotification } from '../../contexts/NotificationContext';

const Notifications = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshCount } = useNotification();

    // Portal and User Context
    const portal = location.pathname.startsWith('/admin') ? 'admin' : 'bhw';
    const [userContext, setUserContext] = useState<{ role: string; barangay?: string } | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterType, setFilterType] = useState<string>('all');
    const [filterBarangay, setFilterBarangay] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const fetchUserAndNotifications = useCallback(async () => {
        setLoading(true);
        try {
            // Get current user session
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Priority: Use role and barangay from user metadata (most reliable)
            let role = user.user_metadata?.role;
            let barangay = user.user_metadata?.barangay;

            if (!role || (role === 'bhw' && !barangay)) {
                // Fallback: Fetch from profile table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, barangay')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    role = role || profile.role;
                    barangay = barangay || profile.barangay;
                }
            }

            if (!role) return;

            setUserContext({ role, barangay: barangay || undefined });

            // Sync overdue labs before fetching notifications
            await supabase.rpc('generate_overdue_lab_notifications');

            // Set initial filters based on role
            if (role === 'bhw') {
                setFilterType('lab_overdue');
                setFilterBarangay(barangay || 'all');
            }

            // Fetch notifications
            let query = supabase
                .from('notifications')
                .select('*, patient:patients(first_name, last_name)')
                .eq('is_dismissed', false)
                .order('created_at', { ascending: false });

            if (role === 'bhw') {
                // BHWs see lab_overdue for their barangay
                query = query.eq('barangay_target', barangay).eq('type', 'lab_overdue');
            }

            const { data, error } = await query;
            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserAndNotifications();
    }, [fetchUserAndNotifications]);

    const handleDismiss = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_dismissed: true })
                .eq('id', id);

            if (error) throw error;

            // Immediately update global unread count
            refreshCount();

            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Error dismissing notification:', err);
        }
    };

    const handleNavigateToPatient = (patientId: string) => {
        if (!patientId) return;
        navigate(`/${portal}/patients/${patientId}`);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'lab_overdue': return <Clock className="text-red-500" size={20} />;
            case 'referral': return <CheckCircle2 className="text-blue-500" size={20} />;
            default: return <Bell className="text-gray-500" size={20} />;
        }
    };

    const filteredNotifications = notifications.filter(notif => {
        const matchesType = filterType === 'all' || notif.type === filterType;
        const matchesBarangay = filterBarangay === 'all' || notif.barangay_target === filterBarangay;
        return matchesType && matchesBarangay;
    });

    if (!userContext) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between relative">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Notifications</h1>
                    <p className="text-gray-500 mt-1">
                        {userContext.role === 'bhw'
                            ? `Overdue lab alerts for ${userContext.barangay} Barangay.`
                            : 'Manage alerts and follow-ups across all barangays.'}
                    </p>
                </div>

                {userContext.role === 'mho_admin' && (
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all ${isFilterOpen || filterType !== 'all' || filterBarangay !== 'all'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                                : 'bg-white hover:bg-gray-50 text-gray-600 font-medium'
                                }`}
                        >
                            <Filter size={18} />
                            <span>Filter {(filterType !== 'all' || filterBarangay !== 'all') && '•'}</span>
                        </button>

                        {isFilterOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsFilterOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-20 p-4 space-y-4">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2">Type</label>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="lab_overdue">Lab Overdue</option>
                                            <option value="referral">Referrals</option>
                                            <option value="system">System</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2">Barangay</label>
                                        <select
                                            value={filterBarangay}
                                            onChange={(e) => setFilterBarangay(e.target.value)}
                                            className="w-full text-sm border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="all">All Barangays</option>
                                            {VALLADOLID_BARANGAYS.map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2 border-t">
                                        <button
                                            onClick={() => {
                                                setFilterType('all');
                                                setFilterBarangay('all');
                                                setIsFilterOpen(false);
                                            }}
                                            className="w-full text-xs font-bold text-red-500 hover:text-red-600 text-center py-1"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>


            <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Bell className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No matching notifications</h3>
                        <p>Try adjusting your filters or clearing them to see all alerts.</p>
                        <button
                            onClick={() => {
                                setFilterType('all');
                                if (userContext.role === 'mho_admin') setFilterBarangay('all');
                            }}
                            className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredNotifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNavigateToPatient(notif.patient_id)}
                                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group relative"
                            >
                                <div className="flex items-start space-x-4">
                                    <div className="mt-1">
                                        {getTypeIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {notif.title}
                                            </h3>
                                            <span className="text-sm text-gray-400 font-medium">
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed">
                                            {notif.content}
                                        </p>
                                        <div className="flex items-center space-x-4 pt-2 text-sm">
                                            <div className="flex items-center text-gray-500">
                                                <User size={14} className="mr-1.5" />
                                                <span className="font-medium">{notif.patient ? `${notif.patient.first_name} ${notif.patient.last_name}` : 'System Alert'}</span>
                                            </div>
                                            <div className="flex items-center text-gray-500">
                                                <MapPin size={14} className="mr-1.5" />
                                                <span>{notif.barangay_target}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={(e) => handleDismiss(e, notif.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Dismiss"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                        <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {filteredNotifications.length > 0 && (
                <p className="text-center text-sm text-gray-400">
                    Showing {filteredNotifications.length} active notification{filteredNotifications.length > 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
};

export default Notifications;
