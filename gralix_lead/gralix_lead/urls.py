from django.urls import path
from . import views

urlpatterns = [
    # Authentication URLs
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    
    # Dashboard
    path('', views.dashboard, name='dashboard'),
    
    # API URLs (all require authentication)
    path('api/user-profile/', views.get_user_profile, name='get_user_profile'),
    path('api/leads/', views.get_leads, name='get_leads'),
    path('api/leads/export-calendar/', views.export_calendar, name='export_calendar'),
    path('api/leads/create/', views.create_lead, name='create_lead'),
    path('api/leads/<int:lead_id>/update/', views.update_lead, name='update_lead'),
    path('api/leads/<int:lead_id>/delete/', views.delete_lead, name='delete_lead'),
    path('api/personnel/', views.get_personnel, name='get_personnel'),
    path('api/personnel/create/', views.create_personnel, name='create_personnel'),
    path('api/personnel/<int:user_id>/update/', views.update_personnel, name='update_personnel'),
    path('api/personnel/<int:user_id>/delete/', views.delete_personnel, name='delete_personnel'),
    path('api/products/', views.get_products, name='get_products'),  # NEW
    # Product management (admin-only)
    path('api/products/create/', views.create_product, name='create_product'),
    path('api/products/<int:product_id>/update/', views.update_product, name='update_product'),
    path('api/products/<int:product_id>/delete/', views.delete_product, name='delete_product'),
    path('api/communication/', views.log_communication, name='log_communication'),
    path('api/reassign/', views.reassign_lead, name='reassign_lead'),
    path('api/bulk-assign/', views.bulk_assign, name='bulk_assign'),
    path('api/bulk-status/', views.bulk_status_update, name='bulk_status_update'),
    path('api/bulk-delete/', views.bulk_delete, name='bulk_delete'),
    path('api/analytics/', views.get_analytics, name='get_analytics'),
    
    # Resource & Planning
    path('api/assignments/', views.ResourceAssignmentList.as_view(), name='resource_list'),
    path('api/assignments/<int:pk>/', views.ResourceAssignmentDetail.as_view(), name='resource_detail'),
    path('api/materials/', views.MaterialCostList.as_view(), name='material_list'),
    path('api/materials/<int:pk>/', views.MaterialCostDetail.as_view(), name='material_detail'),

    # Notifications
    path('api/notifications/', views.get_notifications, name='get_notifications'),
    path('api/notifications/<str:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('api/notifications/read-all/', views.mark_all_read, name='mark_all_read'),
]