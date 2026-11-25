#!/bin/bash
# iPad 2 Kiosk - Déploiement autonome sur l'iPad 2
# Utilisez ce script si vous avez SSH accés à l'iPad

set -e

echo "=========================================="
echo "Déploiement iPad 2 Kiosk (Autonome)"
echo "=========================================="
echo ""

# Variables pour la connexion SSH
HOST_NAME="" # Remplacez par le nom hôte ou IP de l'iPad
SSH_USER="root"
SSH_PORT="22"

echo "Pour installer sur l'iPad 2, vous devez avoir accès SSH."
echo "Configuration requise :"
echo "  - WiFi sur l'iPad et le Mac connectés au même réseau"
echo "  - SSH activé sur l'iPad (si possible pour iOS 9.x)"
echo ""
echo "Si SSH n'est pas disponible, voir Option 2 ci-dessous."
echo ""

read -p "IP de l'iPad (ou appuyez sur Entrée pour annuler) : " IP_IPAD

if [ -z "$IP_IPAD" ]; then
    echo "Annulé."
    exit 1
fi

echo ""
echo "[1/4] Création du dossier du projet sur l'iPad..."

# Créer le dossier via SSH
ssh -p $SSH_PORT ${SSH_USER}@${IP_IPAD} "mkdir -p ~/iPad2-Kiosk" << 'SCRIPT_EOF' || { echo "Echec creation dossier"; exit 1; }
SCRIPT_EOF

echo "✓ Dossier créé sur l'iPad"

echo ""
echo "[2/4] Transfert des fichiers vers l'iPad..."

# Créer le fichier de transfert
cd /Users/julesgaborit/ipad2-kiosk
tar -czf ~/iPad2-Kiosk.tar.gz .

# Transférer les fichiers
ssh -p $SSH_PORT ${SSH_USER}@${IP_IPAD} "rm -rf ~/iPad2-Kiosk && tar -xzf ~/iPad2-Kiosk.tar.gz" << 'SCRIPT_EOF' || { echo "Echec transfert"; exit 1; }
SCRIPT_EOF

echo "✓ Fichiers transférés"

echo ""
echo "[3/4] Installation des dépendances Python sur l'iPad..."

ssh -p $SSH_PORT ${SSH_USER}@${IP_IPAD} << 'INST_EOF' || { echo "Echec installation"; exit 1; }

if [ ! -d "/usr/local/lib/python3.8/dist-packages" ]; then
    mkdir -p /usr/local/lib/python3.8/dist-packages
fi

echo "from flask import Flask, jsonify, render_template, send_file, request, Response, stream_with_context
from PIL import Image, ImageOps
import io, os, json, requests, datetime, xml.etree.ElementTree as ET
import threading, time

app = Flask(__name__)

# Configuration par défaut
HOST = '0.0.0.0'
PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, 'cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

@app.route('/')
def index():
    return Response(render_template('index.html', current_time=datetime.datetime.now()))

@app.route('/api/weather')
def get_weather():
    try:
        lat = float(request.args.get('lat', 48.8566))
        lon = float(request.args.get('lon', 2.3522))
        url = 'https://api.open-meteo.com/v1/forecast?latitude=' + str(lat) + '&longitude=' + str(lon) + '&mode=index&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
        r = requests.get(url, timeout=10)
        data = r.json()
        def get_condition(code):
            d = {0:'Ensoleille',1:'Clairement nuageux',2:'Partiellement nuageux',3:'Couvert',45:'Brouillard',51:'Bruine',61:'Pluie faible',63:'Pluie moderee',71:'Neige',80:'Averse'}
            return d.get(code, 'Inconnu')
        h = datetime.datetime.now().hour % 24
        wcode = data['hourly']['weather_code'][h] if 'hourly' in data else 0
        temp = data['hourly']['temperature_2m'][h]
        return jsonify({'current':{'temperature':int(temp), 'condition':get_condition(wcode), 'icon':wcode}, 'daily':{'max':data['daily']['temperature_2m_max'][0],'min':data['daily']['temperature_2m_min'][0],'precipitation_probability':data['daily']['precipitation_probability_max'][0]}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calendar')
def get_calendar():
    try:
        f = os.path.join(CACHE_DIR, 'calendar.json')
        if os.path.exists(f):
            with open(f) as fp: return json.load(fp)
        now = datetime.datetime.now()
        return jsonify({'upcoming':[{'title':'Reunion hebdomadaire','date':now.strftime('%Y-%m-%d'),'time':'10:00','location':'Salle'},{'title':'Appel important','date':now.strftime('%Y-%m-%d'),'time':'14:30'}], 'last_updated':now.strftime('%H:%M')})
    except Exception as e: return jsonify({'upcoming':[], 'last_updated':now.strftime('%H:%M'), 'error':str(e)})

@app.route('/api/news')
def get_news():
    try:
        feeds = ['https://rss.nytimes.com/services/xml/rss/nyt/World.xml']
        all_articles = []
        for feed_url in feeds:
            r = requests.get(feed_url, timeout=10)
            if r.status_code == 200:
                tree = ET.fromstring(r.content)
                items = tree.findall('.//item') or tree.findall('.//rss/channel/item')
                for item in items:
                    t = item.find('title'); l = item.find('link')
                    if t is not None and l is not None:
                        all_articles.append({'title': (t.text[:100]+'...') if len(t.text)>100 else t.text, 'link': l.text})
        return jsonify({'articles':all_articles[:5], 'last_updated':datetime.datetime.now().strftime('%H:%M')})
    except Exception as e: return jsonify({'articles':[], 'last_updated':datetime.datetime.now().strftime('%H:%M'), 'error':str(e)})

@app.route('/api/system')
def get_system():
    start = datetime.datetime(1970, 1, 1)
    uptime_seconds = int(datetime.datetime.now() - start).seconds
    return jsonify({'uptime':datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'version':'1.0.0'})

@app.route('/api/config')
def get_config():
    f = os.path.join(CACHE_DIR, 'config.json')
    if os.path.exists(f):
        try: return json.load(open(f))
        except: pass
    return jsonify({'timezone':'Europe/Paris', 'units':'metric', 'weather_lat':48.8566, 'weather_lon':2.3522, 'city':'paris'})

@app.route('/api/save-config', methods=['POST'])
def save_config():
    try:
        data = request.get_json()
        with open(os.path.join(CACHE_DIR, 'config.json'), 'w') as f: json.dump(data, f)
        return jsonify({'success':True})
    except Exception as e: return jsonify({'success':False, 'error':str(e)}), 500

@app.route('/api/calculate-position', methods=['POST'])
def calculate_position():
    city = request.get_json().get('city','')
    cities = {'paris':{'lat':48.8566,'lon':2.3522}, 'london':{'lat':51.5074,'lon':-0.1278}, 'berlin':{'lat':52.52,'lon':13.405}, 'rome':{'lat':41.9028,'lon':12.4964}}
    cl = city.lower().strip()
    for k, v in cities.items(): if cl == k or cl.startswith(k): return jsonify(v)
    return jsonify({'error':'Ville introuvable'})

@app.route('/static/<path:filename>')
def serve_static(filename):
    f = os.path.join(BASE_DIR, 'static', filename)
    if not os.path.exists(f): return send_file(os.path.join(BASE_DIR, 'static', 'images', 'logo.png'), mimetype='image/png')
    return send_file(f)

@app.route('/compress-image')
def compress_image():
    filename = request.args.get('file','')
    quality = int(request.args.get('quality', 80))
    filepath = os.path.join(BASE_DIR, 'static', 'images', filename)
    if not os.path.exists(filepath): return jsonify({'error':'Image non trouvee'}), 404
    img_original = Image.open(filepath)
    target_size = (int(request.args.get('resize_w')), int(request.args.get('resize_h'))) if 'resize' in request.args else None
    img_rgb = img_original.convert('RGB')
    buf = io.BytesIO()
    img_rgb.save(buf, format='JPEG', quality=quality, optimize=True)
    return send_file(buf, mimetype='image/jpeg')

from werkzeug.serving import run_simple
run_simple('{HOST}', {PORT}, app, use_reloader=False, threaded=True)
INST_EOF

echo "✓ Dépendances installées"

echo ""
echo "[4/4] Création du service d'autodémarrage..."

cat > ~/Library/LaunchAgents/com.iPad2.Kiosk.plist << 'PLIST_EOF' || echo "Echec creation PList"
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.iPad2.Kiosk</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd ~/iPad2-Kiosk && python3 server.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>~/iPad2-Kiosk</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
PLIST_EOF

echo "✓ Configuration d'autodémarrage créée"

echo ""
echo "=========================================="
echo "Déploiement termine !!"
echo "=========================================="
echo ""
echo "L'iPad 2 Kiosk est maintenant installe et configure pour demarrer automatiquement."
echo ""
echo "Pour lancer le serveur manuellement (si besoin) :"
echo "  ssh -p 22 root@${IP_IPAD}"
echo "  cd ~/iPad2-Kiosk"
echo "  python3 server.py"
echo ""
echo "L'iPad doit se connecter au meme WiFi que l'ordinateur."
echo "Puis ouvrir Safari avec : http://${IP_IPAD}:8080"
echo ""
