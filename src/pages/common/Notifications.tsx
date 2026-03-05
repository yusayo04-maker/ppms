import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Bell,
    User,
    MapPin,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    Filter
} from 'lucide-react';

interface Notification {
    id: string;
    patientId: string;
    patientName: string;
    type: 'lab_overdue' | 'referral' | 'system';
    title: string;
    content: string;
    barangay: string;
    date: string;
    isDismissed: boolean;
}

// Mock data for initial UI implementation
const initialNotifications: Notification[] = [
    {
        id: 'notif-1',
        patientId: 'pat-101',
        patientName: 'Lourdes Garcia',
        type: 'lab_overdue',
        title: 'Laboratory Result Overdue',
        content: 'OGTT (Glucose Test) result was due on April 15, 2026. Please follow up with the patient.',
        barangay: 'Poblacion',
        date: '2026-04-16T09:00:00Z',
        isDismissed: false
    },
    {
        id: 'notif-2',
        patientId: 'pat-102',
        patientName: 'Rosa Mendoza',
        type: 'lab_overdue',
        title: 'Laboratory Result Overdue',
        content: 'Standard Prenatal Lab Panel result is overdue. Last checked: March 10, 2026.',
        barangay: 'Bayabas',
        date: '2026-03-11T10:30:00Z',
        isDismissed: false
    }
];

const Notifications = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const portal = location.pathname.startsWith('/admin') ? 'admin' : 'bhw';

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const handleNavigateToPatient = (patientId: string) => {
        navigate(`/${portal}/patients/${patientId}`);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'lab_overdue': return <Clock className="text-red-500" size={20} />;
            case 'referral': return <CheckCircle2 className="text-blue-500" size={20} />;
            default: return <Bell className="text-gray-500" size={20} />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Notifications</h1>
                    <p className="text-gray-500 mt-1">Manage alerts and follow-ups for patients.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                        <Filter size={18} />
                        <span className="font-medium">Filter</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Bell className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
                        <p className="text-gray-500">You have no new notifications.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNavigateToPatient(notif.patientId)}
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
                                                {new Date(notif.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed">
                                            {notif.content}
                                        </p>
                                        <div className="flex items-center space-x-4 pt-2 text-sm">
                                            <div className="flex items-center text-gray-500">
                                                <User size={14} className="mr-1.5" />
                                                <span className="font-medium">{notif.patientName}</span>
                                            </div>
                                            <div className="flex items-center text-gray-500">
                                                <MapPin size={14} className="mr-1.5" />
                                                <span>{notif.barangay}</span>
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

            {notifications.length > 0 && (
                <p className="text-center text-sm text-gray-400">
                    Showing {notifications.length} active notification{notifications.length > 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
};

export default Notifications;
