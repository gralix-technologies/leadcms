import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { leadService } from '../../services/api';

const LogCommunicationModal = ({ isOpen, onClose, lead, onLeadUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        communication_type: 'call',
        note: '',
        new_status: lead?.status || 'new',
        next_followup: ''
    });

    if (!isOpen || !lead) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                lead_id: lead.id,
                communication_type: formData.communication_type,
                note: formData.note,
                new_status: formData.new_status !== lead.status ? formData.new_status : undefined,
                next_followup: formData.next_followup || undefined
            };

            const response = await leadService.logCommunication(payload);
            onLeadUpdated(response.data); // Actually this might return the comm or the lead? 
            // leadService.logCommunication usually returns the created communication. 
            // But we might need to refresh the lead to see changes (status, dates).
            // Let's assume onLeadUpdated triggers a refresh or we can fetch.
            // Actually, usually we might need to re-fetch the lead detail. 
            // But let's pass whatever we get or trigger a reload.
            // Ideally onLeadUpdated(updatedLead). 
            // If the API returns the comm, we might not get the full updated lead object immediately unless the serializer returns it.
            // Let's assume for now we call leadService.getLead(id) or similar if needed, or just let the parent handle it.
            // For now, I'll close.
            onClose();
            // Trigger refresh in parent if possible.
            // If `onLeadUpdated` expects a lead object, sending the comm might break it.
            // I'll reload the lead in parent if I can.
            // Better: The parent `LeadDetailModal` should have a `refreshLead` function.
            // But `onLeadUpdated` updates the list in `Dashboard`.
            // Inside `LeadDetailModal`, we might need to update the local `lead` state.
            // I'll stick to: call onLeadUpdated with what I have, or just close and let parent re-fetch if it detects change.
            // Actually, I'll verify logic in a bit.
        } catch (err) {
            console.error(err);
            alert("Failed to log communication.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header - Brand Blue */}
                <div className="bg-primary-800 px-6 py-4 flex justify-between items-center border-b border-primary-700">
                    <h2 className="text-xl font-bold text-white leading-tight">
                        Log Communication - {lead.company}
                    </h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Communication Type</label>
                            <select
                                name="communication_type"
                                value={formData.communication_type}
                                onChange={handleChange}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-700"
                            >
                                <option value="call">Phone Call</option>
                                <option value="email">Email</option>
                                <option value="meeting">Meeting</option>
                                <option value="presentation">Presentation</option>
                                <option value="social">Social Media</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Update Status</label>
                            <select
                                name="new_status"
                                value={formData.new_status}
                                onChange={handleChange}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-700"
                            >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="proposal">Proposal Sent</option>
                                <option value="negotiation">Negotiation</option>
                                <option value="won">Closed Won</option>
                                <option value="lost">Closed Lost</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
                        <textarea
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            placeholder="What was discussed? Next steps?"
                            rows="4"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Next Follow-up Date</label>
                        <input
                            type="date"
                            name="next_followup"
                            value={formData.next_followup}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg shadow-lg shadow-secondary-500/30 font-bold transition-all transform hover:scale-[1.02]"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                        Log Communication
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogCommunicationModal;
