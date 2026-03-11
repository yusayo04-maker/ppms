import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Lock,
    Mail,
    ArrowRight,
    Loader2,
    AlertCircle,
    ShieldCheck,
    Stethoscope,
    CheckCircle2
} from 'lucide-react';

const Login = () => {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is already logged in
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                let role = session.user.user_metadata?.role;

                // Fallback to database if metadata is missing
                if (!role) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    role = profile?.role;
                }

                if (role === 'mho_admin') navigate('/admin');
                else if (role === 'bhw') navigate('/bhw');
            }
        };
        checkUser();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // If input has @, treat as email (admin). Otherwise, treat as BHW username
            const email = loginId.includes('@') ? loginId : `${loginId}@bhw.ppms.gov.ph`;

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (data.user) {
                let role = data.user.user_metadata?.role;

                // Fallback to database if metadata is missing (common for manually created users)
                if (!role) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();
                    role = profile?.role;
                }

                if (role === 'mho_admin') {
                    navigate('/admin');
                } else if (role === 'bhw') {
                    navigate('/bhw');
                } else {
                    // Fallback or error if role is missing
                    setError('Unauthorized: Application role not assigned. Please contact administrator.');
                    await supabase.auth.signOut();
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setError(null);

        try {
            // Check if it's a BHW username (doesn't contain @ or ends with @bhw.ppms.gov.ph)
            const isBHW = !forgotEmail.includes('@') || forgotEmail.endsWith('@bhw.ppms.gov.ph');

            if (isBHW) {
                setError('Barangay Health Workers (BHW) cannot reset passwords via email. Please contact your MHO Administrator to have your password manually updated.');
                setForgotLoading(false);
                return;
            }

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) throw resetError;

            setForgotSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10 border border-slate-100">
                {/* Left Side: Illustration & Branding */}
                <div className="w-full md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-blue-500 rounded-full opacity-30" />
                    <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-blue-400 rounded-full opacity-20" />

                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-8">
                            <img src="/logo.png" alt="Valladolid Logo" className="h-12 w-12 object-contain bg-white p-1.5 rounded-xl shadow-lg border border-white/20" />
                            <span className="text-xl font-black tracking-tighter uppercase italic">PPMS Valladolid</span>
                        </div>

                        <h1 className="text-4xl font-black leading-[1.1] mb-6 tracking-tight">
                            Nurturing Generations, <br />
                            <span className="text-blue-200 uppercase tracking-widest text-lg font-black block mt-2 opacity-80">One Mother at a Time</span>
                        </h1>
                        <p className="text-blue-100 text-lg opacity-90 leading-relaxed font-medium">
                            The Prenatal Patient Management System for Valladolid Municipal Health Office and our dedicated Barangay Health Workers.
                        </p>
                    </div>

                    <div className="mt-12 space-y-4 relative z-10">
                        <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <ShieldCheck className="text-blue-200 shrink-0" size={24} />
                            <p className="text-sm font-medium">Secure Role-Based Access Control</p>
                        </div>
                        <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <Stethoscope className="text-blue-200 shrink-0" size={24} />
                            <p className="text-sm font-medium">Unified Prenatal Care Monitoring</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-12 relative z-10">
                        <p className="text-xs text-blue-200 font-bold tracking-widest uppercase opacity-60">
                            © 2026 Municipality of Valladolid
                        </p>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="w-full md:w-1/2 p-12 lg:p-16">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Please enter your credentials to continue</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start space-x-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2 group">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                Username or Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                                    placeholder="username or email"
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex items-center justify-between ml-1 pr-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest transition-colors group-focus-within:text-blue-600">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setShowForgotModal(true); setError(null); setForgotSuccess(false); setForgotEmail(''); }}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !loginId || !password}
                            className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                            Authorized Access Only
                        </p>
                    </div>
                </div>
            </div>

            {/* Background Medical Icons Pattern (Subtle) */}
            <div className="fixed inset-0 z-[-1] opacity-[0.03] select-none pointer-events-none">
                <div className="grid grid-cols-6 gap-20 p-20 transform -rotate-12">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <Stethoscope key={i} size={64} />
                    ))}
                </div>
            </div>
            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center">
                                <ShieldCheck className="mr-2" size={20} />
                                Password Recovery
                            </h3>
                            <button
                                onClick={() => setShowForgotModal(false)}
                                className="hover:bg-blue-700 p-1 rounded-full transition-colors"
                            >
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            {forgotSuccess ? (
                                <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto border-4 border-green-50">
                                        <CheckCircle2 className="text-green-600" size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900">Email Sent!</h4>
                                    <p className="text-slate-500 text-sm">
                                        We've sent a password reset link to <strong className="text-slate-900">{forgotEmail}</strong>.
                                        Please check your inbox and follow the instructions.
                                    </p>
                                    <button
                                        onClick={() => setShowForgotModal(false)}
                                        className="w-full bg-slate-100 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all mt-4"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-6">
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-500 font-medium">
                                            Enter your email address below to receive a password reset link.
                                        </p>

                                        {/* Notice for BHW */}
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                            <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest leading-relaxed">
                                                Notice for BHW Accounts:
                                            </p>
                                            <p className="text-xs text-amber-800 font-medium mt-1">
                                                Please contact your MHO Administrator to reset your password manually.
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-2 text-red-700">
                                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                <p className="text-xs font-bold">{error}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2 group">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-600">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                                    <Mail size={16} />
                                                </div>
                                                <input
                                                    type="email"
                                                    required
                                                    className="block w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
                                                    placeholder="admin@example.com"
                                                    value={forgotEmail}
                                                    onChange={(e) => setForgotEmail(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotLoading || !forgotEmail}
                                        className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:bg-slate-300 disabled:shadow-none"
                                    >
                                        {forgotLoading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                <span>Send Reset Link</span>
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
