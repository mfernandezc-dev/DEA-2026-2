from rest_framework.routers import DefaultRouter

from catalog.urls import router as catalog_router
from quiz.urls import router as quiz_router

router = DefaultRouter()
router.registry.extend(quiz_router.registry)
router.registry.extend(catalog_router.registry)

urlpatterns = router.urls
