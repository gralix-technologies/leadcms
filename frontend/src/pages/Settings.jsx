import React, { useState, useEffect } from 'react';
import { authService, leadService } from '../services/api'; // leadService for getPersonnel
import { User, Bell, Lock, Save, Shield, Users, Plus, MoreHorizontal, Check, X, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

const Settings = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [personnel, setPersonnel] = useState([]);

    // Notifications State
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        digest: 'daily'
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '', password: '', first_name: '', last_name: '',
        email: '', division: 'tech', role: 'agent', phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authService.getCurrentUser();
                setUser(response.data.user);
            } catch (error) {
                console.error("Failed to load user profile", error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (activeTab === 'team' && user && (user.role === 'admin' || user.permissions?.can_manage_leads)) {
            fetchPersonnel();
        }
    }, [activeTab, user]);

    const fetchPersonnel = async () => {
        try {
            const res = await leadService.getPersonnel();
            setPersonnel(res.data);
        } catch (err) {
            console.error("Failed to fetch personnel", err);
        }
    };

    const handleOpenModal = (userToEdit = null) => {
        setError('');
        if (userToEdit) {
            setEditingUser(userToEdit);
            setFormData({
                username: userToEdit.username || '', // Note: username might not be in serializer depending on implementation? It is not in PersonnelSerializer default fields usually unless added.
                // Assuming Name logic. We need separate fields for edit.
                first_name: userToEdit.first_name,
                last_name: userToEdit.last_name,
                email: userToEdit.email,
                division: userToEdit.division,
                role: userToEdit.role,
                phone: userToEdit.phone || '',
                password: '' // Don't show password
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '', password: '', first_name: '', last_name: '',
                email: '', division: 'tech', role: 'agent', phone: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (editingUser) {
                await authService.updatePersonnel(editingUser.id, formData);
            } else {
                await authService.createPersonnel(formData);
            }
            setIsModalOpen(false);
            fetchPersonnel();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "An error occurred");
            // Handle field errors if object
            if (err.response?.data && typeof err.response.data === 'object' && !err.response.data.error) {
                setError(Object.values(err.response.data).flat().join(', '));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this user?')) {
            try {
                await authService.deletePersonnel(id);
                fetchPersonnel();
            } catch (err) {
                alert("Failed to deactivate user");
            }
        }
    };

    if (!user) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-500 mt-2">Manage your account and organization.</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        General
                    </button>
                    {(user.role === 'admin' || user.permissions?.can_manage_leads) && (
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Team Management
                        </button>
                    )}
                </div>
            </header>

            {activeTab === 'general' ? (
                /* General Settings Content */
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Profile Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 p-6 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <User size={20} className="text-primary-500" />
                                Profile Information
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="col-span-1 flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-slate-100 mb-4 flex items-center justify-center text-slate-500 text-3xl font-bold border-4 border-white shadow-lg">
                                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                                </div>
                                <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-500 capitalize">{user.role}</div>
                            </div>
                            <div className="col-span-2 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={user.name || ''}
                                            readOnly
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            type="text"
                                            value={user.email || ''}
                                            readOnly
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Division</label>
                                    <input
                                        type="text"
                                        value={`Gralix ${user.division ? user.division.charAt(0).toUpperCase() + user.division.slice(1) : ''}`}
                                        readOnly
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 p-6">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Bell size={20} className="text-primary-500" />
                                Notifications
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-900">Email Notifications</h3>
                                    <p className="text-sm text-slate-500">Receive daily summaries and critical updates.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notifications.email} onChange={() => setNotifications(prev => ({ ...prev, email: !prev.email }))} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Team Management Tab */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                    <div className="border-b border-slate-100 p-6 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Users size={20} className="text-primary-500" />
                                Team Members
                            </h2>
                            <p className="text-sm text-slate-500">Manage user access and roles.</p>
                        </div>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                            <Plus size={18} /> Add User
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Division</th>
                                    <th className="px-6 py-4">Workload</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {personnel.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                                    {p.avatar || (p.name ? p.name.substring(0, 2) : 'U')}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{p.name}</div>
                                                    <div className="text-xs text-slate-500">{p.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${p.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                                                p.role === 'manager' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${p.division === 'tech' ? 'bg-blue-50 text-blue-700' :
                                                p.division === 'actuarial' ? 'bg-emerald-50 text-emerald-700' :
                                                    p.division === 'capital' ? 'bg-orange-50 text-orange-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {p.division || 'All'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {p.workload} leads
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenModal(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                {p.id !== user.id && (
                                                    <button onClick={() => handleDeleteUser(p.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="agent">Agent</option>
                                        <option value="manager">Manager</option>
                                        <option value="executive">Executive</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Division *</label>
                                    <select
                                        value={formData.division}
                                        onChange={e => setFormData({ ...formData, division: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="tech">Tech</option>
                                        <option value="actuarial">Actuarial</option>
                                        <option value="capital">Capital</option>
                                    </select>
                                </div>
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-70"
                                >
                                    {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
