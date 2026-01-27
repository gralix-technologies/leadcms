import React, { useState } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import LeadDetailModal from '../leads/LeadDetailModal';

const LeadListModal = ({ isOpen, onClose, title, leads, onLeadUpdated }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);

    if (!isOpen) return null;

    // Filter leads by search term
    const filteredLeads = leads.filter(lead =>
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLeadClick = (lead) => {
        setSelectedLead(lead);
    };

    const handleCloseDetail = () => {
        setSelectedLead(null);
        // We might want to refresh the parent list here if changes happened, 
        // but `onLeadUpdated` passed to LeadDetailModal handles the API/parent side.
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-xl">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                            <p className="text-sm text-slate-500">{leads.length} leads found</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search in this list..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto p-2 flex-1">
                        {filteredLeads.length > 0 ? (
                            <div className="space-y-2">
                                {filteredLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        onClick={() => handleLeadClick(lead)}
                                        className="group p-3 hover:bg-primary-50 rounded-lg cursor-pointer border border-transparent hover:border-primary-100 transition-all flex items-center justify-between"
                                    >
                                        <div>
                                            <h4 className="font-semibold text-slate-800 group-hover:text-primary-700">{lead.company}</h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{lead.contact_name || 'No Contact'}</span>
                                                <span>•</span>
                                                <span className="font-medium text-slate-600">ZMW {Number(lead.deal_value).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-primary-400" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400">
                                <p>No leads found matching your search.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested Detail Modal */}
            {selectedLead && (
                <LeadDetailModal
                    isOpen={!!selectedLead}
                    onClose={handleCloseDetail}
                    lead={selectedLead}
                    onLeadUpdated={onLeadUpdated}
                />
            )}
        </>
    );
};

export default LeadListModal;
