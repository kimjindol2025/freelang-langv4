# Django Main URL Configuration

from django.contrib import admin
from django.urls import path, include
from django.conf import settings

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # FreeLang 컴파일러 API
    path('', include('compiler.urls')),
]

# 디버그 모드에서 정적 파일 제공
if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
