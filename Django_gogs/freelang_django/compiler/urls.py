# Django URL Configuration — FreeLang 컴파일러 엔드포인트

from django.urls import path
from . import views

app_name = 'compiler'

urlpatterns = [
    # FreeLang 컴파일 API
    path('api/compile/', views.FreeLangCompileAPIView.as_view(), name='compile'),

    # Gogs Webhook
    path('api/webhook/gogs/', views.gogs_webhook, name='gogs_webhook'),

    # 캐시 관리
    path('api/cache/clear/', views.cache_clear, name='cache_clear'),
    path('api/cache/stats/', views.cache_stats, name='cache_stats'),
]
