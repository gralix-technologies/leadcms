import React from 'react';

const StatusCard = ({ title, count, icon: Icon, color, onClick }) => {
    // Map abstract color names to Tailwind classes
    const colorStyles = {
        primary: { text: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100', icon: 'text-primary-600' },
        success: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600' },
        warning: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600' },
        danger: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: 'text-rose-600' },
        info: { text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', icon: 'text-sky-600' },
        secondary: { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-500' },
        orange: { text: 'text-secondary-500', bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-secondary-500' }
    };

    const style = colorStyles[color] || colorStyles.primary;

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer bg-white p-5 rounded-xl border ${style.border} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center text-center h-full`}
        >
            <div className={`p-3 rounded-full ${style.bg} mb-3`}>
                <Icon className={`w-6 h-6 ${style.icon}`} />
            </div>
            <h3 className={`text-2xl font-bold ${style.text} mb-1`}>{count}</h3>
            <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
    );
};

export default StatusCard;
