from django.urls import path
from . import views

app_name = 'categories'

urlpatterns = [
    path('', views.DocumentCategoryListView.as_view(), name='category_list'),
    path('<int:pk>/', views.DocumentCategoryDetailView.as_view(), name='category_detail'),
    path('tree/', views.category_tree, name='category_tree'),
    path('stats/', views.category_stats, name='category_stats'),
]