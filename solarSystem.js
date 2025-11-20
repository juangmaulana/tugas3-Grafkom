import * as THREE from "three";

export function createSunAndPlanets(scene, clickableObjects) {
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
    new THREE.MeshBasicMaterial({ color: 0xffd700 })
  );
  sun.userData = { name: "Matahari", isClickable: true };
  sunLight.position.copy(sun.position);
  sun.castShadow = false;
  scene.add(sun);
  clickableObjects.push(sun);

  // --- Data Planet ---
  const planetsData = [
    { name: "Merkurius", color: 0xc0c0c0, size: 0.4, a: 5, e: 0.205, speedBase: 0.06 },
    { name: "Venus", color: 0xffe099, size: 0.6, a: 8, e: 0.007, speedBase: 0.045 },
    { name: "Bumi", color: 0x4da6ff, size: 0.65, a: 11, e: 0.017, speedBase: 0.035 },
    { name: "Mars", color: 0xff6b50, size: 0.5, a: 15, e: 0.093, speedBase: 0.028 },
    { name: "Jupiter", color: 0xebc895, size: 1.8, a: 24, e: 0.048, speedBase: 0.015 },
    { name: "Saturnus", color: 0xf7e6b0, size: 1.5, a: 32, e: 0.054, speedBase: 0.011, hasRing: true, ringTiltDeg: 27 },
    { name: "Uranus", color: 0x85f0ff, size: 1.0, a: 40, e: 0.047, speedBase: 0.008 },
    { name: "Neptunus", color: 0x6b80ff, size: 1.0, a: 48, e: 0.009, speedBase: 0.006 }
  ];

  const planetObjects = [];
  const ENABLE_ORBIT_TILT = true;

  function createPlanet(data) {
    const planetGroup = new THREE.Group();

    const geometry = new THREE.SphereGeometry(data.size, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.5 });
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

    const orbitGroup = new THREE.Group();
    orbitGroup.add(planetGroup);
    orbitGroup.add(orbitLine);

    if (ENABLE_ORBIT_TILT) {
      const maxTiltDeg = 5;
      const tiltX = (Math.random() * 2 - 1) * maxTiltDeg * (Math.PI / 180);
      const tiltZ = (Math.random() * 2 - 1) * maxTiltDeg * (Math.PI / 180);
      orbitGroup.rotation.x = tiltX;
      orbitGroup.rotation.z = tiltZ;
    }

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
