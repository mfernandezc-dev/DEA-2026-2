from decimal import Decimal
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import RequestFactory, TestCase, override_settings
from PIL import Image

from .models import Category, Product


class CatalogModelTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Laptops')

    def product(self, **changes):
        fields = {
            'name': 'Test laptop',
            'description': 'A test product.',
            'price': Decimal('100.00'),
            'stock': 2,
            'image': 'catalog/test.png',
            'category': self.category,
        }
        fields.update(changes)
        return Product(**fields)

    def test_strings_and_one_to_many_relation(self):
        product = self.product()
        product.save()
        other = self.product(name='Other laptop')
        other.save()
        self.assertEqual(str(self.category), 'Laptops')
        self.assertEqual(str(product), 'Test laptop')
        self.assertEqual(self.category.products.count(), 2)
        self.assertEqual(product.category, self.category)

    def test_negative_price_is_invalid(self):
        with self.assertRaises(ValidationError) as error:
            self.product(price=Decimal('-0.01')).full_clean()
        self.assertIn('price', error.exception.message_dict)

    def test_negative_stock_is_invalid(self):
        with self.assertRaises(ValidationError) as error:
            self.product(stock=-1).full_clean()
        self.assertIn('stock', error.exception.message_dict)

    def test_zero_price_and_stock_are_valid(self):
        self.product(price=Decimal('0.00'), stock=0).full_clean()

    def test_database_rejects_negative_price(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.product(price=Decimal('-0.01')).save()

    def test_database_rejects_negative_stock(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.product(stock=-1).save()

    def test_price_remains_decimal(self):
        product = self.product(price=Decimal('79.90'))
        product.save()
        product.refresh_from_db()
        self.assertIsInstance(product.price, Decimal)
        self.assertEqual(product.price, Decimal('79.90'))

    def test_price_rejects_extra_decimal_places(self):
        with self.assertRaises(ValidationError):
            self.product(price=Decimal('1.001')).full_clean()

    def test_used_category_is_protected(self):
        self.product().save()
        with self.assertRaises(ProtectedError):
            self.category.delete()
        self.assertEqual(Category.objects.count(), 1)
        self.assertEqual(Product.objects.count(), 1)

    def test_unused_category_can_be_deleted(self):
        self.category.delete()
        self.assertFalse(Category.objects.exists())

    def test_deleting_product_preserves_category(self):
        product = self.product()
        product.save()
        product.delete()
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

    def test_image_and_category_are_required(self):
        for changes, field in [({'image': ''}, 'image'),
                               ({'category': None}, 'category')]:
            with self.subTest(field=field):
                with self.assertRaises(ValidationError) as error:
                    self.product(**changes).full_clean()
                self.assertIn(field, error.exception.message_dict)


class CatalogSeedTests(TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        settings = override_settings(MEDIA_ROOT=directory.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.media = Path(directory.name)
        call_command('seed_catalog', stdout=StringIO())

    def test_expected_records_and_valid_relations(self):
        self.assertEqual(Category.objects.count(), 3)
        self.assertEqual(Product.objects.count(), 8)
        self.assertEqual(
            dict((item.name, item.products.count())
                 for item in Category.objects.all()),
            {'Laptops': 3, 'Accessories': 3, 'Monitors': 2},
        )
        for product in Product.objects.select_related('category'):
            product.full_clean()
            self.assertIn(product.category.name,
                          ['Laptops', 'Accessories', 'Monitors'])

    def test_all_images_are_real_png_files(self):
        for product in Product.objects.all():
            self.assertTrue(Path(product.image.path).is_file())
            self.assertTrue(product.image.url.startswith('/media/catalog/'))
            with Image.open(product.image.path) as image:
                self.assertEqual(image.format, 'PNG')
                self.assertEqual(image.size, (900, 600))
                image.verify()

    def test_seed_is_idempotent_in_database_and_storage(self):
        before = list(Product.objects.values_list('id', 'name', 'image'))
        files = sorted(path.relative_to(self.media).as_posix()
                       for path in self.media.rglob('*') if path.is_file())
        call_command('seed_catalog', stdout=StringIO())
        call_command('seed_catalog', stdout=StringIO())
        self.assertEqual(Category.objects.count(), 3)
        self.assertEqual(
            before, list(Product.objects.values_list('id', 'name', 'image'))
        )
        self.assertEqual(files, sorted(
            path.relative_to(self.media).as_posix()
            for path in self.media.rglob('*') if path.is_file()
        ))

    def test_seed_restores_missing_media(self):
        product = Product.objects.first()
        Path(product.image.path).unlink()
        call_command('seed_catalog', stdout=StringIO())
        self.assertTrue(Path(product.image.path).is_file())
        self.assertEqual(Product.objects.count(), 8)

    def test_seed_preserves_edits_and_unrelated_records(self):
        product = Product.objects.first()
        product.price = Decimal('123.45')
        product.save()
        Category.objects.create(name='Other')
        call_command('seed_catalog', stdout=StringIO())
        product.refresh_from_db()
        self.assertEqual(product.price, Decimal('123.45'))
        self.assertTrue(Category.objects.filter(name='Other').exists())


@override_settings(ALLOWED_HOSTS=['localhost', 'testserver'])
class CatalogAdminTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username='test_admin'
        )
        self.client.force_login(self.user)

    def test_models_are_registered_and_configured(self):
        category_admin = admin.site._registry[Category]
        product_admin = admin.site._registry[Product]
        self.assertIn('name', category_admin.list_display)
        self.assertIn('name', category_admin.search_fields)
        self.assertIn('category', product_admin.list_filter)
        for field in ['name', 'category', 'price', 'stock']:
            self.assertIn(field, product_admin.list_display)
        self.assertIn('name', product_admin.search_fields)

    def test_changelists_are_accessible(self):
        for resource in ['category', 'product']:
            response = self.client.get(f'/admin/catalog/{resource}/')
            self.assertEqual(response.status_code, 200)

    def test_admin_form_rejects_negative_price_and_stock(self):
        category = Category.objects.create(name='Laptops')
        request = RequestFactory().get('/admin/catalog/product/add/')
        request.user = self.user
        form_type = admin.site._registry[Product].get_form(request)
        form = form_type(data={
            'name': 'Invalid', 'description': 'Invalid test product.',
            'price': '-1.00', 'stock': '-1', 'category': category.pk,
        })
        self.assertFalse(form.is_valid())
        self.assertIn('price', form.errors)
        self.assertIn('stock', form.errors)
