import * as THREE from "three";

// Function to create procedural textures
function createProceduralTexture(baseColor, detailColor, pattern = 'noise') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);
  
  // Add texture details
  if (pattern === 'noise') {
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3;
      ctx.fillStyle = detailColor;
      ctx.globalAlpha = Math.random() * 0.5;
      ctx.fillRect(x, y, size, size);
    }
  } else if (pattern === 'bands') {
    for (let y = 0; y < 512; y += 2) {
      ctx.fillStyle = detailColor;
      ctx.globalAlpha = (Math.sin(y * 0.05) + 1) * 0.3;
      ctx.fillRect(0, y, 512, 2);
    }
  } else if (pattern === 'clouds') {
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 8 + 2;
      ctx.fillStyle = detailColor;
      ctx.globalAlpha = Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createSunAndPlanets(scene, clickableObjects) {
  // --- CREATE PROCEDURAL TEXTURES ---
  const textures = {
    sun: createProceduralTexture('#ffd700', '#ff8800', 'clouds'),
    mercury: createProceduralTexture('#8c8c8c', '#606060', 'noise'),
    venus: createProceduralTexture('#ffcc66', '#cc9944', 'clouds'),
    earth: createProceduralTexture('#2255cc', '#118844', 'clouds'),
    mars: createProceduralTexture('#dd5533', '#993322', 'noise'),
    jupiter: createProceduralTexture('#ddaa77', '#bb8855', 'bands'),
    saturn: createProceduralTexture('#ffe6b3', '#ddcc99', 'bands'),
    uranus: createProceduralTexture('#66ddff', '#4499cc', 'noise'),
    neptune: createProceduralTexture('#4466ff', '#3344aa', 'noise')
  };

  // --- PENCAHAYAAN ---
  scene.add(new THREE.AmbientLight(0x222222));

  // Cahaya Matahari (PointLight dengan shadow)
  const sunLight = new THREE.PointLight(0xffffff, 20, 3000, 1);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 3200; // slightly larger than distance
  sunLight.shadow.bias = -0.0008;
  sunLight.shadow.normalBias = 0.05;
  scene.add(sunLight);

  // Matahari
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 32),
    new THREE.MeshBasicMaterial({ 
      map: textures.sun,
      color: 0xffd700 
    })
  );
  sun.userData = { name: "Matahari", isClickable: true };
  sunLight.position.copy(sun.position);
  sun.castShadow = false;
  scene.add(sun);
  clickableObjects.push(sun);

  // --- Data Planet ---
  const planetsData = [
    { name: "Merkurius", color: 0xc0c0c0, size: 0.4, a: 5, e: 0.205, speedBase: 0.06, texture: textures.mercury },
    { name: "Venus", color: 0xffe099, size: 0.6, a: 8, e: 0.007, speedBase: 0.045, texture: textures.venus },
    { name: "Bumi", color: 0x4da6ff, size: 0.65, a: 11, e: 0.017, speedBase: 0.035, texture: textures.earth },
    { name: "Mars", color: 0xff6b50, size: 0.5, a: 15, e: 0.093, speedBase: 0.028, texture: textures.mars },
    { name: "Jupiter", color: 0xebc895, size: 1.8, a: 24, e: 0.048, speedBase: 0.015, texture: textures.jupiter },
    { name: "Saturnus", color: 0xf7e6b0, size: 1.5, a: 32, e: 0.054, speedBase: 0.011, hasRing: true, ringTiltDeg: 27, texture: textures.saturn },
    { name: "Uranus", color: 0x85f0ff, size: 1.0, a: 40, e: 0.047, speedBase: 0.008, texture: textures.uranus },
    { name: "Neptunus", color: 0x6b80ff, size: 1.0, a: 48, e: 0.009, speedBase: 0.006, texture: textures.neptune }
  ];

  const planetObjects = [];
  const ENABLE_ORBIT_TILT = true;

  function createPlanet(data) {
    const planetGroup = new THREE.Group();

    const geometry = new THREE.SphereGeometry(data.size, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      map: data.texture,
      color: data.color, 
      roughness: 0.5 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { name: data.name, isClickable: true };
    mesh.userData.originalColor = mesh.material.color.clone();
    planetGroup.add(mesh);
    clickableObjects.push(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (data.hasRing) {
      const ringGeo = new THREE.RingGeometry(data.size + 0.4, data.size + 1.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfff0d0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      const baseTilt = -Math.PI / 2;
      const extraTilt = (data.ringTiltDeg || 0) * (Math.PI / 180);
      ring.rotation.x = baseTilt + extraTilt;
      planetGroup.add(ring);
      ring.castShadow = true;
      ring.receiveShadow = true;
    }

    const orbitGroup = new THREE.Group();
    
    if (ENABLE_ORBIT_TILT) {
      const maxTiltDeg = 5;
      const tiltX = (Math.random() * 2 - 1) * maxTiltDeg * (Math.PI / 180);
      const tiltZ = (Math.random() * 2 - 1) * maxTiltDeg * (Math.PI / 180);
      orbitGroup.rotation.x = tiltX;
      orbitGroup.rotation.z = tiltZ;
    }
    
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = (data.a * (1 - data.e * data.e)) / (1 + data.e * Math.cos(angle));
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      points.push(new THREE.Vector3(x, 0, z));
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    
    orbitGroup.add(orbitLine);
    orbitGroup.add(planetGroup);

    scene.add(orbitGroup);

    return { mesh: planetGroup, a: data.a, e: data.e, speedBase: data.speedBase, theta: Math.random() * Math.PI * 2, objPlanet: mesh };
  }

  planetsData.forEach((data) => {
    planetObjects.push(createPlanet(data));
  });

  return { sun, sunLight, planetObjects };
}

export function updatePlanets(planetObjects) {
  planetObjects.forEach((p) => {
    const r = (p.a * (1 - p.e * p.e)) / (1 + p.e * Math.cos(p.theta));
    p.mesh.position.x = r * Math.cos(p.theta);
    p.mesh.position.z = r * Math.sin(p.theta);
    const dTheta = p.speedBase / (r * r);
    p.theta += dTheta;
    p.objPlanet.rotation.y += 0.02;
    p.objPlanet.material.color.copy(p.objPlanet.userData.originalColor);
  });
}
