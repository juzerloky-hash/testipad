/* iPad 2 Kiosk - Module Météo (ES5 compatible) */

var WeatherModule = {
    config: {
        latitude: 48.8566,
        longitude: 2.3522,
        updateInterval: 180000, // 3 minutes en millisecondes
        useImperial: false,
        city: 'paris'
    },

    /* Convertisseur température */
    convertTemperature: function(celsius) {
        if (!this.config.useImperial) {
            return celsius;
        }
        return Math.round((celsius * 9/5) + 32);
    },

    /* Dictionnaire conditions météo */
    weatherIcons: {
        0: '☀',
        1: '◑',
        2: '⛅',
        3: '☁',
        45: '🌫',
        48: '❄',
        51: '🌦',
        53: '🌧',
        55: '💧',
        61: '🌊',
        63: '☔',
        65: '🌊',
        71: '❄',
        73: '🌨',
        75: '⛄',
        77: '🌧',
        80: '☁',
        81: '🌦',
        82: '⛈',
        85: '❄',
            86: '🌨'
    },

    weatherDescriptions: {
        0: 'Ensoleillé',
        1: 'Clairement nuageux',
        2: 'Partiellement nuageux',
        3: 'Couvert',
        45: 'Brouillard',
        48: 'Brouillard givrant',
        51: 'Bruine légère',
        53: 'Bruine modérée',
        55: 'Bruine forte',
        61: 'Pluie faible',
        63: 'Pluie modérée',
        65: 'Pluie forte',
        71: 'Neige faible',
        73: 'Neige modérée',
        75: 'Neige abondante',
        77: 'Grêle',
        80: 'Averses faibles',
        81: 'Averses modérées',
        82: 'Averse violente',
        85: 'Averse de neige faible',
        86: 'Averse de neige abondante',
        95: 'Orage',
        96: 'Orage avec grêle',
        99: 'Orage violent'
    },

    /* Formater l'heure */
    formatTime: function(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();

        // Ajout du zéro devant si nécessaire
        if (hours < 10) hours = '0' + hours;
        if (minutes < 10) minutes = '0' + minutes;
        if (seconds < 10) seconds = '0' + seconds;

        return hours + ':' + minutes + ':' + seconds;
    },

    /* Formater la date */
    formatDate: function(date) {
        var days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        var months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        var day = days[date.getDay()];
        var dateNum = ('0' + date.getDate()).slice(-2);
        var month = months[date.getMonth()];
        var year = date.getFullYear();

        return dateNum + ' ' + month + ' ' + year;
    },

    /* Récupérer les données météo */
    fetchWeather: function(callback) {
        var that = this;

        // Utilisation d'XMLHttpRequest pour compatibilité iOS 9.1
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/weather?lat=' + that.config.latitude + '&lon=' + that.config.longitude, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 15000;

        // Écouteur de réponse avec addEventListener (supporté iOS 9.1+)
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(data, true);
                } catch (e) {
                    console.error('Erreur parsing réponse météo:', e);
                    callback({}, false);
                }
            } else {
                console.error('Erreur HTTP ' + xhr.status);
                callback({}, false);
            }
        });

        xhr.addEventListener('error', function() {
            console.error('Erreur réseau');
            callback({}, false);
        });

        xhr.send();
    },

    /* Afficher les données météo dans l'interface */
    displayWeather: function(data) {
        var that = this;

        try {
            // Afficher température actuelle
            if (data.current && data.current.temperature !== undefined) {
                document.getElementById('weather-icon').textContent =
                    that.weatherIcons[data.current.icon] || '☁';

                // Convertir la température si nécessaire
                var tempCelsius = data.current.temperature;
                var tempFinal = that.convertTemperature(tempCelsius);

                document.querySelector('.temperature').textContent = tempFinal + '°' +
                    (that.config.useImperial ? 'F' : 'C');

                // Description de la condition
                document.getElementById('weather-desc').textContent = data.current.condition;
            }

            // Afficher température quotidienne max/min
            if (data.daily) {
                var maxTempC = data.daily.max;
                var minTempC = data.daily.min;

                document.querySelector('.max-temp').textContent =
                    that.convertTemperature(maxTempC) + '°' + (that.config.useImperial ? 'F' : 'C');

                document.querySelector('.min-temp').textContent =
                    that.convertTemperature(minTempC) + '°' + (that.config.useImperial ? 'F' : 'C');

                // Probabilité de précipitations
                if (data.daily.precipitation_probability !== undefined) {
                    document.getElementById('precipitation').textContent =
                        'Chances de pluie : ' + data.daily.precipitation_probability + '%';
                }
            }

        } catch (e) {
            console.error('Erreur affichage météo:', e);
        }
    },

    /* Initialiser le module */
    init: function() {
        var that = this;

        // Charger la configuration depuis le serveur si disponible
        if (typeof Config !== 'undefined' && Config.weather) {
            that.config.latitude = Config.weather.lat || that.config.latitude;
            that.config.longitude = Config.weather.lon || that.config.longitude;
            that.config.useImperial = Config.units === 'imperial';
            that.config.city = Config.city || that.config.city;
        }

        // Premier chargement immédiat
        this.fetchWeather(this.displayWeather);

        // Définir l'intervalle de mise à jour automatique
        if (typeof setInterval !== 'undefined') {
            setInterval(function() {
                that.fetchWeather(that.displayWeather);
            }, that.config.updateInterval);
        }

        return that;
    }
};

// Exporter pour usage externe
var Weather = WeatherModule.init();
