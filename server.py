#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
iPad 2 Kiosk Server - Flask serveur léger pour dashboard intelligent
Compatible avec iOS 9.1 (HTTP uniquement, sans TLS 1.2+)
"""

from flask import Flask, render_template, jsonify, send_file, request
from PIL import Image
import io
import os
import json
import requests
from datetime import datetime
import xml.etree.ElementTree as ET

app = Flask(__name__)

# Configuration
HOST = '0.0.0.0'
PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
CACHE_DIR = os.path.join(BASE_DIR, 'cache')

# Création du dossier cache s'il n'existe pas
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

@app.route('/')
def index():
    """Page principale - dashboard complet"""
    return render_template('index.html', current_time=datetime.now())

@app.route('/api/weather')
def get_weather():
    """
    Récupère la météo depuis Open-Meteo (gratuit, pas d'API key requise, HTTP)
    Compatible avec iOS 9.1
    """
    try:
        # Coordonnées par défaut (Paris - modifiable dans config)
        latitude = request.args.get('lat', 48.8566)
        longitude = request.args.get('lon', 2.3522)

        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            'latitude': latitude,
            'longitude': longitude,
            'mode': 'index',
            'daily': 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            'hourly': 'temperature_2m,weather_code'
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Code météo WMO
        def get_weather_condition(code):
            conditions = {
                0: {'icon': 'clear-day', 'text': 'Ensoleillé'},
                1: {'icon': 'clear-night', 'text': 'Clairement nuageux'},
                2: {'icon': 'partly-cloudy-day', 'text': 'Partiellement nuageux'},
                3: {'icon': 'cloudy', 'text': 'Couvert'},
                45: {'icon': 'fog', 'text': 'Brouillard'},
                48: {'icon': 'fog', 'text': 'Brouillard givrant'},
                51: {'icon': 'rain', 'text': 'Bruine légère'},
                53: {'icon': 'rain', 'text': 'Bruine modérée'},
                55: {'icon': 'rain', 'text': 'Bruine forte'},
                61: {'icon': 'rain', 'text': 'Pluie légère'},
                63: {'icon': 'rain', 'text': 'Pluie modérée'},
                65: {'icon': 'rain', 'text': 'Pluie forte'},
                71: {'icon': 'snow', 'text': 'Neige légère'},
                73: {'icon': 'snow', 'text': 'Neige modérée'},
                75: {'icon': 'snow', 'text': 'Neige forte'},
                77: {'icon': 'snow', 'text': 'Grêle'},
                80: {'icon': 'rain', 'text': 'Averses légères'},
                81: {'icon': 'rain', 'text': 'Averses modérées'},
                82: {'icon': 'rain', 'text': 'Averse violente'},
                85: {'icon': 'snow', 'text': 'Averse de neige légère'},
                86: {'icon': 'snow', 'text': 'Averse de neige forte'},
            }
            return conditions.get(code, {'icon': 'cloudy', 'text': 'Inconnu'})

        # Heure actuelle
        now = datetime.now()
        hour_idx = now.hour % 24

        if 'hourly' in data:
            hourly = data['hourly']
            weather_code = hourly.get('weather_code', [0])[min(hour_idx, len(hourly) - 1)]
            temp_current = hourly.get('temperature_2m', [0])[min(hour_idx, len(hourly) - 1)]
        else:
            weather_code = 0
            temp_current = 20

        current_condition = get_weather_condition(weather_code)

        daily = data.get('daily', {})
        temps_max = daily.get('temperature_2m_max', [20])[0]
        temps_min = daily.get('temperature_2m_min', [10])[0]
        precip_prob = daily.get('precipitation_probability_max', [0])[0]

        # Conversion Celsius vers Fahrenheit si nécessaire
        def celsius_to_fahr(c):
            return int(round((c * 9/5) + 32))

        result = {
            'current': {
                'temperature': celsius_to_fahr(temp_current),
                'condition': current_condition['text'],
                'icon': current_condition['icon']
            },
            'daily': {
                'max': celsius_to_fahr(temps_max),
                'min': celsius_to_fahr(temps_min),
                'precipitation_probability': precip_prob
            }
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calendar')
def get_calendar():
    """
    Récupère les événements de la Google Calendar (configuration requise)
    Fallback vers calendrier statique si pas de config
    """
    try:
        # Lecture des données depuis un JSON local ou fichier distant
        events_file = os.path.join(CACHE_DIR, 'calendar.json')

        if os.path.exists(events_file):
            with open(events_file, 'r') as f:
                events = json.load(f)
        else:
            # Calendrier par défaut
            events = {
                'upcoming': [
                    {
                        'title': 'Réunion hebdomadaire',
                        'date': '2026-11-23',
                        'time': '10:00',
                        'location': 'Salle de réunion'
                    },
                    {
                        'title': 'Appel important',
                        'date': '2026-11-24',
                        'time': '14:30',
                        'location': ''
                    }
                ],
                'today': {}
            }

        # Calculer le nombre de jours à venir
        import time
        now = time.time()
        events['last_updated'] = datetime.now().strftime('%H:%M')

        return jsonify(events)

    except Exception as e:
        # Fallback sécurisé
        return jsonify({
            'upcoming': [],
            'today': {},
            'last_updated': datetime.now().strftime('%H:%M'),
            'error': str(e)
        })

@app.route('/api/news')
def get_news():
    """
    Récupère les actualités depuis RSS feeds compatibles HTTP
    """
    try:
        # Feeds RSS par défaut (HTTP seulement pour compatibilité iOS 9)
        feeds = [
            'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
            'https://www.theguardian.com/us/rss/top_stories.rss'
        ]

        all_articles = []

        for feed_url in feeds:
            try:
                response = requests.get(feed_url, timeout=10)
                response.raise_for_status()

                # Parsing XML RSS
                root = ET.fromstring(response.content)
                namespace = {'rss': 'http://www.w3.org/2005/Atom',
                             'media': 'http://search.creativecommons.org/rss-media-schema'}

                items = root.findall('.//rss/channel/item') or \
                         root.findall('.//item')

                for item in items:
                    title = item.find('title')
                    link = item.find('link')
                    pub_date = item.find('pubDate')

                    if title is not None and link is not None:
                        article = {
                            'title': title.text[:100] + '...' if len(title.text) > 100 else title.text,
                            'link': link.text,
                            'published': pub_date.text if pub_date is not None else ''
                        }
                        all_articles.append(article)
            except:
                continue

        # Garder les 5 derniers articles
        result = {
            'articles': all_articles[:5],
            'last_updated': datetime.now().strftime('%H:%M')
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'articles': [],
            'last_updated': datetime.now().strftime('%H:%M'),
            'error': str(e)
        })

@app.route('/api/system')
def get_system_info():
    """Récupère les informations système"""
    return jsonify({
        'uptime': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'version': '1.0.0'
    })

@app.route('/api/config')
def get_config():
    """Récupère la configuration personnalisable"""
    config_file = os.path.join(CACHE_DIR, 'config.json')

    default_config = {
        'timezone': 'Europe/Paris',
        'units': 'metric',
        'calendar_url': None,
        'news_feeds': [
            'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'
        ],
        'weather_lat': 48.8566,
        'weather_lon': 2.3522
    }

    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                return jsonify(json.load(f))
        except:
            pass

    return jsonify(default_config)

@app.route('/api/save-config', methods=['POST'])
def save_config():
    """Sauvegarde une configuration personnalisée"""
    try:
        data = request.get_json()

        config_file = os.path.join(CACHE_DIR, 'config.json')
        with open(config_file, 'w') as f:
            json.dump(data, f, indent=2)

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/calculate-position', methods=['POST'])
def calculate_position():
    """Calcule les coordonnées GPS à partir de la ville"""
    data = request.get_json() or {}
    city = data.get('city', '')

    # Base de données de villes (JSON simple, pas d'API)
    cities_coords = {
        'paris': {'lat': 48.8566, 'lon': 2.3522},
        'london': {'lat': 51.5074, 'lon': -0.1278},
        'berlin': {'lat': 52.5200, 'lon': 13.4050},
        'rome': {'lat': 41.9028, 'lon': 12.4964},
        'madrid': {'lat': 40.4168, 'lon': -3.7038},
        'lisa': {'lat': 50.9375, 'lon': 4.3823}
    }

    city_lower = city.lower().strip()
    for key, coords in cities_coords.items():
        if city_lower == key or city_lower.startswith(key):
            return jsonify(coords)

    return jsonify({'error': 'Ville introuvable'})

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Sert les fichiers statiques"""
    filepath = os.path.join(STATIC_DIR, filename)

    if not os.path.exists(filepath):
        return send_file(os.path.join(BASE_DIR, 'static', 'images', 'logo.png'),
                        mimetype='image/png')

    return send_file(filepath)

@app.route('/compress-image')
def compress_image():
    """Compresse une image et la sert"""
    filename = request.args.get('file', '')
    quality = request.args.get('quality', 80)

    filepath = os.path.join(STATIC_DIR, 'images', filename)

    if not os.path.exists(filepath):
        return jsonify({'error': 'Image non trouvée'}), 404

    try:
        # Ouvrir l'image originale
        img_original = Image.open(filepath)

        # Redimensionner si nécessaire (pour iPad 2 - 1024x768)
        target_size = None
        if 'resize' in request.args:
            target_size = (int(request.args.get('resize_w')), int(request.args.get('resize_h')))

        # Convertir en RGBA et optimiser
        img_rgb = img_original.convert('RGB')
        img_optimized = Image.new('RGBA', img_rgb.size, (255, 255, 255))
        img_optimized.paste(img_rgb, mask=img_rgb)

        # Compression avec la qualité demandée
        buf = io.BytesIO()
        img_optimized.save(buf, format='JPEG', quality=int(quality), optimize=True)

        return send_file(buf, mimetype='image/jpeg')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("iPad 2 Kiosk Server - Démarrage...")
    print("Accéder à : http://localhost:8080")
    app.run(host=HOST, port=PORT, debug=False, threaded=True)
