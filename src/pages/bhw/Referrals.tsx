import { useState, useEffect, useCallback } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useReactTable,
    type SortingState,
} from '@tanstack/react-table';
import { supabase } from '../../lib/supabase';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Loader2, AlertCircle } from 'lucide-react';

interface ReferralRecord {
    id: string;
    cycle_id: string;
    status: string;
    referred_at: string;
    pregnancy_cycle: {
        patient: {
            first_name: string;
            last_name: string;
            age: number;
        };
    };
}

const columnHelper = createColumnHelper<ReferralRecord>();

const columns = [
    columnHelper.accessor(row => {
        const p = row.pregnancy_cycle?.patient;
        return p ? `${p.first_name} ${p.last_name}` : 'N/A';
    }, {
        id: 'patientName',
        header: ({ column }) => (
            <button
                className="flex items-center space-x-1 hover:text-gray-700 font-medium text-xs uppercase tracking-wider"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                <span>Patient Name</span>
                {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
            </button>
        ),
        cell: info => <div className="font-medium text-gray-900">{info.getValue()}</div>,
    }),
    columnHelper.accessor(row => row.pregnancy_cycle?.patient?.age, {
        id: 'age',
        header: 'Age',
        cell: info => <div className="text-gray-500">{info.getValue()} yrs</div>,
    }),
    columnHelper.accessor('referred_at', {
        header: 'Date Referred',
        cell: info => {
            const date = new Date(info.getValue());
            return (
                <div className="flex items-center text-gray-500">
                    <Calendar size={16} className="mr-1" />
                    {date.toLocaleDateString()}
                </div>
            );
        },
    }),
    columnHelper.accessor('status', {
        header: 'Status',
        cell: info => {
            const status = info.getValue();
            return (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                    }`}>
                    {status}
                </span>
            );
        }
    }),
];

const BHWReferrals = () => {
    const [data, setData] = useState<ReferralRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [bhwBarangay, setBhwBarangay] = useState<string | null>(null);

    // Fetch BHW's barangay on component mount
    useEffect(() => {
        const fetchBHWProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Priority: Use barangay from user metadata (most reliable)
                const metadataBarangay = user.user_metadata?.barangay;

                if (metadataBarangay) {
                    setBhwBarangay(metadataBarangay);
                } else {
                    // Fallback: Fetch from profiles table
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('barangay')
                        .eq('id', user.id)
                        .single();

                    if (error) {
                        console.error('Error fetching BHW profile:', error);
                    } else if (profile) {
                        setBhwBarangay(profile.barangay);
                    }
                }
            }
        };
        fetchBHWProfile();
    }, []);

    const fetchReferrals = useCallback(async () => {
        if (!bhwBarangay) return;

        setLoading(true);
        try {
            const { data: referrals, error } = await supabase
                .from('referrals')
                .select(`
                    *,
                    pregnancy_cycle:pregnancy_cycles!inner(
                        patient:patients!inner(first_name, last_name, age, barangay)
                    )
                `)
                .eq('pregnancy_cycle.patient.barangay', bhwBarangay)
                .order('referred_at', { ascending: false });

            if (error) throw error;
            setData(referrals as any || []);
        } catch (err) {
            console.error('Error fetching referrals:', err);
        } finally {
            setLoading(false);
        }
    }, [bhwBarangay]);

    useEffect(() => {
        fetchReferrals();
    }, [fetchReferrals]);

    const table = useReactTable({
        data,
        columns,
        state: {
            globalFilter,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Referrals</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Patients referred to the Municipal Health Office for admission.
                    </p>
                </div>
                <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        placeholder="Search referrals..."
                    />
                </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading your referrals...</p>
                    </div>
                ) : (
                    <>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {table.getRowModel().rows.length === 0 && (
                            <div className="text-center py-12">
                                <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No referrals found</h3>
                                <p className="mt-1 text-sm text-gray-500">You haven't referred any patients yet.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default BHWReferrals;
