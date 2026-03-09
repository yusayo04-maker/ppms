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
import { supabase, setSkipAuthChange } from '../../lib/supabase';
import {
    User,
    Shield,
    MapPin,
    Mail,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    UserPlus,
    MoreVertical,
    X,
    Save,
    Key,
    UserCircle,
    Edit,
    Trash2,
    AlertTriangle,
    Loader2
} from 'lucide-react';

import { VALLADOLID_BARANGAYS as BARANGAYS } from '../../lib/constants';

interface Profile {
    id: string;
    full_name: string;
    role: 'mho_admin' | 'bhw';
    barangay?: string;
    status: 'Active' | 'Inactive';
    email?: string;
    username?: string;
}

const columnHelper = createColumnHelper<Profile>();

const UserManagement = () => {
    const [data, setData] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

    // Form states
    const [newUser, setNewUser] = useState<any>({
        role: 'bhw',
        status: 'Active',
        barangay: BARANGAYS[0],
    });
    const [editingUser, setEditingUser] = useState<Partial<Profile>>({});
    const [resetPassword, setResetPassword] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;
            setData(profiles || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const columns = [
        columnHelper.accessor('full_name', {
            header: ({ column }) => (
                <button
                    className="flex items-center space-x-1 hover:text-gray-700 font-medium text-xs uppercase tracking-wider"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    <span>Name</span>
                    {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
                </button>
            ),
            cell: info => (
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                        {(info.getValue() || '?').charAt(0)}
                    </div>
                    <div className="font-medium text-gray-900">{info.getValue() || 'Unnamed User'}</div>
                </div>
            ),
        }),
        columnHelper.accessor(row => row.email || row.username || 'No identifier', {
            id: 'identifier',
            header: 'Email / Username',
            cell: info => {
                const user = info.row.original;
                return (
                    <div className="flex items-center text-gray-500">
                        {user.role === 'mho_admin' ? <Mail size={14} className="mr-2" /> : <UserCircle size={14} className="mr-2" />}
                        {info.getValue()}
                    </div>
                );
            },
        }),
        columnHelper.accessor('role', {
            header: ({ column }) => (
                <button
                    className="flex items-center space-x-1 hover:text-gray-700 font-medium text-xs uppercase tracking-wider"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    <span>Role</span>
                    {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
                </button>
            ),
            cell: info => {
                const role = info.getValue();
                return (
                    <div className="flex items-center space-x-2">
                        <Shield size={14} className={role === 'mho_admin' ? 'text-purple-500' : 'text-blue-500'} />
                        <span className="capitalize">{role.replace('_', ' ')}</span>
                    </div>
                );
            },
        }),
        columnHelper.accessor('barangay', {
            header: ({ column }) => (
                <button
                    className="flex items-center space-x-1 hover:text-gray-700 font-medium text-xs uppercase tracking-wider"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    <span>Barangay</span>
                    {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
                </button>
            ),
            cell: info => (
                <div className="flex items-center text-gray-500">
                    <MapPin size={14} className="mr-2" />
                    {info.getValue() || <span className="text-gray-300 italic">MHO Central</span>}
                </div>
            ),
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue() || 'Active';
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {status}
                    </span>
                );
            },
        }),
        columnHelper.display({
            id: 'actions',
            cell: (info) => (
                <div className="relative">
                    <button
                        onClick={() => setShowActionMenu(showActionMenu === info.row.id ? null : info.row.id)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
                    >
                        <MoreVertical size={20} />
                    </button>
                    {showActionMenu === info.row.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                <button
                                    onClick={() => {
                                        setEditingUser({ ...info.row.original });
                                        setShowEditModal(true);
                                        setShowActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    role="menuitem"
                                >
                                    <Edit size={14} className="mr-2" /> Edit Details
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedUser(info.row.original);
                                        if (info.row.original.role === 'bhw') {
                                            setShowResetModal(true);
                                        } else {
                                            if (window.confirm(`Send password reset link to ${info.row.original.email}?`)) {
                                                handleResetAdminPassword(info.row.original.id);
                                            }
                                        }
                                        setShowActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    role="menuitem"
                                >
                                    <Key size={14} className="mr-2" /> Reset Password
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={() => {
                                        setSelectedUser(info.row.original);
                                        setShowDeleteModal(true);
                                        setShowActionMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                    role="menuitem"
                                >
                                    <Trash2 size={14} className="mr-2" /> Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ),
        }),
    ];

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

    const handleCreateAccount = async () => {
        setLoading(true);
        try {
            // Generate a valid email for Supabase Auth (BHWs log in with username only)
            const email = newUser.role === 'mho_admin' ? newUser.email : `${newUser.username}@bhw.ppms.gov.ph`;

            // Pause auth listener so ProtectedRoute doesn't redirect during signUp
            setSkipAuthChange(true);

            // Save admin's current session before signUp (signUp auto-signs-in the new user)
            const { data: { session: adminSession } } = await supabase.auth.getSession();

            const { error: authError } = await supabase.auth.signUp({
                email,
                password: newUser.password,
                options: {
                    data: {
                        full_name: newUser.name,
                        role: newUser.role,
                        barangay: newUser.barangay,
                        email: newUser.role === 'mho_admin' ? newUser.email : undefined,
                        username: newUser.role === 'bhw' ? newUser.username : undefined
                    }
                }
            });

            if (authError) throw authError;

            // Restore the admin's session so we don't get kicked out
            if (adminSession) {
                await supabase.auth.setSession({
                    access_token: adminSession.access_token,
                    refresh_token: adminSession.refresh_token,
                });
            }

            // Resume auth listener
            setSkipAuthChange(false);

            // Profile table will be updated via trigger
            setShowCreateModal(false);
            setNewUser({ role: 'bhw', status: 'Active', barangay: BARANGAYS[0] });
            alert("Account created successfully. The user can now log in.");
            await fetchUsers();
        } catch (err: any) {
            console.error('Account creation error:', err);
            alert(`Failed to create account: ${err.message}`);
        } finally {
            setSkipAuthChange(false);
            setLoading(false);
        }
    };

    const handleEditAccount = async () => {
        if (!editingUser.id) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editingUser.full_name,
                    barangay: editingUser.barangay,
                    status: editingUser.status
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setShowEditModal(false);
            setEditingUser({});
            await fetchUsers();
        } catch (err: any) {
            console.error('Account update error:', err);
            alert(`Failed to update account: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!selectedUser) return;
        setLoading(true);
        try {
            // Call the SECURITY DEFINER function to delete from auth.users (which cascades to profiles)
            const { error } = await supabase.rpc('delete_user', { user_id: selectedUser.id });

            if (error) throw error;

            setShowDeleteModal(false);
            setSelectedUser(null);
            await fetchUsers();
            alert("Account successfully deleted.");
        } catch (err: any) {
            console.error('Account deletion error:', err);
            alert(`Failed to delete profile: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleResetAdminPassword = async (userId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: { action: 'reset-password-mho', userId }
            });

            if (error || data.error) throw error || new Error(data.error);

            alert("Password reset email sent successfully.");
        } catch (err: any) {
            console.error('Password reset error:', err);
            alert(`Failed to send reset email: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmResetBHW = async () => {
        if (!selectedUser || !resetPassword) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'reset-password-bhw',
                    userId: selectedUser.id,
                    newPassword: resetPassword
                }
            });

            if (error || data.error) throw error || new Error(data.error);

            setShowResetModal(false);
            setResetPassword('');
            setSelectedUser(null);
            alert("Password updated successfully.");
        } catch (err: any) {
            console.error('Password reset error:', err);
            alert(`Failed to update password: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage BHO health workers and administrative staff accounts.
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Search users..."
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm shrink-0"
                    >
                        <UserPlus size={18} className="mr-2" />
                        Create Account
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl min-h-[400px]">
                {loading && data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                        <p className="text-gray-500 font-medium">Loading users...</p>
                    </div>
                ) : (
                    <>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
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
                                <User className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
                                <p className="mt-1 text-sm text-gray-500">Try adjusting your search query.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Account Modal */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center">
                                <UserPlus className="mr-2" />
                                Create New Account
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Role</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any, barangay: e.target.value === 'bhw' ? BARANGAYS[0] : undefined })}
                                >
                                    <option value="bhw">Barangay Health Worker (BHW)</option>
                                    <option value="mho_admin">MHO Administrator</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter full name"
                                    value={newUser.name || ''}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>

                            {newUser.role === 'mho_admin' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="admin@valladolid.gov.ph"
                                        value={newUser.email || ''}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Email is required for password recovery for admin roles.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter username"
                                            value={newUser.username || ''}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Barangay</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            value={newUser.barangay}
                                            onChange={(e) => setNewUser({ ...newUser, barangay: e.target.value })}
                                        >
                                            {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter initial password"
                                    value={newUser.password || ''}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleCreateAccount}
                                    disabled={loading}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                    Create Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Account Modal */}
            {showEditModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowEditModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center">
                                <Edit className="mr-2" />
                                Edit Account Details
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Role</label>
                                <select
                                    disabled
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    value={editingUser.role}
                                >
                                    <option value="bhw">Barangay Health Worker (BHW)</option>
                                    <option value="mho_admin">MHO Administrator</option>
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 italic">Role cannot be changed after creation.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter full name"
                                    value={editingUser.full_name || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                />
                            </div>

                            {editingUser.role === 'mho_admin' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        disabled
                                        type="email"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                                        value={editingUser.email || ''}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                        <input
                                            disabled
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                                            value={editingUser.username || ''}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Barangay</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            value={editingUser.barangay}
                                            onChange={(e) => setEditingUser({ ...editingUser, barangay: e.target.value })}
                                        >
                                            {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    value={editingUser.status}
                                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="pt-4 space-x-3 flex">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditAccount}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8 text-center">
                            <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Are you sure you want to delete the account for <strong className="text-gray-900">{selectedUser.full_name}</strong>? This will remove their record from the management list.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={loading}
                                    className="w-full py-3 bg-red-600 text-white rounded-lg font-black hover:bg-red-700 transition-all shadow-md uppercase tracking-wider text-xs flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                                    Yes, Delete Account
                                </button>
                                <button
                                    onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                                    className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-black hover:bg-gray-200 transition-all uppercase tracking-wider text-xs"
                                >
                                    Keep Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal (BHW Only) */}
            {showResetModal && selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => { setShowResetModal(false); setSelectedUser(null); setResetPassword(''); }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-sm:w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center">
                                <Key className="mr-2" />
                                Reset Password
                            </h3>
                            <button onClick={() => { setShowResetModal(false); setSelectedUser(null); setResetPassword(''); }} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <p className="text-sm text-gray-500">
                                Enter a new password for <strong className="text-gray-900">{selectedUser.full_name}</strong>.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter new password"
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={handleConfirmResetBHW}
                                    disabled={loading || !resetPassword}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
