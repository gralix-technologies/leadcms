
import os

file_path = 'static/leads/js/dashboard.js'

snooze_code = r"""
function openSnoozeModal(leadId) {
    currentSnoozeLeadId = leadId;
    new bootstrap.Modal(document.getElementById('snoozeModal')).show();
}

async function snoozeLead(days) {
    if (!currentSnoozeLeadId) return;

    try {
        showLoading(true);
        var date = new Date();
        date.setDate(date.getDate() + days);
        // Format as YYYY-MM-DD
        var dateStr = date.toISOString().split('T')[0];

        // We use the lead update endpoint
        // First we need to get the lead to ensure we don't zero out other fields 
        // if the API requires full object. 
        // However, usually partial update is preferred (PATCH). 
        // But confirm saveLead usage. 
        // Looking at views.py, update_lead likely expects serializer data.
        // Let's check saveLead in dashboard.js. 
        // It sends ALL fields.
        // Doing a partial update might fail if the backend uses PUT with required fields.
        // But we can check if we can switch to PATCH or just send existing data.
        
        var lead = findLeadById(currentSnoozeLeadId);
        if (!lead) {
            showAlert('Lead not found', 'error');
            return;
        }

        // Prepare data with updated date. maintain other fields.
        var data = {
            company: lead.company,
            contact_name: lead.contact_name,
            position: lead.position,
            email: lead.email,
            phone: lead.phone,
            follow_up_date: dateStr,
            division: lead.division,
            product: lead.product,
            priority: lead.priority,
            deal_value: parseFloat(lead.deal_value) || 0,
            probability_of_completion: lead.probability_of_completion,
            comments: lead.comments,
            assigned_to: lead.assigned_to
        };

        var response = await apiCall(`/api/leads/${currentSnoozeLeadId}/update/`, 'PUT', data);

        var index = findLeadIndexById(currentSnoozeLeadId);
        if (index !== -1) {
            leads[index] = response;
        }

        bootstrap.Modal.getInstance(document.getElementById('snoozeModal')).hide();
        await loadInitialData();
        
        var messages = {
            1: 'Snoozed until tomorrow',
            3: 'Snoozed for 3 days',
            7: 'Snoozed for 1 week',
            30: 'Snoozed for 1 month'
        };
        showAlert(messages[days] || 'Lead snoozed successfully');
        showLoading(false);
    } catch (error) {
        console.error('Error snoozing lead:', error);
        showAlert('Error snoozing lead', 'error');
        showLoading(false);
    }
}
"""

with open(file_path, 'a') as f:
    f.write(snooze_code)

print("Successfully appended snooze functions")
