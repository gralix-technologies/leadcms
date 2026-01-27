import React, { useEffect, useState } from 'react';
import {
    ArrowUpRight, DollarSign, Users, Activity, BarChart3,
    Flame, CheckCircle, Phone, FileText, MessageSquare, Award, XCircle, UserMinus, Star
} from 'lucide-react';
import StatusCard from '../components/dashboard/StatusCard';
import LeadListModal from '../components/dashboard/LeadListModal';
import { leadService } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, subtext, icon: Icon, trend }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-50 rounded-lg">
                <Icon className="w-6 h-6 text-primary-600" />
            </div>
            {trend && <span className="text-sm font-medium text-emerald-600">{trend}</span>}
        </div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
);

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    // Quick View Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [filteredLeads, setFilteredLeads] = useState([]);

    const fetchData = async () => {
        try {
            const [analyticsRes, leadsRes] = await Promise.all([
                leadService.getAnalytics(),
                leadService.getLeads()
            ]);
            setData(analyticsRes.data);
            setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCardClick = (type, title) => {
        let results = [];
        switch (type) {
            case 'hot': results = leads.filter(l => l.status === 'hot'); break;
            case 'qualified': results = leads.filter(l => l.status === 'qualified'); break;
            case 'contacted': results = leads.filter(l => l.status === 'contacted'); break;
            case 'proposal': results = leads.filter(l => l.status === 'proposal'); break;
            case 'negotiation': results = leads.filter(l => l.status === 'negotiation'); break;
            case 'won': results = leads.filter(l => l.status === 'won'); break;
            case 'lost': results = leads.filter(l => l.status === 'lost'); break;
            case 'unassigned': results = leads.filter(l => !l.assigned_to); break;
            case 'priority': results = leads.filter(l => l.priority === 'high'); break;
            default: results = leads;
        }
        setFilteredLeads(results);
        setModalTitle(title);
        setModalTitle(title);
        setModalOpen(true);
    };

    const handleFilterClick = (filterType, value, title) => {
        let results = [];
        if (filterType === 'division') {
            results = leads.filter(l => l.division === value);
        } else if (filterType === 'personnel') {
            // Filter by assigned_to ID
            results = leads.filter(l => l.assigned_to === value);
        }
        setFilteredLeads(results);
        setModalTitle(title);
        setModalOpen(true);
    };

    // Calculate counts dynamically from loaded leads to be instant
    const getCount = (filterFn) => leads.filter(filterFn).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center text-slate-500">Unable to load dashboard data. Please ensure you are logged in.</div>;

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                <p className="text-slate-500 mt-2">Overview of your pipeline performance.</p>
            </header>

            {/* Quick Overview Cards */}
            <section className="mb-10">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4">
                    <StatusCard
                        title="Hot Leads"
                        count={getCount(l => l.status === 'hot')}
                        icon={Flame}
                        color="danger"
                        onClick={() => handleCardClick('hot', 'Hot Leads')}
                    />
                    <StatusCard
                        title="Qualified"
                        count={getCount(l => l.status === 'qualified')}
                        icon={CheckCircle}
                        color="success"
                        onClick={() => handleCardClick('qualified', 'Qualified Leads')}
                    />
                    <StatusCard
                        title="Proposal Sent"
                        count={getCount(l => l.status === 'proposal')}
                        icon={FileText}
                        color="primary"
                        onClick={() => handleCardClick('proposal', 'Proposals Sent')}
                    />
                    <StatusCard
                        title="Negotiations"
                        count={getCount(l => l.status === 'negotiation')}
                        icon={MessageSquare}
                        color="warning"
                        onClick={() => handleCardClick('negotiation', 'In Negotiation')}
                    />
                    <StatusCard
                        title="Contacted"
                        count={getCount(l => l.status === 'contacted')}
                        icon={Phone}
                        color="info"
                        onClick={() => handleCardClick('contacted', 'Contacted Leads')}
                    />
                    <StatusCard
                        title="Won Deals"
                        count={getCount(l => l.status === 'won')}
                        icon={Award}
                        color="success"
                        onClick={() => handleCardClick('won', 'Won Deals')}
                    />
                    <StatusCard
                        title="Unassigned"
                        count={getCount(l => !l.assigned_to)}
                        icon={UserMinus}
                        color="warning"
                        onClick={() => handleCardClick('unassigned', 'Unassigned Leads')}
                    />
                    <StatusCard
                        title="High Priority"
                        count={getCount(l => l.priority === 'high')}
                        icon={Star}
                        color="orange" // Using secondary orange
                        onClick={() => handleCardClick('priority', 'High Priority Leads')}
                    />
                    <StatusCard
                        title="Lost Deals"
                        count={getCount(l => l.status === 'lost')}
                        icon={XCircle}
                        color="secondary"
                        onClick={() => handleCardClick('lost', 'Lost Deals')}
                    />
                    <StatusCard
                        title="All Leads"
                        count={leads.length}
                        icon={Users}
                        color="primary"
                        onClick={() => handleCardClick('all', 'All Leads')}
                    />
                </div>
            </section>

            {/* Performance Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Division Performance */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="bg-slate-800 p-4 flex items-center gap-2 text-white">
                        <BarChart3 className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Division Performance</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {Object.entries(data.division_performance || {}).map(([division, stats]) => {
                            const labels = { 'tech': 'Gralix Tech', 'actuarial': 'Gralix Actuarial', 'capital': 'Gralix Capital' };
                            const colors = { 'tech': 'text-blue-600', 'actuarial': 'text-emerald-600', 'capital': 'text-orange-600' };
                            return (
                                <div
                                    key={division}
                                    onClick={() => handleFilterClick('division', division, `${labels[division]} Leads`)}
                                    className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                                >
                                    <div>
                                        <h3 className={`font-semibold text-lg ${colors[division] || 'text-slate-800'}`}>{labels[division] || division}</h3>
                                        <p className="text-sm text-slate-500">{stats.count} leads</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                                            ZMW {(stats.revenue || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Team Performance */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="bg-blue-500 p-4 flex items-center gap-2 text-white">
                        <Users className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Team Performance</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {(data.top_performers || []).map((person) => (
                            <div
                                key={person.id}
                                onClick={() => handleFilterClick('personnel', person.id, `${person.name}'s Leads`)}
                                className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-4 group"
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                                    {person.avatar || person.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900">{person.name}</h3>
                                    <p className="text-sm text-slate-500">{person.leads_count} leads</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                                        ZMW {(person.total_value || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Pipeline"
                    value={`ZMW ${(data.total_pipeline || 0).toLocaleString()}`}
                    subtext="Weighted Value"
                    icon={DollarSign}
                />
                <StatCard
                    title="Accessible Leads"
                    value={data.user_stats?.total_accessible_leads || 0}
                    subtext="In your view"
                    icon={Users}
                />
                <StatCard
                    title="Conversion Rate"
                    value={`${(data.conversion_rate || 0).toFixed(1)}%`}
                    subtext="Qualified to Won"
                    icon={Activity}
                />
                <StatCard
                    title="Avg Deal Size"
                    value={`ZMW ${(data.avg_deal || 0).toFixed(0)}`}
                    subtext="Per active lead"
                    icon={BarChart3}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Status Distribution</h2>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Object.entries(data.status_counts || {}).map(([name, value]) => ({ name, value }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#e85c2c" strokeWidth={3} dot={{ r: 4, fill: '#e85c2c', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <LeadListModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                leads={filteredLeads}
                onLeadUpdated={fetchData} // Refresh dashboard if lead is edited in modal
            />
        </div >
    );
};

export default Dashboard;
