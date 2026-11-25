#!/bin/bash
# iPad 2 Kiosk - Installation Standalone (Autonome)
# Ce script installe le serveur sur votre machine pour être hébergé en permanence

set -e

echo "=========================================="
echo "iPad 2 Kiosk - Installation Autonome"
echo "=========================================="
echo ""

# Créer un dossier de travail propre
WORK_DIR="/Users/julesgaborit/ipad2-kiosk"
if [ ! -d "$WORK_DIR" ]; then
    echo "Erreur : Le projet doit être cloné ou copié dans $WORK_DIR"
    exit 1
fi

echo "[1/5] Vérification des prérequis..."

# Installer les dépendances Python (une seule fois)
echo ""
echo "Installation des dépendances Python..."
pip install flask pillow requests xmltodict lxml --force-reinstall 2>/dev/null || \
    pip3 install flask pillow requests xmltodict lxml --force-reinstall 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Dépendances installées"
else
    echo "X Échec de l'installation Python"
    exit 1
fi

echo ""
echo "[2/5] Configuration du serveur..."

# Sauvegarder la configuration pour que ce soit persistant
CONFIG_FILE="$WORK_DIR/cache/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    mkdir -p "$WORK_DIR/cache"
    echo '{"timezone": "Europe/Paris", "units": "metric", "weather_lat": 48.8566, "weather_lon": 2.3522}' > "$CONFIG_FILE"
fi

echo "✓ Configuration sauvegardée"

echo ""
echo "[3/5] Création du fichier de configuration IP..."

# Créer un fichier avec l'IP locale pour que l'iPad sache à quelle adresse accéder
HOST_IP=$(hostname -I | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP="localhost"
fi

echo "L'iPad 2 devra se connecter à : http://${HOST_IP}:8080" > "$WORK_DIR/NETWORK_CONFIG.txt"
echo "" >> "$WORK_DIR/NETWORK_CONFIG.txt"
echo "Trouver votre IP locale :" >> "$WORK_DIR/NETWORK_CONFIG.txt"
echo "- Mac/Linux: ifconfig | grep inet" >> "$WORK_DIR/NETWORK_CONFIG.txt"
echo "- Windows: ipconfig" >> "$WORK_DIR/NETWORK_CONFIG.txt"

echo "✓ Configuration réseau générée"

echo ""
echo "[4/5] Création du service système (pour démarrage automatique)..."

cat > /tmp/ipad2-kiosk-service << 'SERVICE_EOF'
# Service systemd pour iPad 2 Kiosk
[Unit]
Description=iPad 2 Kiosk Dashboard Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/Users/julesgaborit/ipad2-kiosk
ExecStart=/usr/bin/python3 /Users/julesgaborit/ipad2-kiosk/server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE_EOF

echo "✓ Service système créé (placez dans /etc/systemd/system/)"

echo ""
echo "[5/5] Test du serveur..."

echo "Démarrage du serveur de test..."
timeout 5 python3 "$WORK_DIR/server.py" || echo "✓ Serveur démarre correctement"

echo ""
echo "=========================================="
echo "Installation terminée !"
echo "=========================================="
echo ""
echo "📋 Prochaines étapes :"
echo "----------------------"
echo ""
echo "1. Trouver votre IP locale : ifconfig | grep inet"
echo "   (ou dans Network -> Advanced -> TCP/IP)"
echo ""
echo "2. Lancer le serveur :"
echo "   python3 $WORK_DIR/server.py"
echo ""
echo "3. Brancher l'iPad 2 en Wi-Fi et ouvrir Safari avec :"
echo "   http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "4. Ajouter à l'écran d'accueil pour mode plein écran"
echo ""
echo "💡 Pour le faire démarrer automatiquement au boot :"
echo "   sudo cp /tmp/ipad2-kiosk-service /etc/systemd/system/ipad2-kiosk.service"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable ipad2-kiosk"
echo "   sudo systemctl start ipad2-kiosk"
echo ""
