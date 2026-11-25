/* iPad 2 Kiosk - Module Système (ES5 compatible) */

var SystemModule = {
    config: {
        refreshInterval: 60000, // 1 minute
        version: '1.0.0'
    },

    /* Récupérer les informations système via AJAX */
    fetchSystemInfo: function(callback) {
        var that = this;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/system', true);
        xhr.timeout = 10000;

        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    that.displaySystemInfo(data);
                    callback(data, true);
                } catch (e) {
                    console.error('Erreur parsing système:', e);
                    callback(null, false);
                }
            } else {
                console.error('Erreur HTTP ' + xhr.status);
                callback(null, false);
            }
        });

        xhr.addEventListener('error', function() {
            console.error('Erreur réseau système');
            callback(null, false);
        });

        xhr.send();
    },

    /* Formater le temps */
    formatTime: function(date) {
        var hours = date.getHours().toString().padStart(2, '0');
        var minutes = date.getMinutes().toString().padStart(2, '0');
        return hours + ':' + minutes;
    },

    /* Formater la date */
    formatDate: function(date) {
        var days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        var months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        return days[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    },

    /* Afficher les informations système */
    displaySystemInfo: function(data) {
        var that = this;

        if (data && data.uptime) {
            document.getElementById('uptime').textContent = 'Démarré : ' + data.uptime;
        }

        if (data && data.version) {
            document.getElementById('version').textContent = 'Version : ' + data.version;
        }

        // Horloge système
        var now = new Date();
        document.getElementById('clock-sync').textContent = 'Horloge synchro : ' + that.formatTime(now);
    },

    /* Afficher l'heure actuelle mise à jour */
    updateTimeDisplay: function() {
        var now = new Date();
        var timeStr = this.formatTime(now);

        // Mettre à jour toutes les horloges de l'interface
        var allClocks = document.querySelectorAll('.clock-time, .date-display');
        for (var i = 0; i < allClocks.length; i++) {
            if (!allClocks[i].textContent.includes(':')) continue; // Ne pas toucher aux éléments statiques
            allClocks[i].textContent = timeStr;
        }
    },

    /* Initialiser le module */
    init: function() {
        var that = this;

        // Charger la configuration si disponible
        if (typeof Config !== 'undefined' && Config.refreshInterval) {
            that.config.refreshInterval = Config.refreshInterval;
        }

        // Premier chargement immédiat
        this.fetchSystemInfo(this.displaySystemInfo);

        // Mettre à jour l'heure en continu
        setInterval(function() {
            that.updateTimeDisplay();
        }, 1000);

        // Définir l'intervalle de rafraîchissement du système
        if (typeof setInterval !== 'undefined') {
            setInterval(that.fetchSystemInfo.bind(that), that.config.refreshInterval);
        }

        return that;
    }
};

// Exporter pour usage externe
var System = SystemModule.init();
