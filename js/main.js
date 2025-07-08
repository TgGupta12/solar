import * as THREE from "https://cdn.skypack.dev/three@0.129.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

let scene, camera, renderer, controls, skybox;
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let sunLight, ambientLight;

let planet_sun, planet_mercury, planet_venus, planet_earth, planet_mars;
let planet_jupiter, planet_saturn, planet_uranus, planet_neptune;

let isAnimationPaused = false;
let orbit_rings = [];
let planetData = {};

const ORBITAL_RADII = {
  mercury: 50,
  venus: 60,
  earth: 70,
  mars: 80,
  jupiter: 100,
  saturn: 120,
  uranus: 140,
  neptune: 160
};

let revolutionSpeeds = {
  mercury: 2.0,
  venus: 1.5,
  earth: 1.0,
  mars: 0.8,
  jupiter: 0.7,
  saturn: 0.6,
  uranus: 0.5,
  neptune: 0.4
};

const DEFAULT_SPEEDS = { ...revolutionSpeeds };

function createSkyboxMaterials() {
  const skyboxImagePaths = [
    '../img/skybox/space_ft.png', 
    '../img/skybox/space_bk.png',
    '../img/skybox/space_up.png',
    '../img/skybox/space_dn.png',
    '../img/skybox/space_rt.png', 
    '../img/skybox/space_lf.png'  
  ];

  return skyboxImagePaths.map((imagePath) => {
    const texture = new THREE.TextureLoader().load(imagePath);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: false,
      depthWrite: false
    });
  });
}
function createSkybox() {
  const materials = createSkyboxMaterials();
  const geometry = new THREE.BoxGeometry(8000, 8000, 8000);
  skybox = new THREE.Mesh(geometry, materials);
  scene.add(skybox);
}
function createPlanet(texturePath, radius, segments = 100, materialType = 'standard') {
  const geometry = new THREE.SphereGeometry(radius, segments, segments);
  const texture = new THREE.TextureLoader().load(texturePath);
  
  let material;
  if (materialType === 'standard') {
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1
    });
  } else {
    material = new THREE.MeshBasicMaterial({
      map: texture,
      emissive: 0xffff00,
      emissiveIntensity: 0.1
    });
  }

  const planet = new THREE.Mesh(geometry, material);
  
  planet.userData = {
    radius: radius,
    type: materialType,
    originalRotationSpeed: 0.005
  };

  return planet;
}

function createAllPlanets() {
  planet_sun = createPlanet("../img/sun_hd.jpg", 20, 100, 'basic');
  planet_mercury = createPlanet("../img/mercury_hd.jpg", 2, 100, 'standard');
  planet_venus = createPlanet("../img/venus_hd.jpg", 3, 100, 'standard');
  planet_earth = createPlanet("../img/earth_hd.jpg", 4, 100, 'standard');
  planet_mars = createPlanet("../img/mars_hd.jpg", 3.5, 100, 'standard');
  planet_jupiter = createPlanet("../img/jupiter_hd.jpg", 10, 100, 'standard');
  planet_saturn = createPlanet("../img/saturn_hd.jpg", 8, 100, 'standard');
  planet_uranus = createPlanet("../img/uranus_hd.jpg", 6, 100, 'standard');
  planet_neptune = createPlanet("../img/neptune_hd.jpg", 5, 100, 'standard');
  const rotationSpeeds = {
    mercury: 0.008,  
    venus: 0.002,    
    earth: 0.005,    
    mars: 0.004,     
    jupiter: 0.012,  
    saturn: 0.010,   
    uranus: 0.003,   
    neptune: 0.004,  
    sun: 0.001       
  };

  planet_mercury.userData.originalRotationSpeed = rotationSpeeds.mercury;
  planet_venus.userData.originalRotationSpeed = rotationSpeeds.venus;
  planet_earth.userData.originalRotationSpeed = rotationSpeeds.earth;
  planet_mars.userData.originalRotationSpeed = rotationSpeeds.mars;
  planet_jupiter.userData.originalRotationSpeed = rotationSpeeds.jupiter;
  planet_saturn.userData.originalRotationSpeed = rotationSpeeds.saturn;
  planet_uranus.userData.originalRotationSpeed = rotationSpeeds.uranus;
  planet_neptune.userData.originalRotationSpeed = rotationSpeeds.neptune;
  planet_sun.userData.originalRotationSpeed = rotationSpeeds.sun;

  const planets = [
    planet_sun, planet_mercury, planet_venus, planet_earth, planet_mars,
    planet_jupiter, planet_saturn, planet_uranus, planet_neptune
  ];
  
  planets.forEach(planet => scene.add(planet));
}

function createOrbitalTrail(radius, color = '#ffffff', opacity = 0.1) {
  const points = [];
  const segments = 128;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, 0, z));
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity
  });
  
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return line;
}

function createOrbitalRing(radius, color = '#ffffff', opacity = 0.3) {
  const innerRadius = radius;
  const outerRadius = radius + 2;
  const segments = 128;
  
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: opacity
  });
  
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  orbit_rings.push(ring);
  
  return ring;
}

function createOrbitalVisuals() {
  const planetColors = {
    mercury: '#ff0000',
    venus: '#ffa500',
    earth: '#0000ff',
    mars: '#800080',
    jupiter: '#ffd700',
    saturn: '#808080',
    uranus: '#00ffff',
    neptune: '#000080'
  };

  Object.entries(ORBITAL_RADII).forEach(([planet, radius]) => {
    createOrbitalRing(radius, planetColors[planet], 0.2);
  });


  Object.entries(ORBITAL_RADII).forEach(([planet, radius]) => {
    createOrbitalTrail(radius, planetColors[planet], 0.05);
  });
}

function setupLighting() {
  
  ambientLight = new THREE.AmbientLight(0x404040, 0.2);
  scene.add(ambientLight);
  
  sunLight = new THREE.PointLight(0xffffff, 2, 0, 0.1);
  sunLight.position.copy(planet_sun.position);
  scene.add(sunLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
  directionalLight.position.set(50, 50, 50);
  scene.add(directionalLight);
}

function getOrbitalInclination(planetName) {
  const inclinations = {
    mercury: 0.034,
    venus: 0.009,   
    earth: 0,      
    mars: 0.032,    
    jupiter: 0.023, 
    saturn: 0.043,  
    uranus: 0.013,  
    neptune: 0.030  
  };
  
  return inclinations[planetName] || 0;
}

function updatePlanetPosition(time, speed, planet, orbitRadius, planetName) {
  const orbitSpeedMultiplier = 0.001;
  const planetAngle = time * orbitSpeedMultiplier * speed;
  const inclination = getOrbitalInclination(planetName);
  
  planet.position.x = planet_sun.position.x + orbitRadius * Math.cos(planetAngle);
  planet.position.y = planet_sun.position.y + orbitRadius * Math.sin(planetAngle) * Math.sin(inclination);
  planet.position.z = planet_sun.position.z + orbitRadius * Math.sin(planetAngle) * Math.cos(inclination);
}

function initializePlanetData() {
  planetData = {
    sun: {
      name: 'Sun',
      type: 'Star',
      diameter: '1,392,700 km',
      distance: '0 AU',
      orbitalPeriod: 'N/A',
      rotationPeriod: '25-35 days',
      moons: 0,
      description: 'The Sun is a yellow dwarf star that provides light and heat to the solar system.'
    },
    mercury: {
      name: 'Mercury',
      type: 'Terrestrial Planet',
      diameter: '4,879 km',
      distance: '0.39 AU',
      orbitalPeriod: '88 days',
      rotationPeriod: '59 days',
      moons: 0,
      description: 'The smallest and innermost planet, Mercury has extreme temperature variations.'
    },
    venus: {
      name: 'Venus',
      type: 'Terrestrial Planet',
      diameter: '12,104 km',
      distance: '0.72 AU',
      orbitalPeriod: '225 days',
      rotationPeriod: '243 days (retrograde)',
      moons: 0,
      description: 'Venus is the hottest planet with a thick atmosphere of carbon dioxide.'
    },
    earth: {
      name: 'Earth',
      type: 'Terrestrial Planet',
      diameter: '12,742 km',
      distance: '1 AU',
      orbitalPeriod: '365.25 days',
      rotationPeriod: '24 hours',
      moons: 1,
      description: 'Our home planet, Earth is the only known planet with life.'
    },
    mars: {
      name: 'Mars',
      type: 'Terrestrial Planet',
      diameter: '6,780 km',
      distance: '1.52 AU',
      orbitalPeriod: '687 days',
      rotationPeriod: '24.6 hours',
      moons: 2,
      description: 'The Red Planet, Mars has the largest volcano and canyon in the solar system.'
    },
    jupiter: {
      name: 'Jupiter',
      type: 'Gas Giant',
      diameter: '139,820 km',
      distance: '5.20 AU',
      orbitalPeriod: '12 years',
      rotationPeriod: '9.9 hours',
      moons: 79,
      description: 'The largest planet, Jupiter is a gas giant with a Great Red Spot storm.'
    },
    saturn: {
      name: 'Saturn',
      type: 'Gas Giant',
      diameter: '116,460 km',
      distance: '9.58 AU',
      orbitalPeriod: '29 years',
      rotationPeriod: '10.7 hours',
      moons: 82,
      description: 'Famous for its spectacular ring system, Saturn is the second largest planet.'
    },
    uranus: {
      name: 'Uranus',
      type: 'Ice Giant',
      diameter: '50,724 km',
      distance: '19.18 AU',
      orbitalPeriod: '84 years',
      rotationPeriod: '17 hours',
      moons: 27,
      description: 'Uranus rotates on its side and has a blue-green color due to methane.'
    },
    neptune: {
      name: 'Neptune',
      type: 'Ice Giant',
      diameter: '49,244 km',
      distance: '30.07 AU',
      orbitalPeriod: '165 years',
      rotationPeriod: '16 hours',
      moons: 14,
      description: 'The windiest planet, Neptune has supersonic storms reaching 2,100 km/h.'
    }
  };
}

function showTooltip(planetName, x, y) {
  const tooltip = document.getElementById('planet-tooltip');
  const tooltipContent = document.getElementById('tooltip-content');
  const planet = planetData[planetName];

  if (planet) {
    tooltipContent.innerHTML = `
      <h4>${planet.name}</h4>
      <p><strong>Type:</strong> ${planet.type}</p>
      <p><strong>Diameter:</strong> ${planet.diameter}</p>
      <p><strong>Distance:</strong> ${planet.distance}</p>
      <p><strong>Orbital Period:</strong> ${planet.orbitalPeriod}</p>
      <p><strong>Rotation Period:</strong> ${planet.rotationPeriod}</p>
      <p><strong>Moons:</strong> ${planet.moons}</p>
      <p>${planet.description}</p>
    `;
    const tooltipWidth = 200;
    const tooltipHeight = 150;
    const padding = 10;

    let tooltipX = x + padding;
    let tooltipY = y + padding;

    
    if (tooltipX + tooltipWidth > window.innerWidth) {
      tooltipX = x - tooltipWidth - padding;
    }
    if (tooltipY + tooltipHeight > window.innerHeight) {
      tooltipY = y - tooltipHeight - padding;
    }

    tooltip.style.left = tooltipX + 'px';
    tooltip.style.top = tooltipY + 'px';
    tooltip.classList.add('show');
  }
}

function hideTooltip() {
  const tooltip = document.getElementById('planet-tooltip');
  tooltip.classList.remove('show');
}

function setupCameraAndRenderer() {

  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = "c";
  document.body.appendChild(renderer.domElement);


  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 12;
  controls.maxDistance = 3000;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const planets = [
    { mesh: planet_sun, name: 'sun' },
    { mesh: planet_mercury, name: 'mercury' },
    { mesh: planet_venus, name: 'venus' },
    { mesh: planet_earth, name: 'earth' },
    { mesh: planet_mars, name: 'mars' },
    { mesh: planet_jupiter, name: 'jupiter' },
    { mesh: planet_saturn, name: 'saturn' },
    { mesh: planet_uranus, name: 'uranus' },
    { mesh: planet_neptune, name: 'neptune' }
  ];

  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

  if (intersects.length > 0) {
    const intersectedPlanet = planets.find(p => p.mesh === intersects[0].object);
    if (intersectedPlanet) {
      showTooltip(intersectedPlanet.name, event.clientX, event.clientY);
    }
  } else {
    hideTooltip();
  }
}

function onMouseClick(event) {
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

 
  raycaster.setFromCamera(mouse, camera);

  
  const planets = [
    { mesh: planet_sun, name: 'sun' },
    { mesh: planet_mercury, name: 'mercury' },
    { mesh: planet_venus, name: 'venus' },
    { mesh: planet_earth, name: 'earth' },
    { mesh: planet_mars, name: 'mars' },
    { mesh: planet_jupiter, name: 'jupiter' },
    { mesh: planet_saturn, name: 'saturn' },
    { mesh: planet_uranus, name: 'uranus' },
    { mesh: planet_neptune, name: 'neptune' }
  ];


  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

  if (intersects.length > 0) {
    const intersectedPlanet = planets.find(p => p.mesh === intersects[0].object);
    if (intersectedPlanet) {
      zoomToPlanet(intersectedPlanet.mesh, intersectedPlanet.name);
    }
  }
}

function zoomToPlanet(planet, planetName) {
  const planetRadius = planet.userData.radius || 5;
  const zoomDistance = Math.max(planetRadius * 8, 20);
  
  const planetPosition = planet.position.clone();
  const cameraOffset = new THREE.Vector3(0, 0, zoomDistance);
  
 
  cameraOffset.x = (Math.random() - 0.5) * zoomDistance * 0.3;
  cameraOffset.y = (Math.random() - 0.5) * zoomDistance * 0.3;
  
  const targetCameraPosition = planetPosition.clone().add(cameraOffset);
  
  animateCameraToPosition(targetCameraPosition, planetPosition, planetName);
}

function animateCameraToPosition(targetPosition, lookAtPosition, planetName) {
  const startPosition = camera.position.clone();
  const startLookAt = controls.target.clone();
  const duration = 2000;
  const startTime = Date.now();
  
  function animateCamera() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeInOutCubic(progress);
    
    camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
    controls.target.lerpVectors(startLookAt, lookAtPosition, easeProgress);
    
    controls.update();
    
    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      showPlanetInfo(planetName);
    }
  }
  
  animateCamera();
}


function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function showPlanetInfo(planetName) {
  if (planetName === 'overview') return;
  
  const planet = planetData[planetName];
  if (planet) {
    const tooltip = document.getElementById('planet-tooltip');
    const tooltipContent = document.getElementById('tooltip-content');
    
    tooltipContent.innerHTML = `
      <h4>${planet.name}</h4>
      <p><strong>Type:</strong> ${planet.type}</p>
      <p><strong>Diameter:</strong> ${planet.diameter}</p>
      <p><strong>Distance:</strong> ${planet.distance}</p>
      <p><strong>Orbital Period:</strong> ${planet.orbitalPeriod}</p>
      <p><strong>Rotation Period:</strong> ${planet.rotationPeriod}</p>
      <p><strong>Moons:</strong> ${planet.moons}</p>
      <p>${planet.description}</p>
    `;
    
    tooltip.style.left = '50%';
    tooltip.style.top = '20%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.classList.add('show');
    
    setTimeout(() => {
      tooltip.classList.remove('show');
    }, 3000);
  }
}

function resetToOverview() {
  const targetPosition = new THREE.Vector3(0, 50, 200);
  const lookAtPosition = new THREE.Vector3(0, 0, 0);
  animateCameraToPosition(targetPosition, lookAtPosition, 'overview');
}

function toggleAnimation() {
  const pauseResumeBtn = document.getElementById('pause-resume-btn');
  isAnimationPaused = !isAnimationPaused;
  
  if (isAnimationPaused) {
    pauseResumeBtn.textContent = '▶️ Resume';
    pauseResumeBtn.classList.add('paused');
  } else {
    pauseResumeBtn.textContent = '⏸️ Pause';
    pauseResumeBtn.classList.remove('paused');
  }
}

function setupSpeedControls() {
  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  
  planets.forEach(planet => {
    const slider = document.getElementById(`${planet}-speed`);
    const valueDisplay = document.getElementById(`${planet}-value`);
    
    slider.addEventListener('input', (e) => {
      revolutionSpeeds[planet] = parseFloat(e.target.value);
      valueDisplay.textContent = e.target.value;
    });
  });


  const resetButton = document.getElementById('reset-speeds');
  resetButton.addEventListener('click', resetToDefaultSpeeds);
}


function resetToDefaultSpeeds() {
  Object.keys(DEFAULT_SPEEDS).forEach(planet => {
    revolutionSpeeds[planet] = DEFAULT_SPEEDS[planet];
    
    const slider = document.getElementById(`${planet}-speed`);
    const valueDisplay = document.getElementById(`${planet}-value`);
    
    slider.value = DEFAULT_SPEEDS[planet];
    valueDisplay.textContent = DEFAULT_SPEEDS[planet];
  });
}
function setupEventListeners() {
  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("click", onMouseClick, false);
}

function setupUIControls() {
  const pauseResumeBtn = document.getElementById('pause-resume-btn');
  const resetViewBtn = document.getElementById('reset-view-btn');
  
  pauseResumeBtn.addEventListener('click', toggleAnimation);
  resetViewBtn.addEventListener('click', resetToOverview);
}

function animate() {
  requestAnimationFrame(animate);

  if (!isAnimationPaused) {
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    const planets = [
      planet_mercury, planet_venus, planet_earth, planet_mars,
      planet_jupiter, planet_saturn, planet_uranus, planet_neptune, planet_sun
    ];

    planets.forEach(planet => {
      if (planet && planet.userData) {
        const rotationSpeed = planet.userData.originalRotationSpeed;
        planet.rotation.y += rotationSpeed * delta * 60;
      }
    });

    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.mercury, planet_mercury, ORBITAL_RADII.mercury, 'mercury');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.venus, planet_venus, ORBITAL_RADII.venus, 'venus');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.earth, planet_earth, ORBITAL_RADII.earth, 'earth');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.mars, planet_mars, ORBITAL_RADII.mars, 'mars');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.jupiter, planet_jupiter, ORBITAL_RADII.jupiter, 'jupiter');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.saturn, planet_saturn, ORBITAL_RADII.saturn, 'saturn');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.uranus, planet_uranus, ORBITAL_RADII.uranus, 'uranus');
    updatePlanetPosition(elapsedTime * 1000, revolutionSpeeds.neptune, planet_neptune, ORBITAL_RADII.neptune, 'neptune');

    if (sunLight) {
      sunLight.position.copy(planet_sun.position);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}



function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  setupCameraAndRenderer();
  createSkybox();
  createAllPlanets();

  setupLighting();
  createOrbitalVisuals();

  initializePlanetData();
  setupEventListeners();
  setupUIControls();
  setupSpeedControls();
}
init();
animate();
