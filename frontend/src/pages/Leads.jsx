import React, { useEffect, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from '../components/leads/KanbanColumn';
import LeadCard from '../components/leads/LeadCard';
import LeadsTable from '../components/leads/LeadsTable';
import CreateLeadModal from '../components/CreateLeadModal';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import { leadService } from '../services/api';
import { Plus, Filter, LayoutGrid, List } from 'lucide-react';

const STATUSES = {
    new: { label: 'New', color: '#3b82f6' },
    contacted: { label: 'Contacted', color: '#f59e0b' },
    qualified: { label: 'Qualified', color: '#8b5cf6' },
    proposal: { label: 'Proposal', color: '#ec4899' },
    negotiation: { label: 'Negotiation', color: '#f43f5e' },
    won: { label: 'Won', color: '#10b981' },
    lost: { label: 'Lost', color: '#64748b' },
};

const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        division: 'all'
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await leadService.getLeads();
            setLeads(response.data);
        } catch (error) {
            console.error("Error fetching leads", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeadCreated = (newLead) => {
        setLeads(prev => [newLead, ...prev]);
    };

    const handleLeadClick = (lead) => {
        setSelectedLead(lead);
    };

    const handleLeadUpdated = (updatedLead) => {
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
        setSelectedLead(updatedLead); // Update the modal with new data
    };

    const handleLeadDeleted = (leadId) => {
        setLeads(prev => prev.filter(l => l.id !== leadId));
        setSelectedLead(null);
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeLeadId = active.id;
        let newStatus = over.id;

        if (!STATUSES[newStatus]) {
            const overLead = leads.find(l => l.id.toString() === over.id.toString());
            if (overLead) {
                newStatus = overLead.status;
            } else {
                return;
            }
        }

        const lead = leads.find(l => l.id.toString() === activeLeadId);
        if (!lead || lead.status === newStatus) return;

        // Optimistic Update
        const oldLeads = [...leads];
        setLeads(leads.map(l =>
            l.id.toString() === activeLeadId
                ? { ...l, status: newStatus }
                : l
        ));

        // API Call
        try {
            await leadService.updateLead(activeLeadId, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status", error);
            setLeads(oldLeads);
        }
    };

    // Filter Logic
    const filteredLeads = leads.filter(lead => {
        const matchesStatus = filters.status === 'all' || lead.status === filters.status;
        const matchesDivision = filters.division === 'all' || (lead.division && lead.division.toLowerCase() === filters.division);
        return matchesStatus && matchesDivision;
    });

    const groupedLeads = (status) => filteredLeads.filter(l => l.status === status);

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-col space-y-4 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
                        <p className="text-slate-500">Manage and track your opportunities.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* View Toggles */}
                        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Kanban Board"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center px-4 py-2 border rounded-lg font-medium transition-colors ${showFilters ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <Filter size={18} className="mr-2" />
                            Filters
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors shadow-lg shadow-primary-500/30"
                        >
                            <Plus size={18} className="mr-2" />
                            New Lead
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Division</label>
                            <select
                                value={filters.division}
                                onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Divisions</option>
                                <option value="tech">Technologies</option>
                                <option value="actuarial">Actuarial</option>
                                <option value="capital">Capital</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Statuses</option>
                                {Object.entries(STATUSES).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {viewMode === 'kanban' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex-1 overflow-x-auto pb-4">
                        <div className="flex space-x-4 h-full min-w-max">
                            {Object.entries(STATUSES).map(([status, config]) => (
                                <KanbanColumn
                                    key={status}
                                    id={status}
                                    title={config.label}
                                    color={config.color}
                                    leads={groupedLeads(status)}
                                    onLeadClick={handleLeadClick}
                                />
                            ))}
                        </div>
                    </div>

                    <DragOverlay>
                        {activeId ? (
                            <div className="opacity-80 rotate-2 cursor-grabbing">
                                <LeadCard lead={leads.find(l => l.id.toString() === activeId)} />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                <div className="flex-1 overflow-auto">
                    <LeadsTable leads={filteredLeads} onLeadClick={handleLeadClick} />
                </div>
            )}

            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onLeadCreated={handleLeadCreated}
            />

            <LeadDetailModal
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                lead={selectedLead}
                onLeadUpdated={handleLeadUpdated}
                onLeadDeleted={handleLeadDeleted}
            />
        </div>
    );
};

export default Leads;
