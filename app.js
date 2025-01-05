//
// Variables globales (déclarations principales)
//
let lucioles = [];        // tableau contenant les lucioles
let obstacles = [];       // tableau contenant les obstacles
let monsters = [];        // tableau contenant les monstres

let forestBackground;     // image de fond
let rockImage;            // image pour les rochers
let lucioleImage;         // image pour les lucioles
let monsterImage;         // image pour les monstres
let firstImage;           // image d'accueil (écran de début)

let target;               // position cible pour Seek
let isGameStarted = false; 
let timer = 15;           
let victory = false;      
let resultMessage = "";
let luciolesMangees = 0;  
let gameOver = false;     

// Sliders (quantités & vitesse)
let lucioleSlider, monsterSlider, obstacleSlider, monsterSpeedSlider;

// Sliders (poids des comportements)
let lucioleWanderWeightSlider;
let lucioleSeekWeightSlider;
let lucioleCohesionWeightSlider;
let monsterWanderWeightSlider;
let monsterSeekWeightSlider;

// Mode actif (W, S, C) pour les comportements
let currentMode = 'wander'; 

// Mode debug (permet d'afficher cercles, vecteurs, etc.)
let debugMode = false;  

//
// Comportements (Behavior) : Wander, Seek, Cohesion
//
class WanderBehavior {
  constructor(vehicle) {
    this.vehicle = vehicle;
  }
  computeForce() {
    // Renvoie une force aléatoire (errance)
    let wanderForce = p5.Vector.random2D();
    wanderForce.setMag(0.1);
    return wanderForce;
  }
}

class SeekBehavior {
  constructor(vehicle) {
    this.vehicle = vehicle;
  }
  computeForce() {
    // Renvoie une force pour rejoindre la cible (target)
    let desired = p5.Vector.sub(target, this.vehicle.position);
    desired.setMag(this.vehicle.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vehicle.velocity);
    steer.limit(this.vehicle.maxForce);
    return steer;
  }
}

class CohesionBehavior {
  constructor(vehicle, allLuciolesRef) {
    this.vehicle = vehicle;
    this.allLuciolesRef = allLuciolesRef; 
  }
  computeForce() {
    // Renvoie une force de regroupement (cohésion)
    if (!this.vehicle.alive) return createVector(0, 0);

    let neighbors = this.vehicle.getNeighbors(this.allLuciolesRef);
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of neighbors) {
      sum.add(other.position);
      count++;
    }
    if (count > 0) {
      sum.div(count); 
      let steer = p5.Vector.sub(sum, this.vehicle.position);
      steer.setMag(this.vehicle.maxSpeed);
      steer.limit(this.vehicle.maxForce);
      return steer;
    } else {
      return createVector(0, 0);
    }
  }
}

//
// BehaviorManager (gestionnaire de comportements pour chaque entité)
//
class BehaviorManager {
  constructor(vehicle) {
    this.vehicle = vehicle;       
    this.behaviors = [];          
  }

  add(name, behaviorInstance, weight) {
    // Ajoute un comportement (ex: 'wander') avec un certain poids
    this.behaviors.push({
      name,
      instance: behaviorInstance,
      weight,
      active: false,
    });
  }

  remove(name) {
    // Retire un comportement par son nom
    this.behaviors = this.behaviors.filter(b => b.name !== name);
  }

  activate(name) {
    // Active un comportement (ex: 'seek')
    let b = this.behaviors.find(b => b.name === name);
    if (b) b.active = true;
  }

  deactivate(name) {
    // Désactive un comportement
    let b = this.behaviors.find(b => b.name === name);
    if (b) b.active = false;
  }

  deactivateAll() {
    // Désactive tous les comportements
    for (let b of this.behaviors) {
      b.active = false;
    }
  }

  changeWeight(name, newWeight) {
    // Change le poids (importance) d'un comportement
    let b = this.behaviors.find(b => b.name === name);
    if (b) b.weight = newWeight;
  }

  getBehavior(name) {
    // Récupère un comportement par son nom
    return this.behaviors.find(b => b.name === name);
  }

  getSteeringForce() {
    // Calcule la somme pondérée de tous les comportements actifs
    let totalForce = createVector(0, 0);
    for (let b of this.behaviors) {
      if (b.active) {
        let f = b.instance.computeForce();
        f.mult(b.weight);
        totalForce.add(f);
      }
    }
    totalForce.limit(this.vehicle.maxForce * 3);
    return totalForce;
  }
}

//
// Classe Luciole (petite entité lumineuse)
//
class Luciole {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.acceleration = createVector(0, 0);
    this.maxSpeed = 8;
    this.maxForce = 0.1;
    this.alive = true;
    
    // Manager de comportements
    this.behaviorManager = new BehaviorManager(this);
    this.behaviorManager.add('wander', new WanderBehavior(this), 1.0);
    this.behaviorManager.add('seek',   new SeekBehavior(this),   1.0);
    // Cohesion sera ajouté plus tard, via setAllLuciolesRef
  }

  setAllLuciolesRef(allLuciolesRef) {
    // Ajoute la Cohesion quand on a la liste complète
    this.behaviorManager.remove('cohesion');
    this.behaviorManager.add(
      'cohesion', 
      new CohesionBehavior(this, allLuciolesRef),
      1.0
    );
  }

  avoidObstacles(obstacles) {
    // Force pour contourner les obstacles
    for (let obstacle of obstacles) {
      let distance = p5.Vector.dist(this.position, obstacle.position);
      if (distance < obstacle.size + 100) { 
        let flee = p5.Vector.sub(this.position, obstacle.position);
        flee.normalize(); 
        flee.mult(this.maxSpeed);
        let steer = p5.Vector.sub(flee, this.velocity); 
        steer.limit(this.maxForce * 2); 
        this.applyForce(steer); 
      }
    }
  }

  collideWithObstacles(obstacles) {
    // Collision dure : on repousse la luciole si elle "entre" dans un obstacle
    for (let obstacle of obstacles) {
      let distance = p5.Vector.dist(this.position, obstacle.position);
      if (distance < obstacle.size) {
        let pushOut = p5.Vector.sub(this.position, obstacle.position);
        pushOut.setMag(obstacle.size - distance + 1);
        this.position.add(pushOut);
      }
    }
  }

  getNeighbors(others) {
    // Renvoie la liste des lucioles proches (distance < 50)
    let neighbors = [];
    for (let other of others) {
      if (!other.alive) continue;
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < 50) {
        neighbors.push(other);
      }
    }
    return neighbors;
  }

  applyForce(force) {
    // Ajoute une force à l'accélération
    this.acceleration.add(force);
  }

  update() {
    // Met à jour la position/vitesse
    if (!this.alive) return;

    let steering = this.behaviorManager.getSteeringForce();
    this.applyForce(steering);

    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    // Wrap écran : réapparaît de l'autre côté
    if (this.position.x < 0) this.position.x = width;
    if (this.position.x > width) this.position.x = 0;
    if (this.position.y < 0) this.position.y = height;
    if (this.position.y > height) this.position.y = 0;
  }

  display() {
    // Affiche la luciole (image)
    if (!this.alive) return;
    image(lucioleImage, this.position.x - 12, this.position.y - 12, 30, 30);
    
    // Debug : cercle + vecteur vitesse
    if (debugMode) {
      noFill();
      stroke(0, 255, 0);
      circle(this.position.x, this.position.y, 24);
      stroke(255, 0, 0);
      line(this.position.x, this.position.y, 
           this.position.x + this.velocity.x * 10, 
           this.position.y + this.velocity.y * 10);
    }
  }
}

//
// Classe Monster (le monstre démoniaque)
//
class Monster {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.acceleration = createVector(0, 0);
    this.maxSpeed = 15;   
    this.maxForce = 0.5;

    // Manager de comportements
    this.behaviorManager = new BehaviorManager(this);
    this.behaviorManager.add('wander', new WanderBehavior(this), 1.0);
    this.behaviorManager.add('seek',   new SeekBehavior(this),   1.0);
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  attack(lucioles) {
    // Si le monstre est proche (<75), la luciole est "mangée"
    for (let luciole of lucioles) {
      if (!luciole.alive) continue;
      let d = p5.Vector.dist(this.position, luciole.position);
      if (d < 75) {
        luciole.alive = false; 
        luciolesMangees++;
      }
    }
  }

  update() {
    // Lit le slider de vitesse
    this.maxSpeed = monsterSpeedSlider.value();

    let steering = this.behaviorManager.getSteeringForce();
    this.applyForce(steering);

    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    // Wrap écran
    if (this.position.x < 0) this.position.x = width;
    if (this.position.x > width) this.position.x = 0;
    if (this.position.y < 0) this.position.y = height;
    if (this.position.y > height) this.position.y = 0;
  }

  display() {
    // Affiche le monstre (image)
    image(monsterImage, this.position.x - 75, this.position.y - 75, 150, 150);

    // Mode debug
    if (debugMode) {
      noFill();
      stroke(255, 100, 100);
      circle(this.position.x, this.position.y, 150);
      stroke(255, 0, 0);
      line(this.position.x, this.position.y, 
           this.position.x + this.velocity.x * 15, 
           this.position.y + this.velocity.y * 15);
    }
  }
}

//
// Classe Obstacle (rocher)
//
class Obstacle {
  constructor(x, y, size) {
    this.position = createVector(x, y);
    this.size = size;
  }

  display() {
    // Affiche le rocher
    image(rockImage, this.position.x - this.size, this.position.y - this.size, this.size * 2, this.size * 2);

    // Mode debug : cercle
    if (debugMode) {
      noFill();
      stroke(255, 255, 0);
      circle(this.position.x, this.position.y, this.size * 2);
    }
  }
}

// Zones interdites (pas d'obstacle dans ces zones)
let forbiddenZones = [];

//
// p5.js : preload(), setup() (point d'entrée principal)
//
function preload() {
  // On charge les images à l'avance
  forestBackground = loadImage('assets/forest_background.jpg'); 
  rockImage        = loadImage('assets/rocher.png'); 
  lucioleImage     = loadImage('assets/luciole.png'); 
  monsterImage     = loadImage('assets/monstre.png'); 
  firstImage       = loadImage('assets/first.jpg'); // image d'accueil
}

function setup() {
  // Création du canvas
  createCanvas(windowWidth, windowHeight);
  // Cible par défaut
  target = createVector(width / 2, height / 2);

  // Sliders (haut)
  let labelLucioles = createDiv("Lucioles");
  labelLucioles.position(30, 30);
  labelLucioles.style('color', 'white');
  lucioleSlider = createSlider(50, 250, 150, 1);
  lucioleSlider.position(30, 50);
  lucioleSlider.style('width', '180px');

  let labelMonstres = createDiv("Monstres");
  labelMonstres.position(30, 70);
  labelMonstres.style('color', 'white');
  monsterSlider = createSlider(1, 20, 3, 1);
  monsterSlider.position(30, 90);
  monsterSlider.style('width', '180px');

  let labelObstacles = createDiv("Obstacles");
  labelObstacles.position(30, 110);
  labelObstacles.style('color', 'white');
  obstacleSlider = createSlider(1, 100, 10, 1);
  obstacleSlider.position(30, 130);
  obstacleSlider.style('width', '180px');

  let labelVitesse = createDiv("Vitesse monstres");
  labelVitesse.position(30, 150);
  labelVitesse.style('color', 'white');
  monsterSpeedSlider = createSlider(5, 25, 15, 0.1);
  monsterSpeedSlider.position(30, 170);
  monsterSpeedSlider.style('width', '180px');

  // Sliders (bas)
  let bottomAreaY = height - 220; 

  let labelLWander = createDiv("Poids Lucioles - Wander");
  labelLWander.position(30, bottomAreaY - 20);
  labelLWander.style('color', 'white');
  lucioleWanderWeightSlider = createSlider(0, 3, 1, 0.1);
  lucioleWanderWeightSlider.position(30, bottomAreaY);
  lucioleWanderWeightSlider.style('width', '180px');

  let labelLSeek = createDiv("Poids Lucioles - Seek");
  labelLSeek.position(30, bottomAreaY + 20);
  labelLSeek.style('color', 'white');
  lucioleSeekWeightSlider = createSlider(0, 3, 1, 0.1);
  lucioleSeekWeightSlider.position(30, bottomAreaY + 40);
  lucioleSeekWeightSlider.style('width', '180px');

  let labelLCohesion = createDiv("Poids Lucioles - Cohesion");
  labelLCohesion.position(30, bottomAreaY + 60);
  labelLCohesion.style('color', 'white');
  lucioleCohesionWeightSlider = createSlider(0, 3, 1, 0.1);
  lucioleCohesionWeightSlider.position(30, bottomAreaY + 80);
  lucioleCohesionWeightSlider.style('width', '180px');

  let labelMWander = createDiv("Poids Monstres - Wander");
  labelMWander.position(30, bottomAreaY + 100);
  labelMWander.style('color', 'white');
  monsterWanderWeightSlider = createSlider(0, 3, 1, 0.1);
  monsterWanderWeightSlider.position(30, bottomAreaY + 120);
  monsterWanderWeightSlider.style('width', '180px');

  let labelMSeek = createDiv("Poids Monstres - Seek");
  labelMSeek.position(30, bottomAreaY + 140);
  labelMSeek.style('color', 'white');
  monsterSeekWeightSlider = createSlider(0, 3, 1, 0.1);
  monsterSeekWeightSlider.position(30, bottomAreaY + 160);
  monsterSeekWeightSlider.style('width', '180px');

  // Zones interdites (pour pas placer d'obstacle sur les sliders)
  forbiddenZones = [
    { x: 0, y: 0, width: 280, height: 220 },
    { x: 0, y: bottomAreaY - 20, width: 280, height: 300 },
  ];

  // Création initiale (lucioles, obstacles, monstres)
  for (let i = 0; i < lucioleSlider.value(); i++) {
    lucioles.push(new Luciole(random(width), random(height)));
  }
  for (let luciole of lucioles) {
    luciole.setAllLuciolesRef(lucioles);
  }

  for (let i = 0; i < obstacleSlider.value(); i++) {
    obstacles.push(createValidObstacle());
  }

  for (let i = 0; i < monsterSlider.value(); i++) {
    monsters.push(new Monster(random(width), random(height)));
  }
}

//
// draw() : boucle principale
//
function draw() {
  if (!isGameStarted) {
    // Affiche l'écran d'accueil si le jeu n'a pas commencé
    displayHomePage();
    return;
  }
  if (gameOver) {
    // Affiche écran de fin
    if (victory) {
      displayVictoryPage();
    } else {
      displayEndGamePage();
    }
    return;
  }

  // Affiche l'image de fond
  image(forestBackground, 0, 0, width, height);

  // Diminution du timer
  if (frameCount % 60 === 0 && timer > 0) {
    timer--;
  }

  // Conditions de victoire/défaite
  if (getActiveLuciolesCount() === 0 && !gameOver) {
    gameOver = true;
    victory = false;
    resultMessage = "Victoire des monstres !";
  }
  if (timer === 0 && getActiveLuciolesCount() > 0 && !gameOver) {
    gameOver = true;
    victory = true;
    resultMessage = "Les lucioles ont survécu !";
  }

  // Mise à jour entités + pondération des comportements
  updateEntities();
  updateBehaviorWeights();

  // Affichage UI
  displayInfoText();
  displayTimer();

  // Affiche obstacles
  obstacles.forEach((obstacle) => obstacle.display());

  // Affiche et met à jour lucioles
  lucioles.forEach((luciole) => {
    luciole.avoidObstacles(obstacles);
    luciole.update();
    luciole.collideWithObstacles(obstacles);
    luciole.display();
  });

  // Affiche et met à jour monstres
  monsters.forEach((monster) => {
    monster.attack(lucioles);
    monster.update();
    monster.display();
  });

  // Cible (pour Seek)
  fill(255, 0, 0);
  ellipse(target.x, target.y, 10, 10);
}

//
// Création d'obstacle valide (ne pas le mettre sur la zone interdite)
//
function createValidObstacle() {
  let x, y, size;
  let valid = false;
  let attempts = 0;

  while (!valid && attempts < 1000) {
    x = random(width);
    y = random(height);
    size = random(50, 100);

    let inForbiddenZone = false;
    for (let zone of forbiddenZones) {
      if (
        x + size > zone.x &&
        x - size < zone.x + zone.width &&
        y + size > zone.y &&
        y - size < zone.y + zone.height
      ) {
        inForbiddenZone = true;
        break;
      }
    }
    if (!inForbiddenZone) valid = true;
    attempts++;
  }
  return new Obstacle(x, y, size);
}

//
// Fonctions d'affichage (UI, écran d'accueil/fin)
//
function displayHomePage() {
  // Affiche l'image d'accueil
  image(firstImage, 0, 0, width, height);

  // Titre du jeu
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(60);
  text("ForestNocturne", width / 2, height / 5);

  // Petit texte d'histoire
  textAlign(LEFT, TOP);
  textSize(20);
  textLeading(26); 

  let story = 
    "Vous entrez dans la forêt en tant que monstre démoniaque.\n" +
    "Votre objectif ? Exterminer toutes les lucioles qui veulent illuminer VOTRE forêt.\n\n" +
    "Contrôles :\n" +
    "  - Touche W : le monstre se balade aléatoirement.\n" +
    "  - Touche S : le monstre suit le leader (vous).\n" +
    "  - Touche C : les lucioles se regroupent.\n\n" +
    "Le jeu dure 15 secondes : trouvez la meilleure méthode pour toutes les éliminer !\n" +
    "Augmentez ou diminuez la difficulté grâce aux paramètres de jeu (en haut à droite).\n" +
    "En bas à gauche, vous pouvez régler la puissance (poids) des différents comportements.\n";
  
  let boxX = width * 0.35;
  let boxY = height * 0.30;
  let boxW = width * 0.55;
  let boxH = height * 0.6;
  text(story, boxX, boxY, boxW, boxH);

  // Bouton Commencer
  textAlign(CENTER, CENTER);
  textSize(25);
  fill(0, 150);
  stroke(255);
  strokeWeight(2);
  let btnW = 200;
  let btnH = 50;
  let btnX = width / 2 - btnW / 2;
  let btnY = height - 150;
  rect(btnX, btnY, btnW, btnH, 10);

  fill(255);
  noStroke();
  text("Commencer", width / 2, btnY + btnH / 2);
}

function displayEndGamePage() {
  // Écran de fin en cas de défaite (ou si monster a gagné)
  background(0, 150);
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(50);
  text(resultMessage, width / 2, height / 2 - 50);

  fill(0, 150);
  stroke(255);
  strokeWeight(2);
  rect(width / 2 - 100, height / 2 + 50, 200, 50, 10);

  fill(255);
  noStroke();
  textSize(25);
  text("Rejouer", width / 2, height / 2 + 75);
}

function displayVictoryPage() {
  // Écran de fin si les lucioles gagnent
  background(0, 150); 
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(50);
  text("Les lucioles ont gagné... looser", width / 2, height / 2 - 50);

  fill(0, 150);
  stroke(255);
  strokeWeight(2);
  rect(width / 2 - 100, height / 2 + 50, 200, 50, 10);

  fill(255);
  noStroke();
  textSize(25);
  text("Rejouer", width / 2, height / 2 + 75);
}

function displayInfoText() {
  // Affiche les infos sous les sliders du haut
  fill(255);
  textSize(14);
  textAlign(LEFT, CENTER);

  let yBase = 215; 
  text(`Lucioles: ${lucioleSlider.value()}`, 30, yBase);
  text(`Monstres: ${monsterSlider.value()}`, 30, yBase + 20);
  text(`Obstacles: ${obstacleSlider.value()}`, 30, yBase + 40);
  text(`Vitesse monstres: ${monsterSpeedSlider.value().toFixed(1)}`, 30, yBase + 60);
  text(`Lucioles mangées: ${luciolesMangees}`, 30, yBase + 80);
  text(`Lucioles restantes: ${getActiveLuciolesCount()}`, 30, yBase + 100);
}

function displayTimer() {
  // Affiche le compte à rebours (timer) au centre
  textAlign(CENTER, CENTER);
  textSize(50);
  fill(timer <= 5 ? color(255, 0, 0) : color(255));
  text(`Temps restant : ${timer}s`, width / 2, 50);
}

//
// Gestion des inputs (souris, clavier) + resizing
//
function mousePressed() {
  // Si on est sur l'écran d'accueil
  if (!isGameStarted) {
    // Bouton commencer
    if (
      mouseX > width / 2 - 100 && mouseX < width / 2 + 100 &&
      mouseY > height - 150  && mouseY < height - 100
    ) {
      isGameStarted = true; 
    }
  } else if (gameOver) {
    // En fin de jeu, bouton Rejouer
    if (
      mouseX > width / 2 - 100 && mouseX < width / 2 + 100 &&
      mouseY > height / 2 + 50 && mouseY < height / 2 + 100
    ) {
      resetGame();
    }
  }
}

function mouseMoved() {
  // Met à jour la cible pour le Seek quand on bouge la souris
  target.set(mouseX, mouseY);
}

function keyPressed() {
  // Permet de changer le mode actif (wander, seek, cohesion)
  if (key === 'W' || key === 'w') currentMode = 'wander';
  if (key === 'S' || key === 's') currentMode = 'seek';
  if (key === 'C' || key === 'c') currentMode = 'cohesion';

  // Touche D => debug
  if (key === 'D' || key === 'd') {
    debugMode = !debugMode;
    console.log("Debug mode:", debugMode);
  }

  // Active le comportement pour toutes les entités
  if (['wander', 'seek', 'cohesion'].includes(currentMode)) {
    lucioles.forEach(l => {
      l.behaviorManager.deactivateAll();
      l.behaviorManager.activate(currentMode);
    });
    monsters.forEach(m => {
      m.behaviorManager.deactivateAll();
      m.behaviorManager.activate(currentMode);
    });
  }
}

function windowResized() {
  // Ajuste la taille du canvas si la fenêtre change
  resizeCanvas(windowWidth, windowHeight);
}

//
// Fonctions diverses
//
function resetGame() {
  // Réinitialise la partie
  timer = 15;
  gameOver = false;
  resultMessage = "";
  luciolesMangees = 0;
  lucioles = [];
  monsters = [];
  obstacles = [];

  // Recrée les entités avec les valeurs de sliders
  for (let i = 0; i < lucioleSlider.value(); i++) {
    lucioles.push(new Luciole(random(width), random(height)));
  }
  for (let luciole of lucioles) {
    luciole.setAllLuciolesRef(lucioles);
  }

  for (let i = 0; i < monsterSlider.value(); i++) {
    monsters.push(new Monster(random(width), random(height)));
  }

  for (let i = 0; i < obstacleSlider.value(); i++) {
    obstacles.push(createValidObstacle());
  }
}

function getActiveLuciolesCount() {
  // Renvoie le nombre de lucioles encore en vie
  return lucioles.filter(l => l.alive).length;
}

function updateEntities() {
  // Ajuste la quantité d'entités (lucioles, monstres, obstacles) selon sliders
  while (lucioles.length < lucioleSlider.value()) {
    let newL = new Luciole(random(width), random(height));
    newL.setAllLuciolesRef(lucioles);
    lucioles.push(newL);
  }
  while (lucioles.length > lucioleSlider.value()) {
    lucioles.pop();
  }

  while (monsters.length < monsterSlider.value()) {
    monsters.push(new Monster(random(width), random(height)));
  }
  while (monsters.length > monsterSlider.value()) {
    monsters.pop();
  }

  while (obstacles.length < obstacleSlider.value()) {
    obstacles.push(createValidObstacle());
  }
  while (obstacles.length > obstacleSlider.value()) {
    obstacles.pop();
  }
}

function updateBehaviorWeights() {
  // Met à jour les poids (wander, seek, cohesion) pour les lucioles et monstres
  let lwWander = lucioleWanderWeightSlider.value();
  let lwSeek = lucioleSeekWeightSlider.value();
  let lwCohesion = lucioleCohesionWeightSlider.value();

  let mwWander = monsterWanderWeightSlider.value();
  let mwSeek = monsterSeekWeightSlider.value();

  lucioles.forEach(l => {
    l.behaviorManager.changeWeight('wander',   lwWander);
    l.behaviorManager.changeWeight('seek',     lwSeek);
    l.behaviorManager.changeWeight('cohesion', lwCohesion);
  });

  monsters.forEach(m => {
    m.behaviorManager.changeWeight('wander', mwWander);
    m.behaviorManager.changeWeight('seek',   mwSeek);
  });
}
