import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { leadService } from '../services/api';

const COLORS = ['#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981', '#f43f5e', '#64748b'];

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeDivision, setActiveDivision] = useState('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await leadService.getAnalytics(activeDivision);
            setData(response.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    }, [activeDivision]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Re-fetch when tab regains focus (catches lead changes made on other pages)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [fetchData]);

    const divisions = [
        { id: 'all', label: 'Overview' },
        { id: 'tech', label: 'Technologies' },
        { id: 'actuarial', label: 'Actuarial' },
        { id: 'capital', label: 'Capital' }
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
    );

    if (!data) return <div>Error loading data</div>;

    // Transform data for charts
    const statusData = Object.entries(data.status_counts || {}).map(([name, value]) => ({ name, value }));
    const divisionData = Object.entries(data.division_performance || {}).map(([name, data]) => ({ name, value: data.revenue }));

    return (
        <div className="space-y-6">
            <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
                    <p className="text-slate-500 mt-2">Deep dive into your sales performance.</p>
                </div>

                {/* Division Tabs */}
                <div className="bg-slate-100 p-1 rounded-xl inline-flex">
                    {divisions.map(div => (
                        <button
                            key={div.id}
                            onClick={() => setActiveDivision(div.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeDivision === div.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {div.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 text-sm font-medium">Weighted Pipeline</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">ZMW {Number(data.weighted_pipeline).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 text-sm font-medium">Lost Revenue</h3>
                    <p className="text-3xl font-bold text-red-500 mt-2">ZMW {Number(data.lost_value).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-slate-500 text-sm font-medium">Conversion Rate</h3>
                    <p className="text-3xl font-bold text-emerald-500 mt-2">{Number(data.conversion_rate).toFixed(1)}%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Bar Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-96">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Leads by Status</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={statusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Division Pie Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-96">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Revenue by Division</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={divisionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {divisionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 text-sm text-slate-500 mt-2">
                        {divisionData.map((entry, index) => (
                            <div key={index} className="flex items-center">
                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Performers Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Top Performers</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-400 text-sm">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Leads Assigned</th>
                                <th className="pb-3 font-medium">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(data.top_performers || []).map((person) => (
                                <tr key={person.id}>
                                    <td className="py-3 text-slate-900 font-medium">{person.name}</td>
                                    <td className="py-3 text-slate-500">{person.leads_count}</td>
                                    <td className="py-3 text-emerald-600 font-medium">ZMW {Number(person.total_value).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
