from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentCategoryViewSet, FormFieldViewSet

app_name = 'documents'

router = DefaultRouter()
router.register('categories', DocumentCategoryViewSet, basename='category')
router.register('documents', DocumentViewSet, basename='document')
router.register('form-fields', FormFieldViewSet, basename='formfield')

urlpatterns = [
    path('', include(router.urls)),
]