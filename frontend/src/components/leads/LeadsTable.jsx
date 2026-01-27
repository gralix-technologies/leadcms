import React from 'react';
import { MoreHorizontal, Phone, Mail, User } from 'lucide-react';

const LeadsTable = ({ leads, onLeadClick }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Company
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Value
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Owner
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {leads.map((lead) => (
                        <tr key={lead.id} onClick={() => onLeadClick && onLeadClick(lead)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        {lead.company.charAt(0)}
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-slate-900">{lead.company}</div>
                                        <div className="text-sm text-slate-500">{lead.division}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">{lead.contact_name}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-2">
                                    {lead.email && <span title={lead.email}><Mail size={12} /></span>}
                                    {lead.phone && <span title={lead.phone}><Phone size={12} /></span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${lead.status === 'won' ? 'bg-green-100 text-green-800' :
                                        lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                            'bg-slate-100 text-slate-800'}`}>
                                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                ZMW {Number(lead.deal_value).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                <div className="flex items-center">
                                    <User size={14} className="mr-1 text-slate-400" />
                                    {lead.assigned_to_name || 'Unassigned'}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-slate-400 hover:text-slate-600">
                                    <MoreHorizontal size={20} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {leads.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                    No leads found. Create one to get started.
                </div>
            )}
        </div>
    );
};

export default LeadsTable;
