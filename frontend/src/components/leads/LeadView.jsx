import React, { useState } from 'react';
import { User, Calendar, MessageSquare, Clock, Edit2, CheckCircle, AlertCircle, TrendingUp, Building } from 'lucide-react';
import ResourcePlanning from './ResourcePlanning';
import { leadService } from '../../services/api';

const LeadView = ({ lead, onEdit, onAddCommunication }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    // Calculate probability color
    const getProbColor = (prob) => {
        if (prob >= 75) return 'bg-green-500';
        if (prob >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6">
            {/* Top Card: Key Info */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary-800"></div>

                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">{lead.company}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-800">Contact:</span>
                                {lead.contact_name} ({lead.position || 'N/A'})
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-800">Division:</span>
                                <span className="uppercase text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">
                                    {lead.division}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-800">Priority:</span>
                                <span className={`uppercase text-xs font-bold px-2 py-0.5 rounded ${lead.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    lead.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {lead.priority}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(lead.deal_value)}</div>
                        <div className="flex items-center gap-2 justify-end mt-1">
                            <div className="text-xs font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded">
                                {lead.probability_of_completion}% Probability
                            </div>
                            {lead.status === 'lost' ? (
                                <span className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full">
                                    <AlertCircle size={12} /> Lost
                                </span>
                            ) : lead.status === 'won' ? (
                                <span className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                                    <CheckCircle size={12} /> Won
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-bold rounded-full capitalize">
                                    {lead.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Probability Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                    <div
                        className={`h-2.5 rounded-full ${getProbColor(lead.progress)}`}
                        style={{ width: `${lead.progress}%` }}
                    ></div>
                </div>
                <div className="text-right text-xs text-slate-400">{lead.progress}% Complete</div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-slate-100 mt-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-secondary-500 text-secondary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Overview
                    </button>
                    {lead.status === 'won' && (
                        <button
                            onClick={() => setActiveTab('resources')}
                            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'resources' ? 'border-secondary-500 text-secondary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Resources & Planning
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Col */}
                    <div className="space-y-6">
                        {/* Assignment */}
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <User size={16} className="text-slate-400" /> Assignment
                            </h3>
                            {lead.assigned_to ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                                        {lead.assigned_to_avatar || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{lead.assigned_to_name}</div>
                                        <div className="text-xs text-slate-500">{lead.assigned_to_email}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic">Unassigned</div>
                            )}

                            {lead.assignments && lead.assignments.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="text-xs text-slate-400 mb-2">Assignment History:</div>
                                    {lead.assignments.slice(0, 2).map(assign => (
                                        <div key={assign.id} className="text-xs text-slate-600 mb-1">
                                            {assign.date.split('T')[0]}: {assign.to_personnel_name} ({assign.reason})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <MessageSquare size={16} className="text-slate-400" /> Notes
                            </h3>
                            <div className="text-sm text-slate-600 whitespace-pre-line">
                                {lead.comments || "No notes available."}
                            </div>
                        </div>
                    </div>

                    {/* Right Col */}
                    <div className="space-y-6">
                        {/* Details/Dates */}
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <Calendar size={16} className="text-slate-400" /> Important Dates
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Last Contact:</div>
                                    <div className="font-medium text-slate-800">
                                        {lead.last_contact || 'Never'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Next Follow-up:</div>
                                    <div className={`font-medium ${lead.follow_up_date && new Date(lead.follow_up_date) < new Date() ? 'text-red-500' : 'text-slate-800'
                                        }`}>
                                        {lead.follow_up_date || 'Not scheduled'}
                                        {lead.follow_up_date && new Date(lead.follow_up_date) < new Date() && ' (Overdue)'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Communication History */}
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Clock size={16} className="text-slate-400" /> Communication History
                                </h3>
                                <button
                                    onClick={onAddCommunication}
                                    className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded transition-colors"
                                >
                                    Add Communication
                                </button>
                            </div>

                            <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {lead.communications && lead.communications.map((comm) => (
                                    <div key={comm.id} className="relative pl-4">
                                        <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-secondary-400 border-2 border-white"></div>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-sm text-slate-800 capitalize">{comm.communication_type}</span>
                                            <span className="text-xs text-slate-400">{comm.date?.split('T')[0]}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-1">by {comm.user_name}</div>
                                        <div className="text-sm text-slate-600">{comm.note}</div>
                                    </div>
                                ))}
                                {(!lead.communications || lead.communications.length === 0) && (
                                    <div className="text-xs text-slate-400 pl-4">No communication history.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'resources' && (
                <ResourcePlanning lead={lead} />
            )}
        </div>
    );
};

export default LeadView;
