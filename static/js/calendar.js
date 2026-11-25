/* iPad 2 Kiosk - Module Calendrier (ES5 compatible) */

var CalendarModule = {
    config: {
        calendarUrl: null, // URL de l'API de calendrier ou fichier local
        events: [],
        refreshInterval: 300000 // 5 minutes
    },

    /* Formater la date pour un affichage lisble */
    formatDate: function(dateObj) {
        var days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        var months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        var dayOfWeek = days[dateObj.getDay()];
        var dateNum = ('0' + dateObj.getDate()).slice(-2);
        var month = months[dateObj.getMonth()];
        var year = dateObj.getFullYear();

        return '<div class="event-date">' + dayOfWeek + '</div><div>' + dateNum + ' ' + month + ', ' + year + '</div>';
    },

    /* Formater l'heure */
    formatTime: function(timeStr) {
        if (!timeStr) return '';

        // Si c'est une chaîne comme "10:30"
        if (typeof timeStr === 'string') {
            return timeStr;
        }

        var hours = timeStr.getHours();
        var minutes = timeStr.getMinutes();
        var period = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // 0 devient 12

        if (minutes < 10) minutes = '0' + minutes;

        return hours + ':' + minutes + ' ' + period;
    },

    /* Déterminer si une date est aujourd'hui */
    isToday: function(dateStr) {
        var today = new Date();
        var parsedDate = this.parseDate(dateStr);

        if (!parsedDate) return false;

        return (
            parsedDate.getDate() === today.getDate() &&
            parsedDate.getMonth() === today.getMonth() &&
            parsedDate.getFullYear() === today.getFullYear()
        );
    },

    /* Parser une date ISO */
    parseDate: function(dateStr) {
        if (!dateStr) return null;

        // Format "2026-11-23" ou "2026-11-23T10:30:00Z"
        var match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;

        var year = parseInt(match[1], 10);
        var month = parseInt(match[2], 10) - 1; // Mois JS commence à 0
        var day = parseInt(match[3], 10);

        var dateObj = new Date();
        dateObj.setFullYear(year);
        dateObj.setMonth(month);
        dateObj.setDate(day);

        return dateObj;
    },

    /* Récupérer les données du calendrier */
    fetchCalendar: function(callback) {
        var that = this;

        // Fallback selon la configuration
        if (this.config.calendarUrl && typeof this.config.calendarUrl !== 'string') {
            // Charger depuis un fichier JSON local
            this.loadFromFile('calendar.json', callback);
        } else {
            // Chargement via AJAX
            that.fetchAjax('/api/calendar', callback);
        }
    },

    /* Charger un fichier JSON local */
    loadFromFile: function(filename, callback) {
        var that = this;
        var xhr = new XMLHttpRequest();

        try {
            // iOS 9.1 limitation: on charge depuis le serveur
            // Pour une vraie compatibilité, il faudrait que les fichiers soient
            // copiés sur l'appareil ou hébergés sur un serveur HTTP
            that.fetchAjax(filename, callback);
        } catch (e) {
            // Fallback aux données par défaut
            callback(this.getDefaultEvents(), true);
        }

        xhr.open('GET', filename, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;

        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    that.config.events = that.normalizeEvents(data);
                    callback(that.config.events, true);
                } catch (e) {
                    console.error('Erreur parsing calendrier:', e);
                    callback(that.getDefaultEvents(), false);
                }
            } else if (xhr.status === 404) {
                // Fallback aux données par défaut si fichier non trouvé
                callback(that.getDefaultEvents(), true);
            } else {
                console.error('Erreur HTTP ' + xhr.status);
                callback(that.getDefaultEvents(), false);
            }
        });

        xhr.addEventListener('error', function() {
            console.error('Erreur réseau calendrier');
            callback(that.getDefaultEvents(), false);
        });

        xhr.send();
    },

    /* Récupérer via AJAX */
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
                    callback(that.normalizeEvents(data), true);
                } catch (e) {
                    console.error('Erreur parsing calendrier:', e);
                    callback(that.getDefaultEvents(), false);
                }
            } else {
                console.error('Erreur HTTP ' + xhr.status);
                callback(that.getDefaultEvents(), false);
            }
        });

        xhr.addEventListener('error', function() {
            console.error('Erreur réseau calendrier');
            callback(that.getDefaultEvents(), false);
        });

        xhr.send();
    },

    /* Normaliser les événements du calendrier */
    normalizeEvents: function(data) {
        var that = this;
        var events = [];

        // Essayer de récupérer différents formats d'événements
        if (data.upcoming && Array.isArray(data.upcoming)) {
            events = data.upcoming;
        } else if (data.events && Array.isArray(data.events)) {
            events = that.formatGoogleCalendar(data.events);
        } else if (data) {
            events.push(data);
        }

        return events;
    },

    /* Formater les événements Google Calendar */
    formatGoogleCalendar: function(events) {
        var that = this;
        var formatted = [];

        // Google Calendar peut avoir plusieurs dates (récurrents)
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var summary = event.summary || 'Événement';

            if (!event.start) continue;

            var startObj = that.parseDate(event.start.date);
            var endObj = null;

            if (event.end && event.end.date) {
                endObj = that.parseDate(event.end.date);
            }

            // Si pas de date absolbe, prendre l'heure
            if (!startObj && event.start.dateTime) {
                startObj = that.parseTimeOnly(event.start.dateTime);
            }

            formatted.push({
                title: summary,
                location: event.location || '',
                allDay: !event.start.dateTime,
                startDateTime: startObj,
                duration: endObj ? this.calculateDuration(startObj, endObj) : null,
                googleEvent: event
            });
        }

        return formatted;
    },

    /* Calculer la durée d'un événement */
    calculateDuration: function(start, end) {
        var diffMs = end.getTime() - start.getTime();
        var minutes = Math.floor(diffMs / 60000);

        if (minutes < 1) return '< 1h';

        if (minutes < 60) {
            return Math.round(minutes) + ' min';
        } else if (minutes < 1440) {
            var hours = Math.floor(minutes / 60);
            var mins = minutes % 60;
            if (mins === 0) {
                return hours + 'h';
            }
            return hours + 'h ' + mins + 'min';
        } else {
            var days = Math.floor(minutes / 1440);
            var hours = (minutes % 1440) / 60;
            if (days > 0 && hours > 24) {
                return days + ' jours';
            }
            return Math.round(hours) + 'h';
        }
    },

    /* Extraire seule l'heure d'une dateTime */
    parseTimeOnly: function(dateTimeStr) {
        var match = dateTimeStr.match(/T(\d{2}):(\d{2})(?::(\d{2}))?(.*)$/);
        if (!match) return null;

        var date = new Date();
        date.setHours(parseInt(match[1], 10));
        date.setMinutes(parseInt(match[2], 10));
        if (match[3]) {
            date.setSeconds(parseInt(match[3], 10));
        } else if (match[4] === 'Z') {
            // Ajustement pour UTC
            var offset = (date.getTimezoneOffset() * 60000);
            return new Date(date.getTime() - offset);
        }

        return date;
    },

    /* Afficher les événements dans l'interface */
    displayCalendar: function(events) {
        var that = this;
        var today = new Date();

        // Rendre le container visible
        document.getElementById('calendar-section').style.display = 'block';

        // Afficher "Aujourd'hui" avec le jour de la semaine
        var dayOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        document.querySelector('.today-display span').textContent =
            'Aujourd\'hui : ' + dayOfWeek[today.getDay()];

        // Filtrer les événements pour aujourd'hui
        var todayEvents = [];
        for (var i = 0; i < events.length; i++) {
            if (!events[i].allDay && events[i].startDateTime) {
                var eventTime = new Date(events[i].startDateTime);

                // Compare uniquement date et heure, ignore minutes/secondes
                if (eventTime.getDate() === today.getDate() &&
                    eventTime.getMonth() === today.getMonth() &&
                    eventTime.getFullYear() === today.getFullYear()) {

                    todayEvents.push(events[i]);
                }
            }
        }

        // Trier les événements d'aujourd'hui par heure
        todayEvents.sort(function(a, b) {
            if (!a.startDateTime || !b.startDateTime) return 0;
            var timeA = new Date(a.startDateTime);
            var timeB = new Date(b.startDateTime);
            return timeA - timeB;
        });

        // Afficher la liste des événements d'aujourd'hui
        if (todayEvents.length > 0) {
            document.getElementById('upcoming-events').innerHTML = '';
            document.getElementById('upcoming-events').querySelector('h3').textContent = 'Aujourd\'hui';

            var eventsHtml = '';

            for (var j = 0; j < todayEvents.length; j++) {
                var event = todayEvents[j];

                if (event.allDay) {
                    eventsHtml += '<div class="event-item"><div class="event-info">' +
                        '<div class="event-title">' + event.title + '</div></div></div>';
                } else {
                    var timeDisplay = that.formatTime(event.startDateTime);
                    var duration = event.duration || '';

                    eventsHtml += '<div class="event-item"><div class="event-date">';
                    eventsHtml += this.formatDate(new Date(event.startDateTime));
                    eventsHtml += '</div><div class="event-info"><div class="event-title">';
                    eventsHtml += event.title;
                    if (timeDisplay) eventsHtml += ' - ' + timeDisplay;
                    if (duration && !event.allDay) eventsHtml += ' (' + duration + ')';
                    eventsHtml += '</div></div></div>';
                }
            }

            document.getElementById('upcoming-events').innerHTML = eventsHtml;
        } else {
            document.querySelector('.today-display span').textContent = 'Aujourd\'hui : Aucun événement';
            document.getElementById('upcoming-events').innerHTML = '';
        }
    },

    /* Obtenir des événements par défaut */
    getDefaultEvents: function() {
        var today = new Date();
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Coordonnées de Paris pour la météo
        return [{
            'title': 'Réunion hebdomadaire',
            'date': (today.getFullYear()) + '-' +
                ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                ('0' + today.getDate()).slice(-2),
            'time': '10:00',
            'location': 'Salle de réunion',
            'description': 'Point hebdomadaire d\'équipe'
        }, {
            'title': 'Appel important',
            'date': (today.getFullYear()) + '-' +
                ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                ('0' + today.getDate()).slice(-2),
            'time': '14:30',
            'location': '',
            'description': 'Appel professionnel'
        }];
    },

    /* Initialiser le module */
    init: function() {
        var that = this;

        // Charger la configuration si disponible
        if (typeof Config !== 'undefined' && Config.calendarUrl) {
            that.config.calendarUrl = Config.calendarUrl;
        }

        // Premier chargement immédiat
        this.fetchCalendar(this.displayCalendar);

        // Définir l'intervalle de mise à jour
        if (typeof setInterval !== 'undefined') {
            setInterval(function() {
                that.fetchCalendar(that.displayCalendar);
            }, that.config.refreshInterval);
        }

        return that;
    }
};

// Exporter pour usage externe
var Calendar = CalendarModule.init();
