/* iPad 2 Kiosk - Module Actualités (ES5 compatible) */

var NewsModule = {
    config: {
        feeds: [
            'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
            'https://www.theguardian.com/us/rss/top_stories.rss'
        ],
        maxArticles: 3,
        refreshInterval: 600000 // 10 minutes
    },

    /* Parser une date RSS */
    parseRSSDate: function(dateStr) {
        if (!dateStr) return '';

        try {
            // Formatage pour gérer les fuseaux horaires
            var date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return '';
            }

            var day = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
            var months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

            return day[date.getDay()] + ' ' +
                months[date.getMonth()] + ' ' +
                date.getFullYear() + ', ' +
                date.getHours().toString().padStart(2, '0') + ':' +
                date.getMinutes().toString().padStart(2, '0');
        } catch (e) {
            return '';
        }
    },

    /* Extraire du contenu d'un élément XML */
    extractText: function(element) {
        if (!element) return '';

        // Essayer .textContent d'abord
        if (typeof element.textContent !== 'undefined') {
            return element.textContent;
        }

        // Fallback: innerText ou concaténation des fils de texte
        var text = '';
        var node = element.firstChild;
        while (node) {
            if (node.nodeType === 3 && node.nodeValue) {
                text += node.nodeValue;
            }
            node = node.nextSibling;
        }
        return text.trim();
    },

    /* Obtenir le premier lien d'un élément */
    getLink: function(element) {
        if (!element || !element.childNodes) return '';

        // Chercher un tag A
        var anchor = element.firstChild;
        while (anchor && anchor.tagName !== 'A') {
            anchor = anchor.nextSibling;
        }

        if (anchor && anchor.tagName === 'A' && anchor.href) {
            return anchor.href;
        }

        // Chercher un href dans les attributs
        for (var i = 0; i < element.attributes.length; i++) {
            if (element.attributes[i].name.toLowerCase() === 'href') {
                return element.attributes[i].value;
            }
        }

        return '';
    },

    /* Récupérer un article RSS */
    fetchRSS: function(feedUrl, callback) {
        var that = this;

        // XMLHttpRequest pour compatibilité iOS 9.1
        var xhr = new XMLHttpRequest();
        xhr.open('GET', feedUrl, true);
        xhr.setRequestHeader('Accept', 'application/xml,text/xml,application/json');
        xhr.timeout = 20000; // Timeout plus long pour les feeds

        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var content = this.responseText;

                    // Essayer de détecter si c'est déjà JSON
                    if (content.indexOf('[{') === 0 || content.match(/^\[.*\]$/)) {
                        callback(null, that.extractJSON(content), true);
                        return;
                    }

                    // Parser XML
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(content, 'text/xml');

                    callback(xmlDoc, null, true);
                } catch (e) {
                    console.error('Erreur parsing RSS:', e);
                    callback(null, null, false);
                }
            } else if (xhr.status === 0) {
                // Connexion bloquée probablement par CORS ou proxy
                callback(null, null, true); // On continue malgré tout
            } else {
                console.error('Erreur HTTP ' + xhr.status);
                callback(null, null, false);
            }
        });

        xhr.addEventListener('error', function() {
            callback(null, null, false);
        });

        xhr.addEventListener('abort', function() {
            callback(null, null, true);
        });

        // Éviter les issues de CORS en acceptant divers formats
        this.withCredentials = true;
        xhr.send();
    },

    /* Extraire les articles d'un XML RSS */
    extractRSS: function(xmlDoc) {
        var that = this;

        // Tenter plusieurs namespaces RSS possibles
        var items = [];

        // Namespace Atom
        if (xmlDoc.getElementsByTagNameNS && xmlDoc.getElementsByTagName('atom')) {
            var entries = xmlDoc.getElementsByTagNameNS(
                'http://www.w3.org/2005/Atom',
                'entry'
            );

            for (var i = 0; i < entries.length && items.length < that.config.maxArticles; i++) {
                var entry = entries[i];
                items.push({
                    title: this.extractText(entry.getElementsByTagName('title')[0]),
                    link: this.getLink(entry),
                    date: this.extractText(entry.getElementsByTagName('updated')[0]) ||
                           this.parseRSSDate(this.extractText(entry.getElementsByTagName('pubDate')[0]))
                });
            }
        } else {
            // Namespace RSS standard
            var channel = xmlDoc.getElementsByTagName('rss')[0];
            if (!channel) return items;

            var itemNodes = channel.getElementsByTagName('item');

            for (var i = 0; i < itemNodes.length && items.length < that.config.maxArticles; i++) {
                var item = itemNodes[i];
                items.push({
                    title: this.extractText(item.getElementsByTagName('title')[0]),
                    link: this.getLink(item),
                    date: this.parseRSSDate(this.extractText(item.getElementsByTagName('pubDate')[0]))
                });
            }
        }

        return items;
    },

    /* Extraire d'un JSON */
    extractJSON: function(json) {
        var that = this;
        var articles = [];

        try {
            // Essayer différents formats JSON RSS
            if (json.feed && json.feed.entry) {
                for (var i = 0; i < json.feed.entry.length && articles.length < that.config.maxArticles; i++) {
                    var entry = json.feed.entry[i];
                    articles.push({
                        title: this.extractText(entry.title),
                        link: entry.link ? entry.link.href : '',
                        date: this.parseRSSDate(this.extractText(entry.published || entry.updated))
                    });
                }
            } else if (json.feed && json.feed.entries) {
                for (var i = 0; i < json.feed.entries.length && articles.length < that.config.maxArticles; i++) {
                    var entry = json.feed.entries[i];
                    articles.push({
                        title: this.extractText(entry.title || entry),
                        link: this.getLink(json.feed.entry) || '',
                        date: this.parseRSSDate(this.extractText(entry.published || entry.updated))
                    });
                }
            } else if (json.items && Array.isArray(json.items)) {
                for (var i = 0; i < json.items.length && articles.length < that.config.maxArticles; i++) {
                    var item = json.items[i];
                    if (!item.title) continue;
                    articles.push({
                        title: this.extractText(item.title),
                        link: item.link || '',
                        date: item.published ? this.parseRSSDate(item.published) : ''
                    });
                }
            } else {
                // Si c'est un tableau plat d'articles
                for (var i = 0; i < json.length && articles.length < that.config.maxArticles; i++) {
                    var item = json[i];
                    if (!item.title) continue;
                    articles.push({
                        title: this.extractText(item.title),
                        link: item.url || item.link || '',
                        date: this.parseRSSDate(item.published || item.updated || '')
                    });
                }
            }
        } catch (e) {
            console.error('Erreur extraction JSON:', e);
        }

        return articles;
    },

    /* Formater une icône selon le titre */
    getNewsIcon: function(title) {
        if (!title || typeof title !== 'string') return ''; // Icone journal par défaut

        var lower = title.toLowerCase();

        if (lower.indexOf('climat') > -1 || lower.indexOf('météo') > -1) return '';
        if (lower.indexOf('tech') > -1 || lower.indexOf('technologie') > -1) return '';
        if (lower.indexOf('sport') > -1) return '';
        if (lower.indexOf('finan') > -1) return '';
        if (lower.indexOf('santé') > -1 || lower.indexOf('médecin') > -1) return '';

        return ''; // Icone news par défaut
    },

    /* Afficher les actualités */
    displayNews: function(articles) {
        var that = this;

        // Rendre le container visible
        document.getElementById('news-section').style.display = 'block';
        document.getElementById('news-list').innerHTML = '';

        if (!articles || articles.length === 0) {
            document.getElementById('news-list').innerHTML =
                '<div class="loading">Aucune actualité disponible</div>';
            return;
        }

        // Construire le HTML
        var html = '';
        for (var i = 0; i < articles.length; i++) {
            var article = articles[i];
            var icon = that.getNewsIcon(article.title);
            var title = article.title || 'Article sans titre';
            var link = article.link || '#';

            html += '<div class="news-item">' +
                '<span class="news-icon">' + icon + '</span>' +
                '<div class="news-title"><a href="' + link + '" target="_blank" class="news-link">' + title + '</a></div>' +
                '</div>';
        }

        document.getElementById('news-list').innerHTML = html;
    },

    /* Récupérer et afficher les actualités */
    fetchNews: function(callback) {
        var that = this;
        var allArticles = [];

        // Charger chaque feed RSS en parallèle
        for (var i = 0; i < that.config.feeds.length; i++) {
            var feedUrl = that.config.feeds[i];
            that.fetchRSS(feedUrl, function(xmlDoc, json, success) {
                if (success) {
                    // Extraire les articles
                    var articles = xmlDoc ? that.extractRSS(xmlDoc) : that.extractJSON(json);
                    allArticles = allArticles.concat(articles);

                    // Arrêter une fois le nombre max atteint si suffisant
                    if (allArticles.length >= that.config.maxArticles) {
                        callback(allArticles.slice(0, that.config.maxArticles));
                    }
                }
            });
        }

        // Si aucun feed ne fonctionne avec succès
        if (allArticles.length === 0) {
            callback([]);
        }
    },

    /* Obtenir des articles de démonstration */
    getDemoArticles: function() {
        return [
            {
                title: 'Résumés du développement web',
                date: new Date().toDateString(),
                link: '#'
            },
            {
                title: 'Innovations en JavaScript ES6+',
                date: new Date(Date.now() - 86400000).toDateString(),
                link: '#'
            }
        ];
    },

    /* Initialiser le module */
    init: function() {
        var that = this;

        // Charger la configuration si disponible
        if (typeof Config !== 'undefined' && Config.newsFeeds) {
            that.config.feeds = Config.newsFeeds;
        }

        // Premier chargement immédiat
        this.fetchNews(this.displayNews);

        // Définir l'intervalle de mise à jour
        if (typeof setInterval !== 'undefined') {
            setInterval(function() {
                that.fetchNews(that.displayNews);
            }, that.config.refreshInterval);
        }

        return that;
    }
};

// Exporter pour usage externe
var News = NewsModule.init();
