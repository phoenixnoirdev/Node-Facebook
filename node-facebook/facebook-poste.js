/* ************************************************************************** */
//
//  Node Facebook - facebook-poste.js
//
//  Author: Phoenixnoir
//  
//  Contributor:
//
//  Created: 2024-06-25 : 11:56:00
//  Update : 2024-07-12 : 20:01:00
//
//  Description:
//
/* ************************************************************************** */

const FB = require('fb');
const fs = require('fs');
const path = require('path');

module.exports = function(RED) {
    function FacebookPoste(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const appId = config.appid || 'YOUR_APP_ID';
        const appSecret = config.appsecret || 'YOUR_APP_SECRET';

        let accessToken = node.credentials.accessToken;
        let longLivedAccessToken = node.credentials.longLivedAccessToken || null;

        async function getLongLivedAccessToken(shortLivedToken) {
            const url = `https://graph.facebook.com/v17.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url);
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            return data.access_token;
        }

        async function getAccessTokenInfo(accessToken) {
            const url = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url);
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            return data;
        }

        async function postToFacebook(msg) {
            const message = msg.payload || config.message || "Message par défaut";
            const pageId = config.adrpage || 'me';
            const imagePath = config.imagePath || "Dossier images";
            const jeux = msg.game || config.game || "JEUX";
            const jeuxFolderPath = path.join(imagePath, jeux);
            const jeuxFolderExists = fs.existsSync(jeuxFolderPath);
            const defaultImagePath = path.join(imagePath, "default.png");

            try {
                if (!longLivedAccessToken) {
                    throw new Error("Le jeton d'accès longue durée n'est pas disponible. Veuillez régénérer un nouveau jeton d'accès.");
                }
                FB.setAccessToken(longLivedAccessToken);

                let response;
                if (jeuxFolderExists && fs.readdirSync(jeuxFolderPath).length > 0) {
                    if (fs.readdirSync(jeuxFolderPath).length > 1) {
                        const randomIndex = Math.floor(Math.random() * fs.readdirSync(jeuxFolderPath).length);
                        const firstImage = path.join(jeuxFolderPath, fs.readdirSync(jeuxFolderPath)[randomIndex - 1]);
                        const fileStream = fs.createReadStream(firstImage);
                        console.log("Dossier et image trouvée.");
                        console.log("Ref image " + (randomIndex - 1) + "/" + (fs.readdirSync(jeuxFolderPath).length - 1));
                        
                        response = await new Promise((resolve, reject) => {
                            FB.api(`/${pageId}/photos`, 'POST', {
                                source: fileStream,
                                caption: message,
                                access_token: longLivedAccessToken
                            }, (res) => {
                                if (!res || res.error) {
                                    reject(res.error || new Error("Erreur inconnue lors de l'upload de l'image"));
                                } else {
                                    resolve(res);
                                }
                            });
                        });
                    } else {
                        const firstImage = path.join(jeuxFolderPath, fs.readdirSync(jeuxFolderPath)[0]);
                        const fileStream = fs.createReadStream(firstImage);
                        console.log("Dossier et image trouvée.");
                        console.log("Ref image 1/1");
                        
                        response = await new Promise((resolve, reject) => {
                            FB.api(`/${pageId}/photos`, 'POST', {
                                source: fileStream,
                                caption: message,
                                access_token: longLivedAccessToken
                            }, (res) => {
                                if (!res || res.error) {
                                    reject(res.error || new Error("Erreur inconnue lors de l'upload de l'image"));
                                } else {
                                    resolve(res);
                                }
                            });
                        });
                    }
                } else {
                    console.log("Aucune image trouvée dans le dossier " + JSON.stringify(jeux));
                    const fileStream = fs.createReadStream(defaultImagePath);

                    response = await new Promise((resolve, reject) => {
                        FB.api(`/${pageId}/photos`, 'POST', {
                            source: fileStream,
                            caption: message,
                            access_token: longLivedAccessToken
                        }, (res) => {
                            if (!res || res.error) {
                                reject(res.error || new Error("Erreur inconnue lors de l'upload de l'image par défaut"));
                            } else {
                                resolve(res);
                            }
                        });
                    });
                }

                if (!response || !response.id) {
                    throw new Error("L'upload de l'image a échoué : " + JSON.stringify(response));
                }

                msg.payload = response;
                node.send(msg);

            } catch (error) {
                if (error && error.message) {
                    if (error.message.includes("Error validating access token")) {
                        node.error("Erreur de validation du jeton d'accès : " + error.message, msg);
                        node.error("Veuillez régénérer un nouveau jeton d'accès.", msg);
                    } else if (error.message.includes("permission(s) publish_actions")) {
                        node.error("Erreur : les permissions publish_actions ne sont plus disponibles. Utilisez les permissions appropriées comme pages_manage_posts.", msg);
                    } else {
                        node.error("Erreur : " + error.message, msg);
                    }
                } else {
                    node.error("Erreur inconnue lors de la publication sur Facebook.", msg);
                }
            }
        }

        node.on('input', async function(msg) {
            try {
                const tokenInfo = await getAccessTokenInfo(longLivedAccessToken || accessToken);
                const expiresAt = tokenInfo.data.data_access_expires_at; // Assurez-vous que c'est la bonne propriété pour l'expiration du jeton

                // Convertir les dates en objets Date
                const expirationDateToken = new Date(expiresAt * 1000); // Date du premier jeton
                const expirationDateDay = new Date(Date.now()); // Date du deuxième jeton (heure actuelle)

                console.log('Le jeton expire le :', expirationDateToken.toISOString());
                console.log('Date du jours :', expirationDateDay.toISOString());

                // Comparaison des dates
                if (expirationDateToken > expirationDateDay) {
                    console.log('Actualisation du jeton.');
                    longLivedAccessToken = await getLongLivedAccessToken(accessToken);
                    node.credentials.longLivedAccessToken = longLivedAccessToken;
                    RED.nodes.addCredentials(node.id, { accessToken: node.credentials.accessToken, longLivedAccessToken: longLivedAccessToken });
                }

                await postToFacebook(msg);
            } catch (error) {
                node.error("Erreur lors de l'obtention du jeton d'accès longue durée : " + error.message, msg);
            }
        });
    }

    RED.nodes.registerType("facebook-poste", FacebookPoste, {
        credentials: {
            accessToken: { type: "password" },
            longLivedAccessToken: { type: "password" }
        }
    });
};