/* iPad 2 Kiosk - Application Principale (ES5 compatible) */

var App = {
    config: {
        timezone: 'Europe/Paris',
        units: 'metric',
        weatherLat: 48.8566,
        weatherLon: 2.3522,
        city: 'paris'
    },

    /* Charger la configuration depuis le serveur */
    loadConfig: function(callback) {
        var that = this;

        if (typeof fetch !== 'undefined') {
            // ES6+ : utiliser fetch si disponible
            fetch('/api/config')
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data && typeof data === 'object') {
                        that.updateConfigFromServer(data);
                        callback(data, true);
                    } else {
                        callback(that.config, false);
                    }
                })
                .catch(function() {
                    callback(that.config, false);
                });
        } else {
            // Fallback ES5 pour iOS 9.1 - utiliser XMLHttpRequest
            that.fetchAjax('/api/config', function(data) {
                if (data && typeof data === 'object') {
                    that.updateConfigFromServer(data);
                    callback(data, true);
                } else {
                    callback(that.config, false);
                }
            });
        }
    },

    /* Mettre à jour la configuration depuis le serveur */
    updateConfigFromServer: function(serverConfig) {
        this.config.timezone = serverConfig.timezone || this.config.timezone;
        this.config.units = serverConfig.units || this.config.units;
        if (serverConfig.weatherLat !== undefined) {
            this.config.weatherLat = serverConfig.weatherLat;
        }
        if (serverConfig.weatherLon !== undefined) {
            this.config.weatherLon = serverConfig.weatherLon;
        }

        // Mettre à jour les modules qui en ont besoin
        if (typeof Weather !== 'undefined') {
            Weather.config.latitude = this.config.weatherLat;
            Weather.config.longitude = this.config.weatherLon;
            Weather.config.useImperial = (this.config.units === 'imperial');
        }

        if (typeof News !== 'undefined' && serverConfig.newsFeeds) {
            News.config.feeds = serverConfig.newsFeeds;
        }
    },

    /* Sauvegarder la configuration */
    saveConfig: function(settingsData, callback) {
        var that = this;

        if (typeof fetch !== 'undefined') {
            fetch('/api/save-config', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(settingsData)
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result && result.success) {
                    that.updateConfigFromServer(result);
                    if (callback) callback(true);
                } else {
                    console.error('Erreur sauvegarde configuration');
                    if (callback) callback(false);
                }
            });
        } else {
            this.fetchAjax('/api/save-config', function(data) {
                // Le serveur gère le résultat directement
                if (data && data.success) {
                    that.updateConfigFromServer(data);
                    document.getElementById('settings-modal').classList.remove('active');
                    if (callback) callback(true);
                } else {
                    if (callback) callback(false);
                }
            });
        }
    },

    /* Charger la configuration depuis le serveur via AJAX */
    fetchAjax: function(url, callback) {
        var that = this;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;

        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(data, true);
                } catch (e) {
                    console.error('Erreur parsing config:', e);
                    callback(that.config, false);
                }
            } else {
                console.error('Erreur HTTP ' + xhr.status);
                callback(that.config, false);
            }
        });

        xhr.addEventListener('error', function() {
            console.error('Erreur réseau configuration');
            callback(that.config, false);
        });

        xhr.send();
    },

    /* Mettre à jour l'interface utilisateur */
    updateUserInterface: function(config) {
        // Mettre à jour les labels de configuration dans le formulaire
        if (config.city && typeof config.city === 'string') {
            var citySelect = document.getElementById('city-select');
            if (citySelect) {
                for (var i = 0; i < citySelect.options.length; i++) {
                    if (citySelect.options[i].value.toLowerCase() === config.city.toLowerCase()) {
                        citySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        if (config.units && typeof config.units === 'string') {
            var unitsSelect = document.getElementById('units-select');
            if (unitsSelect) {
                unitsSelect.value = config.units;
            }
        }

        // Mettre à jour les champs de coordonnées
        if (config.weatherLat !== undefined && typeof config.weatherLat === 'number') {
            var latInput = document.getElementById('weather-lat');
            if (latInput) latInput.value = config.weatherLat.toFixed(2);
        }

        if (config.weatherLon !== undefined && typeof config.weatherLon === 'number') {
            var lonInput = document.getElementById('weather-lon');
            if (lonInput) lonInput.value = config.weatherLon.toFixed(2);
        }
    },

    /* Gérer l'ouverture du modal settings */
    openSettings: function() {
        var that = this;

        // Charger la configuration actuelle
        this.loadConfig(function(config, success) {
            if (success && config) {
                that.updateUserInterface(config);
            }

            document.getElementById('settings-modal').classList.add('active');
            that.refreshSystemStatus();
        });
    },

    /* Gérer la fermeture du modal */
    closeSettings: function() {
        document.getElementById('settings-modal').classList.remove('active');
    },

    /* Rafraîchir le statut système dans le modal */
    refreshSystemStatus: function() {
        var that = this;

        // Simuler un chargement du statut
        var statusInfo = document.getElementById('status-info');
        if (statusInfo) {
            statusInfo.innerHTML = 'Chargement...';
        }

        System.fetchSystemInfo(function(data, success) {
            if (success && data) {
                var html = '';
                if (data.uptime) {
                    html += '<div>⚙ Temps de fonctionnement : ' + data.uptime + '</div>';
                }
                if (data.version) {
                    html += '<div>📱 Version du dashboard : v' + data.version + '</div>';
                }
                statusInfo.innerHTML = html;
            } else {
                if (statusInfo) {
                    statusInfo.innerHTML = '⚠ Impossible de récupérer le statut système<br>Assurez-vous que le serveur est accessible.';
                }
            }
        });
    },

    /* Gérer la soumission du formulaire */
    handleFormSubmit: function(e) {
        e.preventDefault();

        var that = this;

        // Récupérer les valeurs du formulaire
        var citySelect = document.getElementById('city-select');
        var unitsSelect = document.getElementById('units-select');
        var latInput = document.getElementById('weather-lat');
        var lonInput = document.getElementById('weather-lon');

        if (!citySelect || !unitsSelect) return;

        var settings = {
            city: citySelect.value,
            units: unitsSelect.value,
            weatherLat: parseFloat(latInput.value) || null,
            weatherLon: parseFloat(lonInput.value) || null
        };

        // Sauvegarder la configuration
        this.saveConfig(settings, function(success) {
            if (success) {
                alert('Configuration sauvegardée avec succès !');
                that.closeSettings();

                // Recharger les données météo et calendrier avec les nouvelles valeurs
                Weather.init();
                Calendar.init();
            } else {
                alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
            }
        });
    },

    /* Initialiser l'application */
    init: function() {
        var that = this;

        // Charger et appliquer la configuration existante
        this.loadConfig(function(config, success) {
            if (success && config) {
                that.updateUserInterface(config);
            }
        });

        // Mettre à jour l'heure immédiatement
        System.updateTimeDisplay();

        // Ouvrir le modal settings si un bouton est cliqué
        var settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', function() {
                that.openSettings();
            });
        }

        // Gestion de la soumission du formulaire
        var configForm = document.getElementById('config-form');
        if (configForm) {
            configForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Fermer le modal en cliquant à l'extérieur
        var modalOverlay = document.getElementById('settings-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) {
                    that.closeSettings();
                }
            });
        }

        // Rafraîchir le statut système à intervalle régulier
        setInterval(function() {
            that.refreshSystemStatus();
        }, 120000); // Toutes les 2 minutes

        console.log('iPad 2 Kiosk initialisé');
    }
};

// Démarrer l'application une fois que le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
