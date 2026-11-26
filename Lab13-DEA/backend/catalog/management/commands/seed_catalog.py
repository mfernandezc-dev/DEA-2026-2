"""Load repeatable demonstration records and local product illustrations."""

from decimal import Decimal

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from PIL import Image

from catalog.demo import DEMO_CATEGORIES, DEMO_PRODUCTS
from catalog.models import Category, Product


class Command(BaseCommand):
    help = 'Create or restore the TechStore demo catalog without duplicates.'

    def handle(self, *args, **options):
        source = settings.BASE_DIR / 'catalog' / 'assets' / 'demo'
        for *_, filename in DEMO_PRODUCTS:
            try:
                with Image.open(source / filename) as image:
                    image.verify()
            except (OSError, ValueError) as error:
                raise CommandError(
                    f'Invalid demo image: {filename}'
                ) from error

        storage = Product._meta.get_field('image').storage
        with transaction.atomic():
            categories = {}
            for name, description in DEMO_CATEGORIES.items():
                categories[name], _ = Category.objects.get_or_create(
                    name=name, defaults={'description': description}
                )
            for name, category, description, price, stock, filename in (
                DEMO_PRODUCTS
            ):
                image_name = f'catalog/demo/{filename}'
                if not storage.exists(image_name):
                    with (source / filename).open('rb') as image:
                        image_name = storage.save(image_name, File(image))
                product, _ = Product.objects.get_or_create(
                    name=name,
                    defaults={
                        'description': description,
                        'price': Decimal(price),
                        'stock': stock,
                        'category': categories[category],
                        'image': image_name,
                    },
                )
                # Preserve edits, but restore missing demonstration media.
                if not product.image or not storage.exists(product.image.name):
                    product.image = image_name
                    product.save(update_fields=['image'])
                product.full_clean()

        self.stdout.write(self.style.SUCCESS(
            'TechStore ready: 3 demo categories and 8 demo products. '
            'Existing records preserved; images are local illustrations.'
        ))
