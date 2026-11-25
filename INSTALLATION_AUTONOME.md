# iPad 2 Kiosk - Installation Autonome (100% Indépendant)

Ce guide installe le serveur directement sur l'iPad 2, sans dépendre du Mac.

---

## ⚠️ AVERTISSEMENT IMPORTANT

**iOS 9.x a des limitations sévères :**
- Ne supporte pas HTTPS/TLS 1.2+ (uniquement HTTP)
- Python 3 via Homebrew peut avoir des problèmes de certificats SSL
- Les requêtes vers des API externes peuvent être bloquées par le système

---

## 🎯 Solution Recommandée : Serveur Simplifié Offline

Pour garantir la compatibilité iOS 9.x, j'ai créé une version **complètement hors ligne** qui ne nécessite aucune requête externe en temps réel.

### Ce que l'iPad affichera (100% autonome) :
- ✅ Horloge numérique avec date
- ✅ Température fixe (configurable manuellement)
- ✅ Calendrier des événements (fichier JSON local)
- ✅ Informations système
- ❌ Météo en temps réel (non disponible sans API HTTP externe)
- ❌ Actualités RSS (bloqué par iOS 9.x pour raisons de sécurité)

---

## 📋 Étapes d'Installation

### Prérequis sur l'iPad 2 :
1. **WiFi fonctionnel** - Nécessaire pour installer les paquets Python une fois
2. **SSH accessible** - Pour installer Homebrew (si possible via Cydia)

### Option A : Via SSH + Homebrew (Recommandé)

```bash
# Depuis votre Mac, connectez-vous à l'iPad
ssh -p 22 root@IP_IPAD

# Installer Homebrew (une seule fois)
curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | sudo sh

# Installer Python 3 et dépendances
sudo brew install python3 pillow requests

# Transférer le code du projet sur l'iPad
cd /tmp && rm -rf iPad2-Kiosk
rsync -avz --delete ~/iPad2-Kiosk/ ipad@IP_IPAD:/home/root/

# Lancer le serveur
cd /home/root/iPad2-Kiosk
python3 server.py

# Pour démarrage automatique au boot, créez un PList (voir plus bas)
```

### Option B : Via FTP/File Transfer + Serveur Minimal (Plus compatible)

Créez un serveur Python minimal qui fonctionne en standalone avec Pillow seulement :

1. Transférer les fichiers HTML/CSS/JS manuellement sur l'iPad
2. Installer uniquement `Pillow` via pip
3. Utiliser des données pré-enregistrées (pas d'API externes)

---

## 📱 Configuration du PList (Démarrage Automatique)

Créez le fichier `/var/mobile/Library/LaunchDaemons/com.iPad2.kiosk.plist` sur l'iPad :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.iPad2.kiosk</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/home/root/iPad2-Kiosk/server.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/home/root/iPad2-Kiosk</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

---

## 🔧 Script d'installation simplifié (Fichier : `deploy-autonome.sh`)

J'ai créé un script pour installer automatiquement tout sur l'iPad.

### Pour utiliser ce script :

1. Ouvrez **Terminal** sur votre Mac
2. Exécutez depuis le dossier du projet :

```bash
cd /Users/julesgaborit/ipad2-kiosk
bash deploy-autonome.sh
```

3. Suivez les instructions pour connecter l'iPad

---

## ⚙️ Alternative : Mode Ultra-Léger (Si Python ne fonctionne pas)

Créez un serveur HTML statique pur, sans backend :

1. Mettez le dossier `ipad2-kiosk/` entier sur l'iPad
2. Utilisez un outil comme `python3 -m http.server 8080`
3. Ou installez `nginx` et servez le dossier static

---

## 📞 Support

Si vous rencontrez des problèmes d'installation Python sur iOS 9.x :
- Essayez de transférer les fichiers HTML/CSS/JS manuellement via SSH/FTP
- Utilisez un serveur HTTP simple pour servir les fichiers statiques
- Pré-enregistrez toutes les données (météo, calendrier) en local
