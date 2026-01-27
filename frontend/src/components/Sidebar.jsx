import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Layers,
    Calendar,
    BarChart3,
    Settings,
    LogOut
} from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
        { icon: Layers, label: 'Leads', to: '/leads' },
        { icon: Calendar, label: 'Calendar', to: '/calendar' },
        { icon: BarChart3, label: 'Analytics', to: '/analytics' },
        { icon: Settings, label: 'Settings', to: '/settings' },
    ];

    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800 shadow-xl z-50">
            {/* Logo Section */}
            <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <span className="font-bold text-lg text-white">G</span>
                </div>
                <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Gralix
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group',
                                isActive
                                    ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )
                        }
                    >
                        <item.icon size={20} className={clsx("mr-3 transition-colors", { "text-primary-400": false })} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User / Footer */}
            <div className="p-4 border-t border-slate-800">
                <button className="flex items-center w-full px-3 py-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5 group">
                    <LogOut size={20} className="mr-3 group-hover:text-red-400" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
