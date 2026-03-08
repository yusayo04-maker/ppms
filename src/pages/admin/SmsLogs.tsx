import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MessageSquare,
    Search,
    Filter,
    Calendar,
    Phone,
    CheckCircle2,
    XCircle,
    User
} from 'lucide-react';

interface SmsLog {
    id: string;
    patient_id: string;
    contact_no: string;
    message_text: string;
    message_type: 'maternal_checkup' | 'lab_test';
    status: 'success' | 'failed';
    error_message: string | null;
    created_at: string;
    patient?: {
        first_name: string;
        last_name: string;
    }
}

const SmsLogs = () => {
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sms_logs')
                .select(`
                    *,
                    patient:patients(first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.patient?.first_name + ' ' + log.patient?.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.contact_no.includes(searchTerm) ||
            log.message_text.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterType === 'all' || log.message_type === filterType;

        return matchesSearch && matchesFilter;
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">SMS Notification Logs</h1>
                    <p className="text-gray-500 font-medium tracking-wide">Monitor automated reminders sent to patients</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 text-blue-600 mb-4">
                        <MessageSquare size={20} className="stroke-[2.5]" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Total Sent</span>
                    </div>
                    <p className="text-4xl font-black tracking-tighter text-gray-900">{logs.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 text-green-600 mb-4">
                        <CheckCircle2 size={20} className="stroke-[2.5]" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Success Rate</span>
                    </div>
                    <p className="text-4xl font-black tracking-tighter text-gray-900">
                        {logs.length > 0 ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100) : 0}%
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search logs by patient or message..."
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-slate-600 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType('maternal_checkup')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'maternal_checkup' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Checkups
                            </button>
                            <button
                                onClick={() => setFilterType('lab_test')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'lab_test' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Lab Tests
                            </button>
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-95"
                        >
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Patient</th>
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Contact Number</th>
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Message Type</th>
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Status</th>
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Date Sent</th>
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Message Content</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(6).fill(0).map((_, j) => (
                                            <td key={j} className="px-8 py-6">
                                                <div className="h-4 bg-slate-100 rounded-full w-24"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 group-hover:scale-110 transition-transform shadow-sm">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 leading-tight">
                                                        {log.patient ? `${log.patient.first_name} ${log.patient.last_name}` : 'Unknown Patient'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center text-slate-600 font-medium">
                                                <Phone className="mr-2 text-slate-300" size={14} />
                                                {log.contact_no}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.message_type === 'maternal_checkup'
                                                    ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                {log.message_type === 'maternal_checkup' ? 'Checkup' : 'Lab Test'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center">
                                                {log.status === 'success' ? (
                                                    <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 text-[10px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 size={12} className="mr-1.5" />
                                                        Sent
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 text-[10px] font-black uppercase tracking-widest group/error relative cursor-help">
                                                        <XCircle size={12} className="mr-1.5" />
                                                        Failed
                                                        {log.error_message && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/error:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl pointer-events-none">
                                                                {log.error_message}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center text-slate-500 text-sm font-medium">
                                                <Calendar className="mr-2 text-slate-300" size={14} />
                                                {formatDate(log.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-600 text-xs font-medium italic max-w-xs truncate" title={log.message_text}>
                                                "{log.message_text}"
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                                <MessageSquare size={32} />
                                            </div>
                                            <p className="text-slate-400 font-bold">No SMS logs found</p>
                                            <p className="text-slate-300 text-sm">Try adjusting your search or filter</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SmsLogs;
