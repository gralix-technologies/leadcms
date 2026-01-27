import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { leadService, authService } from '../services/api';

const CreateLeadModal = ({ isOpen, onClose, onLeadCreated }) => {
    const [formData, setFormData] = useState({
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        deal_value: 0,
        division: 'tech', // Default
        status: 'new',
        priority: 'medium',
        assigned_to: '', // ID of personnel
    });
    const [personnel, setPersonnel] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const [userRes, personnelRes] = await Promise.all([
                authService.getCurrentUser(),
                leadService.getPersonnel()
            ]);
            setCurrentUser(userRes.data.user);
            setPersonnel(personnelRes.data);

            // Auto-assign to self if agent
            if (userRes.data.user.role === 'agent') {
                setFormData(prev => ({ ...prev, assigned_to: userRes.data.user.id }));
            }
        } catch (err) {
            console.error("Failed to load data", err);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await leadService.createLead(formData);
            onLeadCreated(response.data);
            onClose(); // Close modal
            setFormData({
                company: '',
                contact_name: '',
                email: '',
                phone: '',
                deal_value: 0,
                division: 'tech',
                status: 'new',
                priority: 'medium',
                assigned_to: '',
            });
        } catch (err) {
            console.error(err);
            setError("Failed to create lead. Please check the inputs.");
        } finally {
            setLoading(false);
        }
    };

    const canAssign = currentUser && ['admin', 'manager', 'executive'].includes(currentUser.role);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Lead</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                        <input
                            type="text"
                            name="company"
                            required
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            placeholder="e.g. Acme Corp"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                            <input
                                type="text"
                                name="contact_name"
                                value={formData.contact_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Deal Value (ZMW)</label>
                            <input
                                type="number"
                                name="deal_value"
                                value={formData.deal_value}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Division</label>
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
                    </div>

                    {/* Assignment Dropdown */}
                    {canAssign && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                            <select
                                name="assigned_to"
                                value={formData.assigned_to}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                <option value="">Select Personnel...</option>
                                {personnel.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.role}) - {p.division || 'All'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 transition-all shadow-lg shadow-primary-500/30"
                        >
                            {loading ? 'Creating...' : 'Create Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateLeadModal;
