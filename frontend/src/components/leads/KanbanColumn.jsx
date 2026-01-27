import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard';

const KanbanColumn = ({ id, title, leads, color, onLeadClick }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="flex flex-col min-w-[280px] w-[280px] max-w-[280px] h-full">
            {/* Header */}
            <div className={`p-3 rounded-t-xl border-b-2 flex justify-between items-center bg-white border-l border-r border-t`} style={{ borderColor: color ? '#e2e8f0' : '#e2e8f0', borderBottomColor: color }}>
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
                <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-xs font-bold">
                    {leads.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className="flex-1 bg-slate-50/50 p-2 border-x border-b border-slate-200 rounded-b-xl overflow-y-auto space-y-3 min-h-[150px]"
            >
                <SortableContext
                    id={id}
                    items={leads.map(l => l.id.toString())}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
                    ))}
                </SortableContext>

                {leads.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-300 text-sm border-2 border-dashed border-slate-200 rounded-lg p-4">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;
