# Mini-Projet “ForestNocturne”

## Description
Ce projet est un **mini-jeu** utilisant des **Steering Behaviors** (comportements de Craig Reynolds). Vous incarnez un **monstre démoniaque** qui doit **éliminer** toutes les **lucioles** dans la forêt en moins de 15 secondes.

Chaque entité (monstre ou luciole) a son propre `BehaviorManager`, avec plusieurs comportements possibles :

- **Wander** (errance)  
- **Seek** (chercher la cible)  
- **Cohesion** (pour que les lucioles se regroupent)

## Fonctionnalités principales
1. **BehaviorManager**  
   - Méthodes : `add()`, `remove()`, `activate()`, `deactivate()`, `changeWeight()`, `getBehavior()`, `getSteeringForce()`.  
   - Chaque monstre/luciole calcule sa force résultante en sommant (pondérée) ses comportements actifs.

2. **Interface (Sliders)**  
   - **En haut à gauche** : sliders pour changer le **nombre** de lucioles/monstres, la **quantité** d’obstacles, la **vitesse** des monstres, etc.  
   - **En bas à gauche** : sliders pour modifier **le poids** (l’importance) de chaque comportement (Wander, Seek, Cohesion).

3. **Touches Clavier**  
   - **W** : les monstres errent (wander).  
   - **S** : les monstres suivent la cible (seek).  
   - **C** : les lucioles se regroupent (cohesion).  
   - **D** : active le mode debug (affiche cercles, vecteurs de collision…).

4. **Écran d’accueil**  
   - Affiche un **fond d’accueil** (`firstImage`) et une brève histoire.  
   - Bouton **“Commencer”** pour lancer la partie.

5. **Fin de partie**  
   - Le jeu dure **15 secondes**.  
   - Si **toutes les lucioles** sont éliminées avant la fin, **le monstre gagne**.  
   - Sinon, **les lucioles gagnent**.

## Comment lancer
1. Mettre le fichier `index.html` et le fichier `app.js` dans le même dossier.  
2. Créer un dossier `assets/` contenant :
   - `forest_background.jpg`  
   - `rocher.png`  
   - `luciole.png`  
   - `monstre.png`  
   - `first.png` (ou `first.jpg`, selon le code)  
3. Ouvrir `index.html` dans un **serveur local** (par exemple “Live Server” dans VSCode).  
4. Cliquer sur **“Commencer”** dans la page d’accueil pour démarrer le jeu.

## Comment jouer
- **Objectif** : En 15 secondes, détruire un maximum de lucioles avec le monstre.  
- **Déplacements** : Les monstres suivent leurs comportements (Wander, Seek, etc.).  
- **Réglages** :
  - **Sliders en haut** : changer le nombre de lucioles/monstres/obstacles, la vitesse des monstres.  
  - **Sliders en bas** : changer l’importance (poids) des comportements (Wander, Seek, Cohesion).

## Remarques
- En mode **debug** (touche D), vous verrez des cercles autour des entités et leurs vecteurs de vitesse.  
- Les obstacles ne se placent pas sur la zone des sliders (zones interdites).  
- Le code est écrit en **p5.js**. Veillez à inclure `p5.min.js` et éventuellement `p5.sound.min.js` dans `index.html`.

**Bon jeu !**
