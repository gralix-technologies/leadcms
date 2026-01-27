import React, { useState, useEffect } from 'react';
import { Plus, Trash2, User, HardHat, DollarSign } from 'lucide-react';
import { leadService } from '../../services/api';

const ResourcePlanning = ({ lead }) => {
    const [resources, setResources] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [personnelList, setPersonnelList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [newResource, setNewResource] = useState({
        personnel: '',
        role: '',
        daily_rate: '',
        days_allocated: ''
    });
    const [newMaterial, setNewMaterial] = useState({
        name: '',
        cost: ''
    });

    useEffect(() => {
        loadData();
    }, [lead.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resData, matData, persData] = await Promise.all([
                leadService.getResources(lead.id),
                leadService.getMaterials(lead.id),
                leadService.getPersonnel()
            ]);
            setResources(resData.data);
            setMaterials(matData.data);
            setPersonnelList(persData.data);
        } catch (error) {
            console.error("Failed to load resources", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async () => {
        if (!newResource.personnel || !newResource.days_allocated) return;
        try {
            const payload = {
                ...newResource,
                lead: lead.id
            };
            const response = await leadService.addResource(payload);
            setResources([...resources, response.data]);
            setNewResource({ personnel: '', role: '', daily_rate: '', days_allocated: '' });
        } catch (error) {
            console.error("Failed to add resource", error);
        }
    };

    const handleDeleteResource = async (id) => {
        try {
            await leadService.deleteResource(id);
            setResources(resources.filter(r => r.id !== id));
        } catch (error) {
            console.error("Failed to delete resource", error);
        }
    };

    const handleAddMaterial = async () => {
        if (!newMaterial.name || !newMaterial.cost) return;
        try {
            const payload = { ...newMaterial, lead: lead.id };
            const response = await leadService.addMaterial(payload);
            setMaterials([...materials, response.data]);
            setNewMaterial({ name: '', cost: '' });
        } catch (error) {
            console.error("Failed to add material", error);
        }
    };

    const handleDeleteMaterial = async (id) => {
        try {
            await leadService.deleteMaterial(id);
            setMaterials(materials.filter(m => m.id !== id));
        } catch (error) {
            console.error("Failed to delete material", error);
        }
    };

    // Auto-fill rate when personnel selected
    const handlePersonnelSelect = (e) => {
        const personnelId = e.target.value;
        const person = personnelList.find(p => p.id === parseInt(personnelId));
        setNewResource(prev => ({
            ...prev,
            personnel: personnelId,
            daily_rate: person ? person.daily_rate || 0 : ''
        }));
    };

    const totalLabor = resources.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);
    const totalMaterial = materials.reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
    const grandTotal = totalLabor + totalMaterial;

    if (loading) return <div className="p-4 text-center">Loading resources...</div>;

    return (
        <div className="space-y-8">
            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-medium text-slate-500">Total Project Cost</h3>
                    <p className="text-2xl font-bold text-slate-900">ZMW {grandTotal.toLocaleString()}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                    <div>Labor: <span className="font-medium text-slate-700">ZMW {totalLabor.toLocaleString()}</span></div>
                    <div>Material: <span className="font-medium text-slate-700">ZMW {totalMaterial.toLocaleString()}</span></div>
                </div>
            </div>

            {/* Resources Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User size={20} className="text-primary-500" /> Human Resources
                </h3>

                {/* Add Resource Form */}
                <div className="grid grid-cols-12 gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 items-end">
                    <div className="col-span-4">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Personnel</label>
                        <select
                            value={newResource.personnel}
                            onChange={handlePersonnelSelect}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        >
                            <option value="">Select Personnel...</option>
                            {personnelList.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Role</label>
                        <input
                            type="text"
                            placeholder="e.g. Lead Dev"
                            value={newResource.role}
                            onChange={e => setNewResource({ ...newResource, role: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Daily Rate</label>
                        <input
                            type="number"
                            placeholder="ZMW"
                            value={newResource.daily_rate}
                            onChange={e => setNewResource({ ...newResource, daily_rate: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Days</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            value={newResource.days_allocated}
                            onChange={e => setNewResource({ ...newResource, days_allocated: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div className="col-span-1">
                        <button
                            onClick={handleAddResource}
                            className="w-full p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex justify-center"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Resource Table */}
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Days</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {resources.map(r => (
                                <tr key={r.id}>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.personnel_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{r.role}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500 text-right">ZMW {Number(r.daily_rate).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500 text-right">{r.days_allocated}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">ZMW {Number(r.total_cost).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDeleteResource(r.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {resources.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400 text-sm">No resources assigned.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Materials Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <HardHat size={20} className="text-orange-500" /> Materials & Costs
                </h3>

                {/* Add Material Form */}
                <div className="grid grid-cols-12 gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 items-end">
                    <div className="col-span-8">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Item Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Server License, Travel Expenses"
                            value={newMaterial.name}
                            onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Cost (ZMW)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={newMaterial.cost}
                            onChange={e => setNewMaterial({ ...newMaterial, cost: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>
                    <div className="col-span-1">
                        <button
                            onClick={handleAddMaterial}
                            className="w-full p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex justify-center"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Material Table */}
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Cost</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {materials.map(m => (
                                <tr key={m.id}>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{m.name}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">ZMW {Number(m.cost).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDeleteMaterial(m.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {materials.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-4 py-8 text-center text-slate-400 text-sm">No materials added.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResourcePlanning;
