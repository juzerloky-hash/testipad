# iPad 2 Kiosk - Dashboard Intelligent

Transformez votre **iPad 2 (iOS 9.x)** en cadre photo et dashboard de monitoring local.

---

## 🎯 À Propos

Ce projet transforme votre ancien iPad 2 sous iOS 9.x en un écran intelligent dédié, affichant :

- ⏰ **Horloge numérique** avec date
- 🌤️ **Météo** en temps réel (température actuelle, max/min, conditions)
- 📅 **Calendrier** avec événements du jour
- 📰 **Actualités** depuis RSS feeds
- 💻 **Informations système**

**Compatible uniquement avec iOS 9.x** - Aucune technologie moderne non supportée.

---

## ⚙️ Contraintes Techniques

| Aspect | Valeur/Exigence |
|--------|-----------------|
| Navigateur | Safari iOS 9.x (WebKit 7.0) |
| JavaScript | ES5 uniquement (pas de `const`, `let`, `=>`, `fetch`) |
| CSS | Flexbox avec préfixes `-webkit-` (pas de Grid) |
| Réseau | HTTP uniquement (pas de TLS 1.2+) |
| Résolution | 1024×768 pixels |
| Backend | Python Flask ou Node.js Express |

---

## 🚀 Installation

### Prérequis

- **Python 3.6+** (pour Flask)
- **PIL/Pillow** (pour compression d'images)
- Un iPad 2 sous iOS 9.x avec un navigateur web accessible via IP local

### Installer les dépendances Python

```bash
pip install flask pillow requests xmltodict lxml
```

### Lancer le serveur

```bash
cd ipad2-kiosk
python server.py
```

Le serveur démarrera sur `http://localhost:8080` (ou l'adresse IP de votre machine).

---

## 📱 Configuration sur iPad 2

1. **Trouvez l'IP locale de votre machine**
   - Mac/Linux : `ifconfig | grep inet` ou `ip addr show`
   - Windows : `ipconfig`

2. **Accédez au dashboard depuis Safari sur l'iPad**
   - Tapez : `http://YOUR_IP_ADDRESS:8080`

3. **Ajouter à l'écran d'accueil (Full Screen)**
   - Ouvrez le dashboard dans Safari
   - Appuyez sur le bouton "Partager" (carré avec flèche)
   - Choisissez **"Sur l'écran d'accueil"**
   - L'app s'ouvrira en plein écran sans barre d'adresse

---

## ⚙️ Personnalisation

### 1. Configuration Météo

Edit `/cache/config.json` :

```json
{
    "weather_lat": 48.8566,      // Latitude (Paris par défaut)
    "weather_lon": 2.3522,       // Longitude
    "city": "paris"              // Paris, london, berlin, rome, madrid
}
```

**Cohonnées GPS de villes populaires :**
- `paris` : 48.8566, 2.3522
- `london` : 51.5074, -0.1278
- `berlin` : 52.5200, 13.4050
- `rome` : 41.9028, 12.4964
- `madrid` : 40.4168, -3.7038

### 2. Unités de température

Via le bouton **Settings** (⚙) en bas à droite :

- **Métrique** : degrés Celsius (°C)
- **Impérial** : degrés Fahrenheit (°F)

### 3. Feeds d'actualités

Éditez `config.json` ou via l'interface :

```json
{
    "news_feeds": [
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://www.theguardian.com/us/rss/top_stories.rss"
    ]
}
```

### 4. Calendrier

Pour un calendrier dynamique, créez un fichier `calendar.json` dans `/cache/` :

```json
{
    "upcoming": [
        {
            "title": "Réunion hebdomadaire",
            "date": "2026-11-23",
            "time": "10:00",
            "location": "Salle de réunion"
        }
    ],
    "last_updated": "2026-11-21 14:30"
}
```

---

## 🏗️ Architecture

```
ipad2-kiosk/
├── server.py                  # Serveur Flask principal
├── templates/
│   └── index.html            # Page HTML principale (dashboard)
├── static/
│   ├── css/
│   │   └── styles.css        # Styles ES5 compatibles iOS 9.1
│   ├── js/
│   │   ├── app.js            # Application principale
│   │   ├── weather.js        # Module météo (Open-Meteo API)
│   │   ├── calendar.js       # Module calendrier
│   │   └── news.js           # Module actualités RSS
│   └── images/
│       ├── logo.png          # Image logo
│       └── weather-icons.svg # Icônes météo vectorielles
├── cache/
│   ├── config.json           # Configuration personnalisée
│   └── calendar.json         # Données calendrier (optionnel)
└── README.md                 # Documentation

```

---

## 🔄 Fonctionnalités

| Composant | Fraye de mise à jour | API Source |
|-----------|---------------------|------------|
| Horloge | 1 seconde | Système local |
| Météo | 3 minutes | Open-Meteo (HTTP) |
| Calendrier | 5 minutes | Fichier JSON ou Google Calendar |
| Actualités | 10 minutes | RSS feeds (HTTP) |
| Statut système | 2 minutes | Serveur local |

---

## 🛠️ Développement

### Modifier le dashboard

Editez `/templates/index.html` - la structure est modulaire :

```html
<section class="clock-section">...</section>
<section class="weather-section">...</section>
<section class="calendar-section">...</section>
<section class="news-section">...</section>
<section class="system-section">...</section>
```

### Ajouter une nouvelle section

1. Créer un module JS dans `/static/js/`
2. Appeler via AJAX le serveur API
3. Afficher dans l'interface HTML

### API du serveur (`server.py`)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/weather` | GET | Récupère données météo |
| `/api/calendar` | GET | Récupère événements calendrier |
| `/api/news` | GET | Récupère actualités RSS |
| `/api/system` | GET | Informations système |
| `/api/config` | GET | Configuration personnalisée |
| `/api/save-config` | POST | Sauvegarde config |

---

## 🐛 Dépannage

### Dashboard ne charge pas

- Vérifiez que **Python est installé** (`python --version`)
- Vérifiez les erreurs Flask dans le terminal
- Assurez-vous d'accéder via `http://` et non `https://` (pas de TLS 1.2+ sur iOS 9)

### Météo ne s'affiche pas

- Vérifiez que l'API Open-Meteo est accessible
- Testez avec : `curl http://localhost:8080/api/weather`
- Vérifiez les paramètres (lat/lon) dans `config.json`

### Actualités ne chargent pas

- iOS 9.x bloque souvent la requête XML externe à cause de CORS
- Solution : ajouter le domaine du RSS dans les exceptions CORS si vous modifiez le serveur

---

## 📦 Déploiement Production

### Sur un Raspberry Pi / VPS

```bash
# Installer pip sur le système si nécessaire
pip install flask pillow requests xmltodict lxml

# Lancer en arrière-plan
nohup python server.py > server.log 2>&1 &

# Ou avec systemd (Linux)
sudo systemctl start ipad2-kiosk
sudo systemctl enable ipad2-kiosk
```

### Accéder depuis la maison

1. Activer **IP Publique** sur votre routeur ou utiliser un reverse proxy
2. Trouver l'IP publique de votre machine (`whatismyip.com`)
3. Configurer le firewall pour autoriser le port 8080

---

## 🎨 Personnalisation Visuelle

### Changer les couleurs

Éditez `/static/css/styles.css` :

```css
/* Fond principal */
html, body {
    background-color: #1a1a2e;  /* Changez cette couleur */
}

/* Carte horloge (gradient) */
.clock-container {
    background: linear-gradient(135deg, rgba(99,102,241,0.8) 0%, ...);
}
```

### Ajouter un fond d'écran

Créez une image au format **1024×768** et remplacez :

```css
html, body {
    background: url('/static/images/background.png') no-repeat center center;
    background-size: cover;
}
```

---

## 📞 Support & Contributions

Ce projet est open source. N'hésitez pas à contribuer !

---

## 📝 Licence

MIT License - Libre d'utiliser et modifier.

---

**Version : 1.0.0** | **Compatible iOS 9.x uniquement**
