#!/bin/bash
# iPad 2 Kiosk - Lancement du serveur (script d'autodémarrage)

echo "Démarrage de l'iPad 2 Kiosk Server..."

# Vérifier que Flask est installé
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Erreur : Flask n'est pas installé. Installez les dépendances :"
    echo "  pip3 install flask pillow requests xmltodict lxml"
    exit 1
fi

echo "Server démarrant sur http://localhost:8080"
echo "Accès pour iPad depuis l'IP locale de votre machine"

# Démarrer le serveur
cd "$(dirname "$0")/.."
python3 server.py
