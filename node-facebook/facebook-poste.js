/* ************************************************************************** */
//
//  Node Facebook - facebook-poste.js
//
//  Author: Phoenixnoir
//  
//  Contributor:
//
//  Created: 2024-06-25 : 11:56:00
//  Update : 2024-07-02 : 01:27:00
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

        // Utiliser les fonctions `appId` et `appSecret` fournies dans la configuration
        const appId = config.appid || 'YOUR_APP_ID'; // Remplacez par votre ID d'application Facebook
        const appSecret = config.appsecret || 'YOUR_APP_SECRET'; // Remplacez par votre secret d'application Facebook

        // Récupérer le jeton d'accès à partir des informations d'identification Node-RED
        const accessToken = node.credentials.accessToken;

        // Fonction pour obtenir un jeton d'accès longue durée
        async function getLongLivedAccessToken(shortLivedToken) {
            const fetch = (await import('node-fetch')).default;
            const url = `https://graph.facebook.com/v17.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            return data.access_token;
        }

        // Fonction pour effectuer la publication sur Facebook
        async function postToFacebook(msg) {
            // Utiliser le message configuré par défaut, ou celui du message injecté, ou un message par défaut
            const message = msg.payload || config.message || "Message par défaut";
            const pageId = config.adrpage || 'me'; // Utiliser l'adresse de la page configurée

            // Construire le chemin complet du dossier JEUX
            const imagePath = config.imagePath || "Dossier images";
            const jeux = msg.game || config.game || "JEUX";
            const jeuxFolderPath = path.join(imagePath, jeux);

            // Vérifier l'existence du dossier JEUX
            const jeuxFolderExists = fs.existsSync(jeuxFolderPath);

            // Chemin de l'image par défaut
            const defaultImagePath = path.join(imagePath, "default.png");

            try {
                // Utiliser un jeton d'accès longue durée pour publier
                const longLivedAccessToken = await getLongLivedAccessToken(accessToken);
                FB.setAccessToken(longLivedAccessToken);

                let response;

                if (jeuxFolderExists && fs.readdirSync(jeuxFolderPath).length > 0) {
                    // Dossier JEUX existe et contient des images
                    const firstImage = path.join(jeuxFolderPath, fs.readdirSync(jeuxFolderPath)[0]);
                    const fileStream = fs.createReadStream(firstImage);

                    console.log("Dossier et image trouvée.");

                    // Uploader l'image sur Facebook
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
                    // Dossier JEUX n'existe pas ou est vide, utiliser l'image par défaut
                    console.log("Aucune image trouvée dans le dossier " + JSON.stringify(jeux));

                    const fileStream = fs.createReadStream(defaultImagePath);

                    // Uploader l'image par défaut sur Facebook
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

                // Vérifier si l'upload a réussi
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
            await postToFacebook(msg);
        });
    }

    RED.nodes.registerType("facebook-poste", FacebookPoste, {
        credentials: {
            accessToken: { type: "password" }
        }
    });
};
