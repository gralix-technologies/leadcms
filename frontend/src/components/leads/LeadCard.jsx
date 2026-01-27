import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, User, Phone, DollarSign } from 'lucide-react';

const LeadCard = ({ lead, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id.toString() });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick && onClick(lead)}
            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer active:cursor-grabbing mb-3 group ${isDragging ? 'ring-2 ring-primary-500 rotate-2' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-slate-900 line-clamp-1" title={lead.company}>
                    {lead.company}
                </h4>
                <div className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-md font-medium flex items-center">
                    <span className="mr-1">K</span>
                    {lead.deal_value > 0 ? Number(lead.deal_value).toLocaleString() : '0'}
                </div>
            </div>

            <div className="space-y-2 text-sm text-slate-500">
                <div className="flex items-center">
                    <User size={14} className="mr-2 text-slate-400" />
                    <span className="truncate">{lead.contact_name || 'No Contact'}</span>
                </div>
                {lead.phone && (
                    <div className="flex items-center">
                        <Phone size={14} className="mr-2 text-slate-400" />
                        <span>{lead.phone}</span>
                    </div>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                <span>{new Date(lead.updated_at).toLocaleDateString()}</span>
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                    {lead.assigned_to_name ? lead.assigned_to_name.substring(0, 2) : 'Un'}
                </div>
            </div>
        </div>
    );
};

export default LeadCard;
