import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationContextType {
    unreadCount: number;
    refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshCount = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUnreadCount(0);
                return;
            }

            // Priority: Use role and barangay from user metadata (most reliable)
            let role = user.user_metadata?.role;
            let barangay = user.user_metadata?.barangay;

            if (!role || (role === 'bhw' && !barangay)) {
                // Fallback: Fetch from profiles table
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

            let query = supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('is_dismissed', false);

            if (role === 'bhw') {
                // BHWs see unread lab_overdue notifications for their barangay
                query = query.eq('barangay_target', barangay).eq('type', 'lab_overdue');
            }
            // Admins see all unread notifications

            const { count, error } = await query;
            if (!error) setUnreadCount(count || 0);
        } catch (err) {
            console.error('Error refreshing notification count:', err);
        }
    }, []);

    useEffect(() => {
        refreshCount();

        // Polling as a fallback
        const interval = setInterval(refreshCount, 30000);

        // Listen for Auth changes to refresh or clear count
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') refreshCount();
            if (event === 'SIGNED_OUT') setUnreadCount(0);
        });

        return () => {
            clearInterval(interval);
            subscription.unsubscribe();
        };
    }, [refreshCount]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
