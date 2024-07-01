# Node-Facebook

## Aperçu

Le **Node-RED Facebook Post Node** vous permet de publier facilement des messages et des images sur une page Facebook directement depuis Node-RED. Ce nœud est particulièrement utile pour l'automatisation et l'intégration des publications Facebook dans vos flux de travail.

## Fonctionnalités

- Publiez des messages et des images sur une page Facebook.
- Prend en charge le contenu dynamique des messages via `msg.payload`.
- Permet la configuration d'un message par défaut et du chemin des images.
- Gère à la fois les dossiers de jeux spécifiques et les images par défaut si le dossier n'existe pas.

## Installation

Pour installer le nœud, naviguez vers votre répertoire utilisateur Node-RED (typiquement `~/.node-red`) et exécutez :

```npm install node-red-contrib-facebook-post```

## Configuration

<div align="center">
    <img src="https://github.com/phoenixnoirdev/Node-Facebook/blob/main/screen/node-facebook-poste_0.png?raw=true" alt="Configuration Screenshot">
</div>

- **Nom** : Un nom pour le nœud.
- **Adresse de la page** : L'ID ou le nom d'utilisateur de la page Facebook où le message sera publié.
- **Message** : Le message par défaut à publier. Peut être remplacé par `msg.payload`.
- **Jeu** : Le dossier de jeu spécifique à utiliser pour les images. Par défaut, "JEUX".
- **Chemin des images** : Le chemin de base où les dossiers de jeux et les images sont stockés.
- **Jeton d'accès** : Votre jeton d'accès API Facebook.

## Remarques

- Assurez-vous que votre jeton d'accès Facebook dispose des permissions nécessaires (`pages_manage_posts`, etc.).
- Le nœud utilisera une image par défaut si le dossier de jeu spécifié n'existe pas ou est vide.
- Renouvelez régulièrement votre jeton d'accès longue durée pour maintenir les capacités de publication.

## Dépannage

- **Erreurs de jeton d'accès** : Assurez-vous que votre jeton est valide et dispose des permissions correctes.
- **Erreurs de répertoire** : Vérifiez le chemin de vos répertoires d'images et assurez-vous qu'ils existent et contiennent des images.

## Licence

Ce projet est sous licence MIT.

