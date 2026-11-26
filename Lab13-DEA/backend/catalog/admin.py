from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'description']
    search_fields = ['name', 'description']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'category', 'price', 'stock', 'image_preview',
    ]
    list_filter = ['category']
    search_fields = ['name', 'description', 'category__name']
    list_select_related = ['category']
    readonly_fields = ['image_preview']

    @admin.display(description='Image')
    def image_preview(self, obj):
        if not obj.image:
            return '-'
        return format_html(
            '<img src="{}" alt="{}" width="120" height="80" '
            'style="object-fit:contain">',
            obj.image.url,
            obj.name,
        )
