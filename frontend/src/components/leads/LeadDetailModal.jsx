import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, User, Building, Phone, Mail, DollarSign, Layers, Edit2 } from 'lucide-react';
import ResourcePlanning from './ResourcePlanning';
import LeadView from './LeadView';
import LogCommunicationModal from './LogCommunicationModal';
import { leadService, authService } from '../../services/api';

const LeadDetailModal = ({ isOpen, onClose, lead, onLeadUpdated, onLeadDeleted }) => {
    const [formData, setFormData] = useState({ ...lead });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [showLogComm, setShowLogComm] = useState(false);
    const [personnel, setPersonnel] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Update form data when lead prop changes
    useEffect(() => {
        if (lead) {
            setFormData({ ...lead });
            // Default to details tab when opening new lead
            setActiveTab('details');
        }
    }, [lead]);

    // Fetch personnel/user info for permissions
    useEffect(() => {
        if (isOpen) {
            fetchPermissionsData();
        }
    }, [isOpen]);

    const fetchPermissionsData = async () => {
        try {
            const [userRes, personnelRes] = await Promise.all([
                authService.getCurrentUser(),
                leadService.getPersonnel()
            ]);
            setCurrentUser(userRes.data.user);
            setPersonnel(personnelRes.data);
        } catch (e) {
            console.error(e);
        }
    };

    const canAssign = currentUser && ['admin', 'manager', 'executive'].includes(currentUser.role);

    if (!isOpen || !lead) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await leadService.updateLead(lead.id, formData);
            onLeadUpdated(response.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to update lead.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            try {
                await leadService.deleteLead(lead.id);
                onLeadDeleted(lead.id);
                onClose();
            } catch (err) {
                console.error(err);
                setError("Failed to delete lead.");
            }
        }
    };

    const showResourcesTab = lead.status === 'won';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-primary-700 bg-primary-800 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {isEditing ? 'Edit Lead - ' : 'Lead Details - '} {lead.company}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                            >
                                <Edit2 size={16} /> Edit
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {!isEditing ? (
                        <LeadView
                            lead={lead}
                            onEdit={() => setIsEditing(true)}
                            onAddCommunication={() => setShowLogComm(true)}
                        />
                    ) : (
                        // Edit Form
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Editable Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Company Name *</label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Division *</label>
                                        <select
                                            name="division"
                                            value={formData.division}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="tech">Gralix Tech</option>
                                            <option value="actuarial">Gralix Actuarial</option>
                                            <option value="capital">Gralix Capital</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                                        <select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="new">New</option>
                                        <option value="qualified">Qualified</option>
                                        <option value="proposal">Proposal</option>
                                        <option value="negotiation">Negotiation</option>
                                        <option value="won">Closed Won</option>
                                        <option value="lost">Closed Lost</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Deal Value (ZMW)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 font-medium">K</span>
                                        <input
                                            type="number"
                                            name="deal_value"
                                            value={formData.deal_value}
                                            onChange={handleChange}
                                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Completion Probability (%)</label>
                                    <input
                                        type="number"
                                        name="probability_of_completion"
                                        value={formData.probability_of_completion}
                                        onChange={handleChange}
                                        min="0" max="100" step="10"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Contact Info & Reassignment */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Name</label>
                                    <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                        <User size={16} className="text-slate-400" />
                                        <input
                                            type="text"
                                            name="contact_name"
                                            value={formData.contact_name}
                                            onChange={handleChange}
                                            className="bg-transparent w-full outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Position</label>
                                    <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                        <User size={16} className="text-slate-400" />
                                        <input
                                            type="text"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleChange}
                                            placeholder="e.g. CFO"
                                            className="bg-transparent w-full outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                                    <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                        <Phone size={16} className="text-slate-400" />
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="bg-transparent w-full outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                    <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                        <Mail size={16} className="text-slate-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="bg-transparent w-full outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Reassignment Dropdown (Managers/Admins Only) */}
                                {canAssign && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned To</label>
                                        <select
                                            name="assigned_to"
                                            value={formData.assigned_to || ''}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="">Unassigned</option>
                                            {personnel.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Comments/Notes</label>
                                    <textarea
                                        name="comments"
                                        value={formData.comments}
                                        onChange={handleChange}
                                        rows="4"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions - Only Show in Edit Mode? Or Always? */}
                {isEditing && (
                    <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} /> Delete Lead
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors font-medium text-sm shadow-lg shadow-secondary-500/20"
                            >
                                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <LogCommunicationModal
                isOpen={showLogComm}
                onClose={() => setShowLogComm(false)}
                lead={lead}
                onLeadUpdated={async () => {
                    // When communication is logged, we need to refresh the lead data
                    // We'll fetch the fresh lead and notify parent
                    try {
                        const response = await leadService.getLead(lead.id);
                        onLeadUpdated(response.data);
                    } catch (e) {
                        console.error("Failed to refresh lead", e);
                    }
                }}
            />
        </div >
    );
};

export default LeadDetailModal;
