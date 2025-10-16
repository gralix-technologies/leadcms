from django.urls import path
from . import views

urlpatterns = [
    # Authentication URLs
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Dashboard
    path('', views.dashboard, name='dashboard'),
    
    # API URLs (all require authentication)
    path('api/user-profile/', views.get_user_profile, name='get_user_profile'),
    path('api/leads/', views.get_leads, name='get_leads'),
    path('api/leads/create/', views.create_lead, name='create_lead'),
    path('api/leads/<int:lead_id>/update/', views.update_lead, name='update_lead'),
    path('api/leads/<int:lead_id>/delete/', views.delete_lead, name='delete_lead'),
    path('api/personnel/', views.get_personnel, name='get_personnel'),
    path('api/products/', views.get_products, name='get_products'),  # NEW
    path('api/communication/', views.log_communication, name='log_communication'),
    path('api/reassign/', views.reassign_lead, name='reassign_lead'),
    path('api/bulk-assign/', views.bulk_assign, name='bulk_assign'),
    path('api/analytics/', views.get_analytics, name='get_analytics'),
]