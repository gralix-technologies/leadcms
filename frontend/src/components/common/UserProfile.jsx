import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, ChevronDown, Bell } from 'lucide-react';
import { authService, notificationService } from '../../services/api';

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await authService.getCurrentUser();
                setUser(res.data.user);
            } catch (error) {
                console.error("Failed to fetch user", error);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm shadow-sm ring-2 ring-white">
                    {user.avatar || user.name.charAt(0)}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-slate-700 leading-none">{user.name}</p>
                    <p className="text-xs text-slate-500 mt-1 capitalize">{user.division || user.role}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={16} />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
