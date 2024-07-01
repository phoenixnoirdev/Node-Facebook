/* ************************************************************************** */
//
//  Node Facebook - facebook-poste.js
//
//  Author: Phoenixnoir
//  
//  Contributor:
//
//  Created: 2024-06-25 : 11:56:00
//  Update : 2024-07-01 : 11:30:00
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

        // Récupérer le jeton d'accès à partir des informations d'identification Node-RED
        const accessToken = node.credentials.accessToken;

        // Fonction pour effectuer la publication sur Facebook
        async function postToFacebook(msg) {
            // Utiliser le message configuré par défaut, ou celui du message injecté, ou un message par défaut
            const message = msg.payload || config.message || "Message par défaut";
            const pageId = config.adrpage || 'me'; // Utiliser l'adresse de la page configurée

            // Construire le chemin complet du dossier JEUX
            const imagePath = config.imagePath || "Dossier images";
            const jeux = msg.game ||config.game || "JEUX";
            const jeuxFolderPath = path.join(imagePath, jeux);

            // Vérifier l'existence du dossier JEUX
            const jeuxFolderExists = fs.existsSync(jeuxFolderPath);

            // Chemin de l'image par défaut
            const defaultImagePath = path.join(imagePath, "default.png");

            try {
                FB.setAccessToken(accessToken);

                let response;
                if (jeuxFolderExists) {
                    // Dossier JEUX existe, utiliser une image spécifique
                    const filesInJeux = fs.readdirSync(jeuxFolderPath);
                    if (filesInJeux.length > 0) {
                        const firstImage = path.join(jeuxFolderPath, filesInJeux[0]);
                        const fileStream = fs.createReadStream(firstImage);

                        console.log("Dossier + image trouver.");
                        response = await new Promise((resolve, reject) => {
                            FB.api(`/${pageId}/photos`, 'POST', {
                                source: fileStream,
                                caption: message,
                                access_token: accessToken
                            }, (res) => {
                                if (!res || res.error) {
                                    reject(res.error || new Error("Erreur inconnue lors de l'upload de l'image"));
                                } else {
                                    resolve(res);
                                }
                            });
                        });

                        // Vérifier si l'upload a réussi
                        if (!response || !response.id) {
                            throw new Error("L'upload de l'image a échoué : " + JSON.stringify(response));
                        }

                        // Publier l'image sur le fil d'actualité
                        response = await new Promise((resolve, reject) => {
                            FB.api(`/${pageId}/feed`, 'POST', {
                                message: message,
                                object_attachment: response.id,
                                access_token: accessToken
                            }, (res) => {
                                if (!res || res.error) {
                                    reject(res.error || new Error("Erreur inconnue lors de la publication"));
                                } else {
                                    resolve(res);
                                }
                            });
                        });
                    } else {
                        console.log("Aucune image trouvée dans le dossier " + JSON.stringify(jeux));
                        // Dossier JEUX n'existe pas, utiliser l'image par défaut
                        const fileStream = fs.createReadStream(defaultImagePath);

                        response = await new Promise((resolve, reject) => {
                            FB.api(`/${pageId}/photos`, 'POST', {
                                source: fileStream,
                                caption: message,
                                access_token: accessToken
                            }, (res) => {
                                if (!res || res.error) {
                                    reject(res.error || new Error("Erreur inconnue lors de l'upload de l'image par défaut"));
                                } else {
                                    resolve(res);
                                }
                            });
                        });
                    }
                } else {
                    // Dossier JEUX n'existe pas, utiliser l'image par défaut
                    console.log("Dossier " + JSON.stringify(jeux) + " n'existe pas, image par défaut utiliser.");
                    const fileStream = fs.createReadStream(defaultImagePath);

                    response = await new Promise((resolve, reject) => {
                        FB.api(`/${pageId}/photos`, 'POST', {
                            source: fileStream,
                            caption: message,
                            access_token: accessToken
                        }, (res) => {
                            if (!res || res.error) {
                                reject(res.error || new Error("Erreur inconnue lors de l'upload de l'image par défaut"));
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    // Vérifier si l'upload a réussi
                    if (!response || !response.id) {
                        throw new Error("L'upload de l'image par défaut a échoué : " + JSON.stringify(response));
                    }

                    // Publier l'image par défaut sur le fil d'actualité
                    response = await new Promise((resolve, reject) => {
                        FB.api(`/${pageId}/feed`, 'POST', {
                            message: message,
                            object_attachment: response.id,
                            access_token: accessToken
                        }, (res) => {
                            if (!res || res.error) {
                                reject(res.error || new Error("Erreur inconnue lors de la publication de l'image par défaut"));
                            } else {
                                resolve(res);
                            }
                        });
                    });
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
                } else if (error && error.code === 'ECONNRESET') {
                    // Gérer les erreurs de connexion réinitialisée
                    node.error("Erreur de connexion réinitialisée : " + error.message, msg);
                    // Tentative de réessai après un court délai
                    setTimeout(() => postToFacebook(msg), 1000); // Réessayer après 1 seconde
                } else {
                    // Gérer les autres erreurs
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