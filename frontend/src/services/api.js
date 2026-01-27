import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Vite proxy will handle this
    withCredentials: true, // Important for Session auth
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token Handling for Django
const getCookie = (name) => {
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
};

api.interceptors.request.use((config) => {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken;
    }
    return config;
});

export const leadService = {
    getLeads: () => api.get('/leads/'),
    createLead: (data) => api.post('/leads/create/', data),
    updateLead: (id, data) => api.put(`/leads/${id}/update/`, data),
    deleteLead: (id) => api.delete(`/leads/${id}/delete/`),
    getAnalytics: (division = 'all') => api.get(`/analytics/?division=${division}`),
    getPersonnel: () => api.get('/personnel/'),
    reassignLead: (data) => api.post('/reassign/', data),
    logCommunication: (data) => api.post('/communication/', data),
    bulkStatusUpdate: (data) => api.post('/leads/bulk-status/', data),
    getLead: async (id) => {
        // Polyfill: Fetch all leads and find the one we need since we don't have a detail endpoint
        const response = await api.get('/leads/');
        return { data: response.data.find(l => l.id === parseInt(id)) };
    },

    // Resource Planning
    getResources: (leadId) => api.get(`/assignments/?lead_id=${leadId}`),
    addResource: (data) => api.post('/assignments/', data),
    deleteResource: (id) => api.delete(`/assignments/${id}/`),

    getMaterials: (leadId) => api.get(`/materials/?lead_id=${leadId}`),
    addMaterial: (data) => api.post('/materials/', data),
    deleteMaterial: (id) => api.delete(`/materials/${id}/`),
};

export const authService = {
    getCurrentUser: () => api.get('/user-profile/'),
    login: (username, password) => api.post('/login/', { username, password }),
    logout: () => api.post('/logout/'),
    // User Management
    createPersonnel: (data) => api.post('/personnel/create/', data),
    updatePersonnel: (id, data) => api.put(`/personnel/${id}/update/`, data),
    deletePersonnel: (id) => api.delete(`/personnel/${id}/delete/`),
};

export const notificationService = {
    getAll: () => api.get('/notifications/'),
    markRead: (id) => api.post(`/notifications/${id}/read/`),
    markAllRead: () => api.post('/notifications/read-all/'),
};

export default api;
