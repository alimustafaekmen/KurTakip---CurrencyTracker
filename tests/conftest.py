"""
KurTakip - Test Ayarları / Test Configuration
Testlerin ortak ayarlarını içerir.
Contains shared settings for all tests.
"""

import sys
from pathlib import Path
import pytest

# Proje kök dizinini ekle / Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app import app as flask_app


@pytest.fixture
def app():
    """
    Flask uygulamasını test için hazırlar.
    Prepares the Flask app for testing.
    """
    flask_app.config['TESTING'] = True
    return flask_app


@pytest.fixture
def client(app):
    """
    Test istemcisi oluşturur (gerçek sunucu gerekmez).
    Creates a test client (no real server needed).

    Kullanım / Usage:
        def test_something(client):
            response = client.get('/api')
            assert response.status_code == 200
    """
    return app.test_client()
