var leads = [];
var personnel = [];
var filteredLeads = [];
var editingLeadId = null;
var currentCommunicationLeadId = null;
var currentView = 'all';
var selectedLeads = [];
var currentDetailLeadId = null;
var analytics = {};

// CSRF token for Django
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

// API calls
async function apiCall(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    return response.json();
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    setupEventListeners();
});

async function loadInitialData() {
    try {
        showLoading(true);
        
        // Load personnel first
        personnel = await apiCall('/api/personnel/');
        populatePersonnelDropdowns();
        
        // Load leads
        leads = await apiCall('/api/leads/');
        
        // Load analytics
        analytics = await apiCall('/api/analytics/');
        
        // Initial render
        filteredLeads = leads.slice();
        renderAll();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('Error loading data', 'error');
        showLoading(false);
    }
}

function showLoading(show) {
    const body = document.body;
    if (show) {
        body.classList.add('loading');
    } else {
        body.classList.remove('loading');
    }
}

function showAlert(message, type = 'success') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('divisionFilter').addEventListener('change', applyFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
    document.getElementById('personnelFilter').addEventListener('change', applyFilters);
    
    // Assignment strategy change
    document.getElementById('assignmentStrategy').addEventListener('change', function() {
        var strategy = this.value;
        var manualDiv = document.getElementById('manualAssignmentDiv');
        manualDiv.style.display = strategy === 'manual' ? 'block' : 'none';
    });
}

function populatePersonnelDropdowns() {
    var dropdowns = ['assignedTo', 'reassignTo', 'bulkAssignPerson'];
    var personnelFilter = document.getElementById('personnelFilter');
    
    // Clear existing options (except first one)
    const existingOptions = personnelFilter.querySelectorAll('option:not(:first-child):not([value="unassigned"])');
    existingOptions.forEach(option => option.remove());
    
    // Populate filter dropdown
    personnel.forEach(function(person) {
        var option = document.createElement('option');
        option.value = person.id;
        option.textContent = person.name + ' (' + getDivisionLabel(person.division) + ')';
        personnelFilter.appendChild(option);
    });
    
    // Populate other dropdowns
    dropdowns.forEach(function(dropdownId) {
        var dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.innerHTML = '<option value="">Select Personnel</option>';
            personnel.forEach(function(person) {
                var option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name + ' (' + getDivisionLabel(person.division) + ')';
                dropdown.appendChild(option);
            });
        }
    });
}

function renderAll() {
    renderQuickViewCards();
    renderAnalytics();
    renderLeadsTable();
    updateResultsCount();
}

function renderQuickViewCards() {
    var html = '';
    var cards = [
        {
            key: 'all',
            label: 'All Leads', 
            count: leads.length,
            color: 'primary',
            icon: 'people'
        },
        {
            key: 'hot',
            label: 'Hot Leads',
            count: countByStatus('hot'),
            color: 'danger', 
            icon: 'fire'
        },
        {
            key: 'qualified',
            label: 'Qualified',
            count: countByStatus('qualified'),
            color: 'success',
            icon: 'check-circle'
        },
        {
            key: 'unassigned',
            label: 'Unassigned',
            count: countUnassigned(),
            color: 'warning',
            icon: 'person-x'
        },
        {
            key: 'high-priority',
            label: 'High Priority',
            count: countByPriority('high'),
            color: 'info',
            icon: 'star'
        }
    ];

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var activeClass = currentView === card.key ? 'active' : '';
        var textClass = currentView === card.key ? 'text-light' : 'text-' + card.color;
        
        html += '<div class="col-md-3 mb-3 col-lg-2">';
        html += '<div class="card quick-view-card ' + activeClass + '" onclick="setCurrentView(\'' + card.key + '\')">';
        html += '<div class="card-body text-center">';
        html += '<i class="bi bi-' + card.icon + ' fs-1 ' + textClass + ' mb-2"></i>';
        html += '<h3 class="card-title ' + textClass + '">' + card.count + '</h3>';
        html += '<p class="card-text ' + (currentView === card.key ? 'text-light' : 'text-muted') + '">' + card.label + '</p>';
        html += '</div></div></div>';
    }
    
    document.getElementById('quickViewCards').innerHTML = html;
}

function renderAnalytics() {
    var totalPipeline = analytics.total_pipeline || 0;
    var avgDeal = analytics.avg_deal || 0;
    var conversionRate = analytics.conversion_rate || 0;

    // Revenue Overview
    var revenueHtml = '';
    revenueHtml += '<div class="row g-3">';
    revenueHtml += '<div class="col-6">';
    revenueHtml += '<div class="card analytics-card success">';
    revenueHtml += '<div class="card-body text-center">';
    revenueHtml += '<h3 class="text-success">
     + totalPipeline.toLocaleString() + '</h3>';
    revenueHtml += '<small class="text-muted">Total Pipeline Value</small>';
    revenueHtml += '</div></div></div>';
    
    revenueHtml += '<div class="col-6">';
    revenueHtml += '<div class="card analytics-card primary">';
    revenueHtml += '<div class="card-body text-center">';
    revenueHtml += '<h3 class="text-primary">
     + Math.round(avgDeal).toLocaleString() + '</h3>';
    revenueHtml += '<small class="text-muted">Average Deal Size</small>';
    revenueHtml += '</div></div></div>';
    
    revenueHtml += '<div class="col-12">';
    revenueHtml += '<div class="card analytics-card warning">';
    revenueHtml += '<div class="card-body text-center">';
    revenueHtml += '<h3 class="text-warning">' + conversionRate.toFixed(1) + '%</h3>';
    revenueHtml += '<small class="text-muted">Conversion Rate (Qualified + Hot)</small>';
    revenueHtml += '</div></div></div>';
    revenueHtml += '</div>';
    
    document.getElementById('revenueOverview').innerHTML = revenueHtml;

    // Division Performance
    var divisionHtml = '';
    divisionHtml += '<div class="row g-3">';
    
    var divisions = [
        {key: 'tech', label: 'Gralix Tech', color: 'primary'},
        {key: 'actuarial', label: 'Gralix Actuarial', color: 'success'}, 
        {key: 'capital', label: 'Gralix Capital', color: 'warning'}
    ];
    
    for (var i = 0; i < divisions.length; i++) {
        var div = divisions[i];
        var divisionData = analytics.division_performance[div.key] || {count: 0, revenue: 0};
        
        divisionHtml += '<div class="col-12">';
        divisionHtml += '<div class="card analytics-card ' + div.color + '">';
        divisionHtml += '<div class="card-body">';
        divisionHtml += '<div class="d-flex justify-content-between align-items-center">';
        divisionHtml += '<div>';
        divisionHtml += '<h5 class="text-' + div.color + '">' + div.label + '</h5>';
        divisionHtml += '<small class="text-muted">' + divisionData.count + ' leads</small>';
        divisionHtml += '</div>';
        divisionHtml += '<h4 class="text-' + div.color + ' mb-0">
     + divisionData.revenue.toLocaleString() + '</h4>';
        divisionHtml += '</div></div></div></div>';
    }
    divisionHtml += '</div>';
    
    document.getElementById('divisionPerformance').innerHTML = divisionHtml;

    // Team Performance
    var teamHtml = '';
    teamHtml += '<div class="row g-2">';
    
    var topPerformers = analytics.top_performers || [];
    for (var i = 0; i < Math.min(3, topPerformers.length); i++) {
        var performer = topPerformers[i];
        
        teamHtml += '<div class="col-12">';
        teamHtml += '<div class="card analytics-card info">';
        teamHtml += '<div class="card-body">';
        teamHtml += '<div class="d-flex align-items-center">';
        teamHtml += '<div class="personnel-avatar me-3">' + performer.avatar + '</div>';
        teamHtml += '<div class="flex-grow-1">';
        teamHtml += '<h6 class="mb-0">' + performer.name + '</h6>';
        teamHtml += '<small class="text-muted">' + performer.leads_count + ' leads</small>';
        teamHtml += '</div>';
        teamHtml += '<h5 class="text-info mb-0">
     + performer.total_value.toLocaleString() + '</h5>';
        teamHtml += '</div></div></div></div>';
    }
    teamHtml += '</div>';
    
    document.getElementById('teamPerformance').innerHTML = teamHtml;

    // Deal Stage Pipeline
    var stageHtml = '';
    var statusCounts = analytics.status_counts || {};
    var stageStats = [
        { 
            label: 'New Leads', 
            count: statusCounts.new || 0, 
            value: calculateStatusValue('new'), 
            color: 'primary' 
        },
        { 
            label: 'In Progress', 
            count: (statusCounts.contacted || 0) + (statusCounts.qualified || 0), 
            value: calculateStatusValue('contacted') + calculateStatusValue('qualified'), 
            color: 'info' 
        },
        { 
            label: 'Hot Prospects', 
            count: (statusCounts.hot || 0) + (statusCounts.proposal || 0), 
            value: calculateStatusValue('hot') + calculateStatusValue('proposal'), 
            color: 'warning' 
        },
        { 
            label: 'Closing', 
            count: statusCounts.negotiation || 0, 
            value: calculateStatusValue('negotiation'), 
            color: 'success' 
        }
    ];
    
    for (var i = 0; i < stageStats.length; i++) {
        var stage = stageStats[i];
        stageHtml += '<div class="col-md-3">';
        stageHtml += '<div class="card analytics-card ' + stage.color + '">';
        stageHtml += '<div class="card-body text-center">';
        stageHtml += '<h4 class="text-' + stage.color + '">' + stage.count + '</h4>';
        stageHtml += '<h6 class="text-muted">' + stage.label + '</h6>';
        stageHtml += '<small class="text-muted">
     + stage.value.toLocaleString() + '</small>';
        stageHtml += '</div></div></div>';
    }
    
    document.getElementById('dealStagePipeline').innerHTML = stageHtml;
}

function renderLeadsTable() {
    var tbody = document.getElementById('leadsTableBody');
    var noResultsDiv = document.getElementById('noResultsMessage');
    
    if (filteredLeads.length === 0) {
        tbody.innerHTML = '';
        noResultsDiv.style.display = 'block';
        return;
    }
    
    noResultsDiv.style.display = 'none';
    var html = '';

    for (var i = 0; i < filteredLeads.length; i++) {
        var lead = filteredLeads[i];
        var hasRecentComm = lead.communications && lead.communications.length > 0;
        
        html += '<tr>';
        
        // Checkbox column
        html += '<td>';
        html += '<input type="checkbox" class="lead-checkbox" value="' + lead.id + '" onchange="updateSelectedLeads()">';
        html += '</td>';
        
        // Company column
        html += '<td>';
        html += '<div class="d-flex align-items-start">';
        html += '<div class="flex-grow-1">';
        html += '<strong class="lead-company-link" onclick="showLeadDetail(' + lead.id + ')" style="cursor: pointer; color: #0d6efd;">' + lead.company + '</strong>';
        if (lead.comments) {
            html += '<br><small class="text-muted">' + lead.comments + '</small>';
        }
        if (hasRecentComm) {
            var lastComm = lead.communications[0]; // Communications are ordered by date desc
            html += '<div class="mt-1"><span class="badge bg-info text-dark"><i class="bi bi-clock me-1"></i>' + lastComm.date + '</span></div>';
        }
        html += '</div></div></td>';
        
        // Contact column  
        html += '<td>';
        html += '<div>' + (lead.contact_name || '-') + '</div>';
        if (lead.position) {
            html += '<small class="text-muted">' + lead.position + '</small>';
        }
        if (lead.email) {
            var iconClass = lead.email.indexOf('@') !== -1 ? 'envelope' : 'telephone';
            html += '<br><small><i class="bi bi-' + iconClass + ' me-1"></i>' + lead.email + '</small>';
        }
        html += '</td>';
        
        // Assigned To column
        html += '<td>';
        if (lead.assigned_to_name) {
            html += '<div class="d-flex align-items-center">';
            html += '<div class="personnel-avatar me-2">' + lead.assigned_to_avatar + '</div>';
            html += '<div>';
            html += '<div class="fw-semibold">' + lead.assigned_to_name + '</div>';
            html += '<small class="text-muted">' + getDivisionLabel(lead.assigned_to_division) + '</small>';
            html += '</div></div>';
        } else {
            html += '<span class="text-muted">Unassigned</span>';
            html += '<br><button class="btn btn-sm btn-outline-primary mt-1" onclick="quickAssign(' + lead.id + ')">Assign</button>';
        }
        html += '</td>';
        
        // Division column
        html += '<td><span class="badge division-' + lead.division + '">' + getDivisionLabel(lead.division) + '</span></td>';
        
        // Status & Progress column
        html += '<td>';
        html += getStatusBadge(lead.status);
        html += '<div class="mt-1">';
        html += '<div class="stage-progress">';
        html += '<div class="stage-progress-fill" style="width: ' + (lead.progress || 0) + '%"></div>';
        html += '</div>';
        html += '<small class="text-muted">' + (lead.progress || 0) + '% complete</small>';
        html += '</div>';
        html += '</td>';
        
        // Priority column
        html += '<td><span class="priority-' + lead.priority + '">' + lead.priority.toUpperCase() + '</span></td>';
        
        // Deal Value column
        html += '<td><strong>
     + (lead.deal_value || 0).toLocaleString() + '</strong></td>';
        
        // Next Follow-up column
        html += '<td>';
        if (lead.follow_up_date) {
            var followupDate = new Date(lead.follow_up_date);
            var today = new Date();
            var isOverdue = followupDate < today;
            var dateClass = isOverdue ? 'text-danger' : 'text-success';
            html += '<span class="' + dateClass + '"><i class="bi bi-calendar me-1"></i>' + lead.follow_up_date + '</span>';
            if (isOverdue) {
                html += '<br><small class="text-danger">Overdue</small>';
            }
        } else {
            html += '<span class="text-muted">Not scheduled</span>';
        }
        html += '</td>';
        
        // Actions column
        html += '<td>';
        html += '<div class="btn-group btn-group-sm">';
        html += '<button class="btn btn-outline-info" onclick="showLeadDetail(' + lead.id + ')" title="View Details">';
        html += '<i class="bi bi-eye"></i></button>';
        html += '<button class="btn btn-outline-primary" onclick="editLead(' + lead.id + ')" title="Edit Lead">';
        html += '<i class="bi bi-pencil"></i></button>';
        html += '<button class="btn btn-outline-success" onclick="showCommunicationModal(' + lead.id + ')" title="Log Communication">';
        html += '<i class="bi bi-chat-dots"></i></button>';
        html += '<div class="btn-group btn-group-sm">';
        html += '<button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="More Actions">';
        html += '<i class="bi bi-three-dots"></i></button>';
        html += '<ul class="dropdown-menu">';
        html += '<li><a class="dropdown-item" href="#" onclick="showReassignModal(' + lead.id + ')"><i class="bi bi-person-gear me-2"></i>Reassign</a></li>';
        html += '<li><hr class="dropdown-divider"></li>';
        html += '<li><a class="dropdown-item text-danger" href="#" onclick="deleteLead(' + lead.id + ')"><i class="bi bi-trash me-2"></i>Delete</a></li>';
        html += '</ul></div>';
        html += '</div></td>';
        
        html += '</tr>';
    }

    tbody.innerHTML = html;
}

async function showLeadDetail(leadId) {
    currentDetailLeadId = leadId;
    var lead = findLeadById(leadId);
    if (!lead) return;
    
    var html = '';
    html += '<div class="lead-detail-header">';
    html += '<div class="row">';
    html += '<div class="col-md-8">';
    html += '<h2 class="mb-2">' + lead.company + '</h2>';
    html += '<div class="row">';
    html += '<div class="col-md-6">';
    if (lead.contact_name) {
        html += '<p class="mb-1"><strong>Contact:</strong> ' + lead.contact_name;
        if (lead.position) html += ' (' + lead.position + ')';
        html += '</p>';
    }
    if (lead.email) {
        html += '<p class="mb-1"><strong>Email/Phone:</strong> ' + lead.email + '</p>';
    }
    html += '</div>';
    html += '<div class="col-md-6">';
    html += '<p class="mb-1"><strong>Division:</strong> <span class="badge division-' + lead.division + '">' + getDivisionLabel(lead.division) + '</span></p>';
    html += '<p class="mb-1"><strong>Priority:</strong> <span class="priority-' + lead.priority + '">' + lead.priority.toUpperCase() + '</span></p>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="col-md-4 text-end">';
    html += '<h3 class="text-success mb-2">
     + (lead.deal_value || 0).toLocaleString() + '</h3>';
    html += '<div class="mb-2">' + getStatusBadge(lead.status) + '</div>';
    
    // Progress bar
    html += '<div class="stage-progress mb-2">';
    html += '<div class="stage-progress-fill" style="width: ' + (lead.progress || 0) + '%"></div>';
    html += '</div>';
    html += '<small class="text-muted">' + (lead.progress || 0) + '% Complete</small>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Assignment Info
    html += '<div class="row mb-4">';
    html += '<div class="col-md-6">';
    html += '<div class="card">';
    html += '<div class="card-header"><h6 class="mb-0"><i class="bi bi-person-badge me-2"></i>Assignment</h6></div>';
    html += '<div class="card-body">';
    if (lead.assigned_to_name) {
        html += '<div class="d-flex align-items-center mb-2">';
        html += '<div class="personnel-avatar me-3">' + lead.assigned_to_avatar + '</div>';
        html += '<div>';
        html += '<div class="fw-semibold">' + lead.assigned_to_name + '</div>';
        html += '<small class="text-muted">' + lead.assigned_to_email + '</small>';
        html += '</div>';
        html += '</div>';
        
        // Assignment history
        if (lead.assignments && lead.assignments.length > 0) {
            html += '<small class="text-muted">Assignment History:</small>';
            html += '<div class="mt-1">';
            for (var i = 0; i < lead.assignments.length; i++) {
                var assignment = lead.assignments[i];
                html += '<div class="small text-muted">';
                html += assignment.date + ': ';
                if (assignment.from_personnel_name) {
                    html += assignment.from_personnel_name + ' → ';
                }
                html += assignment.to_personnel_name;
                if (assignment.reason) {
                    html += ' (' + assignment.reason + ')';
                }
                html += '</div>';
            }
            html += '</div>';
        }
    } else {
        html += '<div class="text-center text-muted">';
        html += '<i class="bi bi-person-x fs-2 mb-2"></i>';
        html += '<p>Unassigned</p>';
        html += '<button class="btn btn-sm btn-primary" onclick="showReassignModal(' + lead.id + ')">Assign Now</button>';
        html += '</div>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Important Dates
    html += '<div class="col-md-6">';
    html += '<div class="card">';
    html += '<div class="card-header"><h6 class="mb-0"><i class="bi bi-calendar me-2"></i>Important Dates</h6></div>';
    html += '<div class="card-body">';
    html += '<div class="row">';
    html += '<div class="col-6">';
    html += '<small class="text-muted">Last Contact:</small>';
    html += '<div>' + (lead.last_contact || 'Never') + '</div>';
    html += '</div>';
    html += '<div class="col-6">';
    html += '<small class="text-muted">Next Follow-up:</small>';
    if (lead.follow_up_date) {
        var followupDate = new Date(lead.follow_up_date);
        var today = new Date();
        var isOverdue = followupDate < today;
        var dateClass = isOverdue ? 'text-danger' : 'text-success';
        html += '<div class="' + dateClass + '">' + lead.follow_up_date;
        if (isOverdue) html += ' (Overdue)';
        html += '</div>';
    } else {
        html += '<div class="text-muted">Not scheduled</div>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Comments
    if (lead.comments) {
        html += '<div class="card mb-4">';
        html += '<div class="card-header"><h6 class="mb-0"><i class="bi bi-chat-text me-2"></i>Notes</h6></div>';
        html += '<div class="card-body">';
        html += '<p class="mb-0">' + lead.comments + '</p>';
        html += '</div>';
        html += '</div>';
    }
    
    // Communication History
    html += '<div class="card">';
    html += '<div class="card-header d-flex justify-content-between align-items-center">';
    html += '<h6 class="mb-0"><i class="bi bi-chat-dots me-2"></i>Communication History</h6>';
    html += '<button class="btn btn-sm btn-success" onclick="showCommunicationModalFromDetail()">Add Communication</button>';
    html += '</div>';
    html += '<div class="card-body">';
    
    if (lead.communications && lead.communications.length > 0) {
        html += '<div class="progress-timeline">';
        for (var i = 0; i < lead.communications.length; i++) {
            var comm = lead.communications[i];
            html += '<div class="communication-item">';
            html += '<div class="d-flex justify-content-between align-items-start mb-1">';
            html += '<div>';
            html += '<strong>' + capitalizeFirst(comm.communication_type) + '</strong>';
            if (comm.user) {
                html += ' <small class="text-muted">by ' + comm.user + '</small>';
            }
            html += '</div>';
            html += '<small class="text-muted">' + comm.date + '</small>';
            html += '</div>';
            html += '<p class="mb-0">' + comm.note + '</p>';
            html += '</div>';
        }
        html += '</div>';
    } else {
        html += '<div class="text-center text-muted py-4">';
        html += '<i class="bi bi-chat-dots fs-2 mb-2"></i>';
        html += '<p>No communications logged yet</p>';
        html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    
    document.getElementById('leadDetailContent').innerHTML = html;
    document.getElementById('leadDetailTitle').textContent = 'Lead Details - ' + lead.company;
    new bootstrap.Modal(document.getElementById('leadDetailModal')).show();
}

// Continue with more functions...
function navigateLead(direction) {
    var currentIndex = -1;
    for (var i = 0; i < filteredLeads.length; i++) {
        if (filteredLeads[i].id === currentDetailLeadId) {
            currentIndex = i;
            break;
        }
    }
    
    if (currentIndex === -1) return;
    
    var newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < filteredLeads.length) {
        showLeadDetail(filteredLeads[newIndex].id);
    }
}

function editLeadFromDetail() {
    bootstrap.Modal.getInstance(document.getElementById('leadDetailModal')).hide();
    editLead(currentDetailLeadId);
}

function showCommunicationModalFromDetail() {
    bootstrap.Modal.getInstance(document.getElementById('leadDetailModal')).hide();
    showCommunicationModal(currentDetailLeadId);
}

function updateResultsCount() {
    document.getElementById('resultsCount').textContent = filteredLeads.length;
}

function applyFilters() {
    var searchTerm = document.getElementById('searchInput').value.toLowerCase();
    var statusFilter = document.getElementById('statusFilter').value;
    var divisionFilter = document.getElementById('divisionFilter').value;
    var priorityFilter = document.getElementById('priorityFilter').value;
    var personnelFilter = document.getElementById('personnelFilter').value;

    filteredLeads = [];
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var include = true;

        // Search filter
        if (searchTerm) {
            var searchableText = (lead.company + ' ' + (lead.contact_name || '') + ' ' + (lead.comments || '') + ' ' + (lead.assigned_to_name || '')).toLowerCase();
            if (searchableText.indexOf(searchTerm) === -1) {
                include = false;
            }
        }

        // Status filter
        if (statusFilter !== 'all' && lead.status !== statusFilter) include = false;
        
        // Division filter
        if (divisionFilter !== 'all' && lead.division !== divisionFilter) include = false;
        
        // Priority filter  
        if (priorityFilter !== 'all' && lead.priority !== priorityFilter) include = false;
        
        // Personnel filter
        if (personnelFilter !== 'all') {
            if (personnelFilter === 'unassigned' && lead.assigned_to) include = false;
            if (personnelFilter !== 'unassigned' && lead.assigned_to != personnelFilter) include = false;
        }

        // View-based filtering
        if (currentView === 'hot' && lead.status !== 'hot') include = false;
        if (currentView === 'qualified' && lead.status !== 'qualified') include = false;
        if (currentView === 'high-priority' && lead.priority !== 'high') include = false;
        if (currentView === 'unassigned' && lead.assigned_to) include = false;

        if (include) filteredLeads.push(lead);
    }

    renderLeadsTable();
    updateResultsCount();
    selectedLeads = [];
    updateSelectAllState();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('divisionFilter').value = 'all';
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('personnelFilter').value = 'all';
    currentView = 'all';
    selectedLeads = [];
    renderAll();
}

function setCurrentView(view) {
    currentView = view;
    renderQuickViewCards();
    applyFilters();
}

function updateSelectedLeads() {
    var checkboxes = document.querySelectorAll('.lead-checkbox:checked');
    selectedLeads = Array.from(checkboxes).map(function(cb) { return parseInt(cb.value); });
    updateSelectAllState();
}

function toggleSelectAll() {
    var selectAll = document.getElementById('selectAll').checked;
    var checkboxes = document.querySelectorAll('.lead-checkbox');
    
    checkboxes.forEach(function(cb) {
        cb.checked = selectAll;
    });
    
    updateSelectedLeads();
}

function updateSelectAllState() {
    var checkboxes = document.querySelectorAll('.lead-checkbox');
    var checkedBoxes = document.querySelectorAll('.lead-checkbox:checked');
    var selectAll = document.getElementById('selectAll');
    var selectAllHeader = document.getElementById('selectAllHeader');
    
    if (checkboxes.length === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
        selectAllHeader.indeterminate = false;
        selectAllHeader.checked = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
        selectAllHeader.indeterminate = false;
        selectAllHeader.checked = true;
    } else if (checkedBoxes.length > 0) {
        selectAll.indeterminate = true;
        selectAllHeader.indeterminate = true;
    } else {
        selectAll.indeterminate = false;
        selectAll.checked = false;
        selectAllHeader.indeterminate = false;
        selectAllHeader.checked = false;
    }
}

// Lead management functions
function showAddForm() {
    editingLeadId = null;
    document.getElementById('modalTitle').textContent = 'Add New Lead';
    clearForm();
    new bootstrap.Modal(document.getElementById('leadModal')).show();
}

function editLead(id) {
    var lead = findLeadById(id);
    if (!lead) return;
    
    editingLeadId = id;
    document.getElementById('modalTitle').textContent = 'Edit Lead - ' + lead.company;
    populateForm(lead);
    new bootstrap.Modal(document.getElementById('leadModal')).show();
}

async function saveLead() {
    var companyName = document.getElementById('companyName').value.trim();
    if (!companyName) {
        alert('Company name is required');
        document.getElementById('companyName').focus();
        return;
    }

    var assignedTo = document.getElementById('assignedTo').value;
    if (!assignedTo) {
        alert('Please assign this lead to a team member');
        document.getElementById('assignedTo').focus();
        return;
    }

    var formData = {
        company: companyName,
        contact_name: document.getElementById('contactName').value.trim(),
        position: document.getElementById('contactPosition').value.trim(),
        email: document.getElementById('email').value.trim(),
        follow_up_date: document.getElementById('followupDate').value || null,
        division: document.getElementById('division').value,
        priority: document.getElementById('priority').value,
        deal_value: parseFloat(document.getElementById('dealValue').value) || 0,
        comments: document.getElementById('comments').value.trim(),
        assigned_to: parseInt(assignedTo)
    };

    try {
        showLoading(true);
        
        if (editingLeadId) {
            var response = await apiCall(`/api/leads/${editingLeadId}/update/`, 'PUT', formData);
            // Update the lead in our local array
            var index = findLeadIndexById(editingLeadId);
            if (index !== -1) {
                leads[index] = response;
            }
            showAlert('Lead updated successfully');
        } else {
            var response = await apiCall('/api/leads/create/', 'POST', formData);
            leads.push(response);
            showAlert('Lead created successfully');
        }

        bootstrap.Modal.getInstance(document.getElementById('leadModal')).hide();
        
        // Reload data to get fresh analytics
        await loadInitialData();
        
        showLoading(false);
    } catch (error) {
        console.error('Error saving lead:', error);
        showAlert('Error saving lead', 'error');
        showLoading(false);
    }
}

async function deleteLead(id) {
    var lead = findLeadById(id);
    if (!lead) return;
    
    if (confirm('Are you sure you want to delete the lead for ' + lead.company + '?')) {
        try {
            showLoading(true);
            await apiCall(`/api/leads/${id}/delete/`, 'DELETE');
            
            leads = leads.filter(function(l) { return l.id !== id; });
            selectedLeads = selectedLeads.filter(function(leadId) { return leadId !== id; });
            
            await loadInitialData();
            showAlert('Lead deleted successfully');
            showLoading(false);
        } catch (error) {
            console.error('Error deleting lead:', error);
            showAlert('Error deleting lead', 'error');
            showLoading(false);
        }
    }
}

function showCommunicationModal(leadId) {
    currentCommunicationLeadId = leadId;
    var lead = findLeadById(leadId);
    if (lead) {
        document.getElementById('communicationModal').querySelector('.modal-title').textContent = 'Log Communication - ' + lead.company;
    }
    document.getElementById('communicationType').value = 'call';
    document.getElementById('communicationNote').value = '';
    document.getElementById('newStatus').value = '';
    document.getElementById('nextFollowupDate').value = '';
    new bootstrap.Modal(document.getElementById('communicationModal')).show();
}

async function logCommunication() {
    var note = document.getElementById('communicationNote').value.trim();
    var type = document.getElementById('communicationType').value;
    var newStatus = document.getElementById('newStatus').value;
    var nextFollowup = document.getElementById('nextFollowupDate').value;
    
    if (!note) {
        alert('Please add communication notes');
        document.getElementById('communicationNote').focus();
        return;
    }

    try {
        showLoading(true);
        
        var data = {
            lead_id: currentCommunicationLeadId,
            communication_type: type,
            note: note,
            new_status: newStatus || null,
            next_followup: nextFollowup || null
        };
        
        var response = await apiCall('/api/communication/', 'POST', data);
        
        // Update the lead in our local array
        var leadIndex = findLeadIndexById(currentCommunicationLeadId);
        if (leadIndex !== -1) {
            leads[leadIndex] = response;
        }
        
        bootstrap.Modal.getInstance(document.getElementById('communicationModal')).hide();
        
        // Reload data to get fresh analytics
        await loadInitialData();
        
        // Refresh detail view if open
        if (currentDetailLeadId === currentCommunicationLeadId) {
            showLeadDetail(currentDetailLeadId);
        }
        
        showAlert('Communication logged successfully');
        showLoading(false);
    } catch (error) {
        console.error('Error logging communication:', error);
        showAlert('Error logging communication', 'error');
        showLoading(false);
    }
}

function showReassignModal(leadId) {
    if (leadId) {
        currentCommunicationLeadId = leadId;
        var lead = findLeadById(leadId);
        if (lead) {
            document.getElementById('reassignModal').querySelector('.modal-title').textContent = 'Reassign Lead - ' + lead.company;
        }
    }
    document.getElementById('reassignTo').value = '';
    document.getElementById('reassignReason').value = '';
    new bootstrap.Modal(document.getElementById('reassignModal')).show();
}

async function processReassignment() {
    var newAssignee = document.getElementById('reassignTo').value;
    var reason = document.getElementById('reassignReason').value.trim();
    
    if (!newAssignee) {
        alert('Please select who to reassign this lead to');
        return;
    }
    
    if (!reason) {
        alert('Please provide a reason for reassignment');
        return;
    }
    
    try {
        showLoading(true);
        
        var data = {
            lead_id: currentCommunicationLeadId,
            new_assignee_id: parseInt(newAssignee),
            reason: reason
        };
        
        var response = await apiCall('/api/reassign/', 'POST', data);
        
        // Update the lead in our local array
        var leadIndex = findLeadIndexById(currentCommunicationLeadId);
        if (leadIndex !== -1) {
            leads[leadIndex] = response;
        }
        
        bootstrap.Modal.getInstance(document.getElementById('reassignModal')).hide();
        
        // Reload data to get fresh analytics
        await loadInitialData();
        
        // Refresh detail view if open
        if (currentDetailLeadId === currentCommunicationLeadId) {
            showLeadDetail(currentDetailLeadId);
        }
        
        showAlert('Lead reassigned successfully');
        showLoading(false);
    } catch (error) {
        console.error('Error reassigning lead:', error);
        showAlert('Error reassigning lead', 'error');
        showLoading(false);
    }
}

async function quickAssign(leadId) {
    currentCommunicationLeadId = leadId;
    var lead = findLeadById(leadId);
    
    // Auto-assign based on division expertise
    var suitablePersonnel = personnel.filter(function(p) { 
        return p.division === lead.division; 
    });
    
    if (suitablePersonnel.length > 0) {
        // Find person with lowest workload in the division
        var assignee = suitablePersonnel.reduce(function(prev, curr) {
            return prev.workload < curr.workload ? prev : curr;
        });
        
        try {
            showLoading(true);
            
            var data = {
                lead_id: leadId,
                new_assignee_id: assignee.id,
                reason: 'Quick assignment based on division expertise'
            };
            
            var response = await apiCall('/api/reassign/', 'POST', data);
            
            // Update the lead in our local array
            var leadIndex = findLeadIndexById(leadId);
            if (leadIndex !== -1) {
                leads[leadIndex] = response;
            }
            
            // Update workload
            assignee.workload++;
            
            // Reload data to get fresh analytics
            await loadInitialData();
            
            showAlert('Lead assigned successfully');
            showLoading(false);
        } catch (error) {
            console.error('Error in quick assign:', error);
            showAlert('Error assigning lead', 'error');
            showLoading(false);
        }
    } else {
        showReassignModal(leadId);
    }
}

function showBulkAssignModal() {
    new bootstrap.Modal(document.getElementById('bulkAssignModal')).show();
}

async function processBulkAssignment() {
    var strategy = document.getElementById('assignmentStrategy').value;
    var scope = document.querySelector('input[name="bulkScope"]:checked').value;
    var manualAssignee = document.getElementById('bulkAssignPerson').value;
    
    if (strategy === 'manual' && !manualAssignee) {
        alert('Please select a person to assign leads to');
        return;
    }
    
    try {
        showLoading(true);
        
        var data = {
            strategy: strategy,
            scope: scope,
            manual_assignee_id: manualAssignee ? parseInt(manualAssignee) : null
        };
        
        var response = await apiCall('/api/bulk-assign/', 'POST', data);
        
        bootstrap.Modal.getInstance(document.getElementById('bulkAssignModal')).hide();
        
        // Reload all data
        await loadInitialData();
        
        showAlert(response.message);
        showLoading(false);
    } catch (error) {
        console.error('Error in bulk assignment:', error);
        showAlert('Error in bulk assignment', 'error');
        showLoading(false);
    }
}

// Bulk operations
async function bulkReassign() {
    if (selectedLeads.length === 0) {
        alert('Please select leads to reassign');
        return;
    }
    
    var newAssignee = prompt('Enter personnel ID to reassign ' + selectedLeads.length + ' leads to:');
    if (newAssignee && findPersonById(parseInt(newAssignee))) {
        var reason = prompt('Reason for bulk reassignment:');
        if (reason) {
            try {
                showLoading(true);
                
                for (var i = 0; i < selectedLeads.length; i++) {
                    var data = {
                        lead_id: selectedLeads[i],
                        new_assignee_id: parseInt(newAssignee),
                        reason: 'Bulk reassignment: ' + reason
                    };
                    await apiCall('/api/reassign/', 'POST', data);
                }
                
                selectedLeads = [];
                await loadInitialData();
                
                showAlert('Successfully reassigned leads!');
                showLoading(false);
            } catch (error) {
                console.error('Error in bulk reassign:', error);
                showAlert('Error in bulk reassignment', 'error');
                showLoading(false);
            }
        }
    }
}

async function bulkUpdateStatus() {
    if (selectedLeads.length === 0) {
        alert('Please select leads to update');
        return;
    }
    
    var newStatus = prompt('Enter new status (new/contacted/qualified/proposal/negotiation/hot/won/lost/inactive):');
    var validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'hot', 'won', 'lost', 'inactive'];
    
    if (newStatus && validStatuses.includes(newStatus)) {
        try {
            showLoading(true);
            
            for (var i = 0; i < selectedLeads.length; i++) {
                var lead = findLeadById(selectedLeads[i]);
                if (lead) {
                    var data = {
                        status: newStatus,
                        progress: getProgressByStatus(newStatus)
                    };
                    await apiCall(`/api/leads/${selectedLeads[i]}/update/`, 'PUT', data);
                }
            }
            
            selectedLeads = [];
            await loadInitialData();
            
            showAlert('Successfully updated status for selected leads!');
            showLoading(false);
        } catch (error) {
            console.error('Error in bulk status update:', error);
            showAlert('Error updating status', 'error');
            showLoading(false);
        }
    }
}

async function bulkDelete() {
    if (selectedLeads.length === 0) {
        alert('Please select leads to delete');
        return;
    }
    
    if (confirm('Are you sure you want to delete ' + selectedLeads.length + ' selected leads? This action cannot be undone.')) {
        try {
            showLoading(true);
            
            for (var i = 0; i < selectedLeads.length; i++) {
                await apiCall(`/api/leads/${selectedLeads[i]}/delete/`, 'DELETE');
            }
            
            selectedLeads = [];
            await loadInitialData();
            
            showAlert('Successfully deleted selected leads!');
            showLoading(false);
        } catch (error) {
            console.error('Error in bulk delete:', error);
            showAlert('Error deleting leads', 'error');
            showLoading(false);
        }
    }
}

// Form utility functions
function clearForm() {
    document.getElementById('companyName').value = '';
    document.getElementById('contactName').value = '';
    document.getElementById('contactPosition').value = '';
    document.getElementById('email').value = '';
    document.getElementById('followupDate').value = '';
    document.getElementById('division').value = 'tech';
    document.getElementById('assignedTo').value = '';
    document.getElementById('priority').value = 'medium';
    document.getElementById('dealValue').value = '';
    document.getElementById('comments').value = '';
}

function populateForm(lead) {
    document.getElementById('companyName').value = lead.company || '';
    document.getElementById('contactName').value = lead.contact_name || '';
    document.getElementById('contactPosition').value = lead.position || '';
    document.getElementById('email').value = lead.email || '';
    document.getElementById('followupDate').value = lead.follow_up_date || '';
    document.getElementById('division').value = lead.division || 'tech';
    document.getElementById('assignedTo').value = lead.assigned_to || '';
    document.getElementById('priority').value = lead.priority || 'medium';
    document.getElementById('dealValue').value = lead.deal_value || '';
    document.getElementById('comments').value = lead.comments || '';
}

// Utility functions
function findLeadById(id) {
    for (var i = 0; i < leads.length; i++) {
        if (leads[i].id === id) return leads[i];
    }
    return null;
}

function findLeadIndexById(id) {
    for (var i = 0; i < leads.length; i++) {
        if (leads[i].id === id) return i;
    }
    return -1;
}

function findPersonById(id) {
    if (!id) return null;
    for (var i = 0; i < personnel.length; i++) {
        if (personnel[i].id === id) return personnel[i];
    }
    return null;
}

function countByStatus(status) {
    var count = 0;
    for (var i = 0; i < leads.length; i++) {
        if (leads[i].status === status) count++;
    }
    return count;
}

function countByPriority(priority) {
    var count = 0;
    for (var i = 0; i < leads.length; i++) {
        if (leads[i].priority === priority) count++;
    }
    return count;
}

function countUnassigned() {
    var count = 0;
    for (var i = 0; i < leads.length; i++) {
        if (!leads[i].assigned_to) count++;
    }
    return count;
}

function calculateStatusValue(status) {
    var total = 0;
    for (var i = 0; i < leads.length; i++) {
        if (leads[i].status === status) {
            total += parseFloat(leads[i].deal_value) || 0;
        }
    }
    return total;
}

function getProgressByStatus(status) {
    var progressMap = {
        'new': 10,
        'contacted': 25,
        'qualified': 50,
        'proposal': 70,
        'negotiation': 85,
        'hot': 90,
        'won': 100,
        'lost': 0,
        'inactive': 0
    };
    return progressMap[status] || 10;
}

function getStatusBadge(status) {
    var badges = {
        new: '<span class="badge bg-primary"><i class="bi bi-star me-1"></i>New</span>',
        contacted: '<span class="badge bg-info"><i class="bi bi-telephone me-1"></i>Contacted</span>',
        qualified: '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Qualified</span>',
        proposal: '<span class="badge bg-warning text-dark"><i class="bi bi-file-text me-1"></i>Proposal</span>',
        negotiation: '<span class="badge bg-orange"><i class="bi bi-chat-square-dots me-1"></i>Negotiation</span>',
        hot: '<span class="badge bg-danger"><i class="bi bi-fire me-1"></i>Hot</span>',
        won: '<span class="badge bg-success"><i class="bi bi-trophy me-1"></i>Won</span>',
        lost: '<span class="badge bg-dark"><i class="bi bi-x-circle me-1"></i>Lost</span>',
        inactive: '<span class="badge bg-secondary"><i class="bi bi-pause-circle me-1"></i>Inactive</span>'
    };
    return badges[status] || badges.new;
}

function getDivisionLabel(division) {
    var labels = {
        tech: 'Gralix Tech',
        actuarial: 'Gralix Actuarial',
        capital: 'Gralix Capital'
    };
    return labels[division] || division;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}