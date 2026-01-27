import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, MessageSquare, UserPlus, Info } from 'lucide-react';
import { notificationService } from '../../services/api';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const response = await notificationService.getAll();
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id));
            await notificationService.markRead(id);
        } catch (error) {
            console.error("Failed to mark as read", error);
            fetchNotifications(); // Revert on error
        }
    };

    const markAllRead = async () => {
        try {
            setNotifications([]);
            await notificationService.markAllRead();
        } catch (error) {
            fetchNotifications();
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'followup': return <Clock size={16} className="text-amber-500" />;
            case 'activity': return <MessageSquare size={16} className="text-blue-500" />;
            case 'assignment': return <UserPlus size={16} className="text-emerald-500" />;
            default: return <Info size={16} className="text-slate-400" />;
        }
    };

    const formatTime = (isoString) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.round(diffMs / 60000);

            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-slate-100 relative transition-colors text-slate-500 hover:text-slate-700"
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                <Bell size={24} className="mx-auto mb-2 opacity-20" />
                                <p>No new notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className="p-4 hover:bg-slate-50 transition-colors relative group cursor-default"
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex-shrink-0">
                                                {getIcon(notification.notification_type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-800 leading-snug">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => markAsRead(notification.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-full transition-opacity self-start text-slate-400 hover:text-primary-600"
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
