import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

import NotificationBell from '../components/common/NotificationBell';
import UserProfile from '../components/common/UserProfile';

const DashboardLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-64 h-screen">
                {/* Header for Notifications and Profile */}
                <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
                    {/* Left side empty or Breadcrumbs */}
                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <UserProfile />
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto scroll-smooth">
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
