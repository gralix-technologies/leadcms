import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import { leadService } from '../services/api';
import { Clock, Phone, Mail, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

// Custom styles for Calendar
const calendarStyles = `
  .react-calendar {
    width: 100%;
    background: white;
    border: none;
    font-family: inherit;
    line-height: 1.125em;
  }
  .react-calendar__tile {
    padding: 1.5em 0.5em;
    height: 100px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    position: relative;
    border: 1px solid #f1f5f9 !important;
  }
  .react-calendar__tile--now {
    background: #f0f9ff;
  }
  .react-calendar__tile--active {
    background: #e0f2fe !important;
    color: #0284c7 !important;
  }
  .react-calendar__month-view__days__day {
    font-weight: 600;
  }
  .react-calendar__navigation {
    margin-bottom: 20px;
  }
  .react-calendar__navigation button {
    font-size: 1.25rem;
    font-weight: 700;
  }
`;

const CalendarPage = () => {
    const [value, onChange] = useState(new Date());
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDateLeads, setSelectedDateLeads] = useState([]);

    useEffect(() => {
        fetchLeads();
    }, []);

    useEffect(() => {
        if (leads.length > 0) {
            updateSelectedDateLeads(value);
        }
    }, [value, leads]);

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

    const updateSelectedDateLeads = (date) => {
        const formattedDate = date.toISOString().split('T')[0];
        const daysLeads = leads.filter(lead => lead.follow_up_date === formattedDate);
        setSelectedDateLeads(daysLeads);
    };

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const formattedDate = date.toISOString().split('T')[0];
            const daysLeads = leads.filter(lead => lead.follow_up_date === formattedDate);

            if (daysLeads.length > 0) {
                return (
                    <div className="w-full mt-2">
                        {daysLeads.slice(0, 2).map((lead, idx) => (
                            <div key={idx} className="text-xs bg-primary-100 text-primary-700 px-1 py-0.5 rounded mb-1 truncate">
                                {lead.company}
                            </div>
                        ))}
                        {daysLeads.length > 2 && (
                            <div className="text-xs text-slate-400 pl-1">
                                +{daysLeads.length - 2} more
                            </div>
                        )}
                    </div>
                );
            }
        }
        return null;
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden gap-6">
            <style>{calendarStyles}</style>

            {/* Main Calendar View */}
            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-y-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
                    <CalendarIcon className="mr-3 text-primary-600" size={32} />
                    Calendar
                </h1>
                <Calendar
                    onChange={onChange}
                    value={value}
                    tileContent={tileContent}
                    className="rounded-xl border-none w-full"
                />
            </div>

            {/* Side Panel: Selected Day Details */}
            <div className="w-96 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h2 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">
                    {value.toDateString()}
                </h2>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {selectedDateLeads.length > 0 ? (
                        selectedDateLeads.map(lead => (
                            <div key={lead.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-primary-200 transition-colors cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800">{lead.company}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                            lead.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-200 text-slate-700'}`}>
                                        {lead.status}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 space-y-2">
                                    <div className="flex items-center">
                                        <Clock size={14} className="mr-2" />
                                        <span>Follow up</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Phone size={14} className="mr-2" />
                                        <span>{lead.phone || 'No Phone'}</span>
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button className="text-primary-600 text-sm font-medium flex items-center hover:underline">
                                        View Details <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CalendarIcon size={24} className="text-slate-300" />
                            </div>
                            No follow-ups scheduled for this day.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
