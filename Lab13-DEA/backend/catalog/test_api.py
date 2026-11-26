from io import BytesIO
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from .models import Category, Product


def upload(name='test-product.png'):
    buffer = BytesIO()
    Image.new('RGB', (32, 24), '#2563eb').save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), 'image/png')


@override_settings(ALLOWED_HOSTS=['localhost', 'testserver'])
class CatalogAPITests(APITestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        settings = override_settings(MEDIA_ROOT=directory.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.category = Category.objects.create(
            name='Test Laptops', description='Temporary laptop category.'
        )
        self.other = Category.objects.create(name='Test Accessories')
        self.product = Product.objects.create(
            name='Test Laptop', description='Temporary test laptop.',
            price='1999.90', stock=4, category=self.category, image=upload(),
        )

    def payload(self, **changes):
        fields = {
            'name': 'New Laptop', 'description': 'Temporary new laptop.',
            'price': '2499.90', 'stock': 10,
            'category_id': self.category.pk,
        }
        fields.update(changes)
        return fields

    def test_category_list_and_detail(self):
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)
        detail = self.client.get(f'/api/categories/{self.category.pk}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(dict(detail.data), {
            'id': self.category.pk, 'name': self.category.name,
            'description': self.category.description,
        })

    def test_category_create_patch_put_and_delete(self):
        response = self.client.post('/api/categories/', {
            'name': 'Temporary', 'description': 'Initial',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        url = f'/api/categories/{response.data["id"]}/'
        response = self.client.patch(url, {'description': 'Patched'}, 'json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['description'], 'Patched')
        response = self.client.put(url, {
            'name': 'Replaced', 'description': 'Complete',
        }, 'json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Replaced')
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_category_validation(self):
        for data in [{}, {'name': ''}, {'name': self.category.name}]:
            with self.subTest(data=data):
                response = self.client.post('/api/categories/', data, 'json')
                self.assertEqual(response.status_code, 400)
                self.assertIn('name', response.data)

    def assert_product_shape(self, data):
        self.assertEqual(set(data), {
            'id', 'name', 'description', 'price', 'stock', 'image', 'category',
        })
        self.assertEqual(dict(data['category']), {
            'id': self.category.pk, 'name': self.category.name,
            'description': self.category.description,
        })
        self.assertEqual(data['price'], '1999.90')
        self.assertTrue(data['image'].startswith('http://testserver/media/'))

    def test_product_list_has_full_nested_category(self):
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assert_product_shape(response.data['results'][0])

    def test_product_detail_has_full_nested_category(self):
        response = self.client.get(f'/api/products/{self.product.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assert_product_shape(response.data)

    def test_product_create_with_multipart_image_and_category_id(self):
        response = self.client.post('/api/products/', self.payload(
            image=upload('created.png'), category_id=self.other.pk,
        ), format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['category']['id'], self.other.pk)
        self.assertNotIn('category_id', response.data)
        product = Product.objects.get(pk=response.data['id'])
        with Image.open(product.image.path) as image:
            image.verify()

    def test_nonexistent_category_is_rejected(self):
        response = self.client.patch(
            f'/api/products/{self.product.pk}/',
            {'category_id': 999999}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('category_id', response.data)

    def test_category_id_is_required_on_creation(self):
        data = self.payload(image=upload())
        del data['category_id']
        response = self.client.post('/api/products/', data, 'multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('category_id', response.data)

    def test_nested_category_is_read_only(self):
        response = self.client.patch(
            f'/api/products/{self.product.pk}/',
            {'category': {'id': self.other.pk, 'name': 'Overwrite'}}, 'json',
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.category.refresh_from_db()
        self.assertEqual(self.product.category_id, self.category.pk)
        self.assertEqual(self.category.name, 'Test Laptops')

    def test_negative_price_and_stock_are_rejected(self):
        for field, value in [('price', '-0.01'), ('stock', -1)]:
            with self.subTest(field=field):
                response = self.client.patch(
                    f'/api/products/{self.product.pk}/',
                    {field: value}, 'json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_zero_price_and_stock_are_allowed(self):
        response = self.client.patch(
            f'/api/products/{self.product.pk}/',
            {'price': '0.00', 'stock': 0}, 'json',
        )
        self.assertEqual(response.status_code, 200)

    def test_invalid_image_is_rejected(self):
        response = self.client.post('/api/products/', self.payload(
            image=SimpleUploadedFile('broken.png', b'not a PNG', 'image/png'),
        ), 'multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.data)
        self.assertEqual(Product.objects.count(), 1)

    def test_image_is_required_on_creation(self):
        response = self.client.post('/api/products/', self.payload(), 'json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.data)

    def test_patch_without_image_preserves_original(self):
        image_name = self.product.image.name
        response = self.client.patch(
            f'/api/products/{self.product.pk}/',
            {'price': '2199.90', 'category_id': self.other.pk}, 'json',
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.image.name, image_name)
        self.assertEqual(self.product.category_id, self.other.pk)

    def test_put_without_image_preserves_original(self):
        image_name = self.product.image.name
        response = self.client.put(
            f'/api/products/{self.product.pk}/', self.payload(), 'json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.image.name, image_name)

    def test_multipart_update_replaces_image(self):
        old_image = self.product.image.name
        response = self.client.patch(
            f'/api/products/{self.product.pk}/',
            {'image': upload('replacement.png')}, 'multipart',
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertNotEqual(self.product.image.name, old_image)

    def test_product_delete(self):
        url = f'/api/products/{self.product.pk}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b'')
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

    def test_protected_category_returns_409_not_500(self):
        response = self.client.delete(f'/api/categories/{self.category.pk}/')
        self.assertEqual(response.status_code, 409)
        self.assertIn('detail', response.data)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    def test_missing_resources_return_404(self):
        for resource in ['categories', 'products']:
            for method in ['get', 'patch', 'put', 'delete']:
                with self.subTest(resource=resource, method=method):
                    response = getattr(self.client, method)(
                        f'/api/{resource}/999999/'
                    )
                    self.assertEqual(response.status_code, 404)

    def test_list_uses_two_queries_independent_of_product_count(self):
        for count in [1, 12]:
            Product.objects.bulk_create([
                Product(name=f'Temporary {count}-{index}', description='Test',
                        price='10.00', stock=1, category=self.category,
                        image='catalog/test.png')
                for index in range(count)
            ])
            with self.assertNumQueries(2):
                response = self.client.get('/api/products/')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.data['results']), 5
                                 if count == 12 else 2)

    def test_browsable_api_and_inherited_routes(self):
        for resource in ['categories', 'products', 'exams',
                         'questions', 'options']:
            response = self.client.get(f'/api/{resource}/')
            self.assertEqual(response.status_code, 200)
        for resource in ['categories', 'products']:
            response = self.client.get(
                f'/api/{resource}/', HTTP_ACCEPT='text/html'
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn('text/html', response['Content-Type'])
