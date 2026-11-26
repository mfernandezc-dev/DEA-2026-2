from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets
from rest_framework.exceptions import APIException
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryProtected(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = (
        'This category has products. Reassign or delete them first.'
    )
    default_code = 'category_protected'


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as error:
            raise CategoryProtected() from error


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category')
    serializer_class = ProductSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
