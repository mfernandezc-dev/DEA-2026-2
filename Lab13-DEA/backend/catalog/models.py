from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    stock = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    image = models.ImageField(upload_to='catalog/products/')
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name='products'
    )

    class Meta:
        ordering = ['id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name='catalog_product_price_nonnegative',
            ),
            models.CheckConstraint(
                condition=models.Q(stock__gte=0),
                name='catalog_product_stock_nonnegative',
            ),
        ]

    def __str__(self):
        return self.name
