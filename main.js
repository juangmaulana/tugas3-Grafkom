import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSunAndPlanets, updatePlanets } from "./solarSystem.js";

// --- 1. Setup Scene ---
const scene = new THREE.Scene();

// Bintang
const starGeo = new THREE.BufferGeometry();
const starCount = 5000;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 400;
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 })
);
scene.add(stars);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 80, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Use physically correct lights and tone mapping so high intensities behave well
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 500;

// Event listener untuk deteksi pergerakan kamera oleh user
controls.addEventListener("start", () => {
  if (isFollowingPlanet) {
    userHasMovedCamera = true;
  }
});

// --- Raycaster untuk deteksi klik ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickableObjects = [];

// Simpan posisi kamera awal
const initialCameraPos = camera.position.clone();
const initialControlsTarget = new THREE.Vector3(0, 0, 0);
let currentZoomedObject = null;
let isFollowingPlanet = false;
let followOffset = new THREE.Vector3();
let userHasMovedCamera = false;

// --- 2. Sun & Planets ---
const { sun, sunLight, planetObjects } = createSunAndPlanets(scene, clickableObjects);

// --- 4. Loop Animasi ---
function animate() {
  requestAnimationFrame(animate);
  updatePlanets(planetObjects);

  if (isFollowingPlanet && currentZoomedObject && !userHasMovedCamera) {
    const worldPos = new THREE.Vector3();
    currentZoomedObject.getWorldPosition(worldPos);
    camera.position.copy(worldPos).add(followOffset);
    controls.target.copy(worldPos);
  } else if (isFollowingPlanet && currentZoomedObject && userHasMovedCamera) {
    const worldPos = new THREE.Vector3();
    currentZoomedObject.getWorldPosition(worldPos);
    controls.target.copy(worldPos);
  }

  controls.update();
  renderer.render(scene, camera);
}

function zoomToObject(object) {
  const worldPos = new THREE.Vector3();
  object.getWorldPosition(worldPos);

  let distance;
  if (object.userData.name === "Matahari") {
    distance = 25;
  } else {
    const boundingSphere = object.geometry.boundingSphere;
    distance = boundingSphere.radius * 10;
  }

  const directionFromSun = new THREE.Vector3();
  directionFromSun.copy(worldPos).normalize();

  const upVector = new THREE.Vector3(0, 1, 0);
  const sideVector = new THREE.Vector3();
  sideVector.crossVectors(directionFromSun, upVector).normalize();

  const targetCameraPos = new THREE.Vector3();
  targetCameraPos.copy(worldPos);
  targetCameraPos.add(upVector.multiplyScalar(distance * 0.5));
  targetCameraPos.add(sideVector.multiplyScalar(distance * 0.8));
  targetCameraPos.add(directionFromSun.multiplyScalar(distance * 0.3));

  followOffset.copy(targetCameraPos).sub(worldPos);

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  let progress = 0;

  function animateZoom() {
    progress += 0.05;
    if (progress >= 1) {
      progress = 1;
      isFollowingPlanet = true;
      userHasMovedCamera = false;
    }
    camera.position.lerpVectors(startPos, targetCameraPos, progress);
    controls.target.lerpVectors(startTarget, worldPos, progress);
    if (progress < 1) requestAnimationFrame(animateZoom);
  }

  animateZoom();
  currentZoomedObject = object;
}

function resetCamera() {
  isFollowingPlanet = false;
  userHasMovedCamera = false;

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  let progress = 0;

  function animateReset() {
    progress += 0.05;
    if (progress >= 1) progress = 1;
    camera.position.lerpVectors(startPos, initialCameraPos, progress);
    controls.target.lerpVectors(startTarget, initialControlsTarget, progress);
    if (progress < 1) requestAnimationFrame(animateReset);
  }

  animateReset();
  currentZoomedObject = null;
}

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects);
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    if (clickedObject.userData.isClickable) {
      if (currentZoomedObject === clickedObject) {
        resetCamera();
      } else {
        zoomToObject(clickedObject);
      }
    }
  }
}

window.addEventListener("click", onMouseClick);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
