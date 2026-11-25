#!/usr/bin/env node
/**
 * iPad 2 Kiosk - Lancement du serveur (Node.js fallback)
 * Script d'autodémarrage pour Node.js
 */

const spawn = require('child_process').spawn;

console.log('iPad 2 Kiosk Server - Démarrage...');
console.log('Démarrant le serveur Python Flask...\n');

// Démarrer le serveur Flask via Python
const serverProcess = spawn('python3', ['server.py'], {
    cwd: __dirname + '/../'
});

// Logger de l'état du processus
serverProcess.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
});

serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});

serverProcess.on('close', (code) => {
    console.log(`\nServeur arrêté. Code de sortie : ${code}`);
});
