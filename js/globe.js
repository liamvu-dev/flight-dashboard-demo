const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');

export const REGION_COORDS = {
  Asia:     { lat: 24,  lng: 104, altitude: 1.46 },
  Europe:   { lat: 48,  lng: 12,  altitude: 1.46 },
  Americas: { lat: 18,  lng: -82, altitude: 1.46 },
  Mideast:  { lat: 26,  lng: 48,  altitude: 1.46 },
  Africa:   { lat: 4,   lng: 20,  altitude: 1.46 },
  Oceania:  { lat: -28, lng: 145, altitude: 1.46 },
};
export const DEFAULT_POV = { lat: 20, lng: 30, altitude: 1.46 };

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function initGlobe(options) {
  const {
    regions,
    airports,
    regionKeys,
    getSelectedRegion,
    getDashboardPrefs,
    genBooking,
    onSelectRegion,
  } = options;

  const globeEl = $('#globe');
  const captionEl = $('#globe-caption');
  const btnSnapshot = $('#btn-snapshot');

  if (!globeEl || typeof Globe !== 'function' || typeof THREE === 'undefined') {
    return {
      globeEl,
      world: null,
      controls: null,
      resize: () => {},
      addArc: () => {},
      addRing: () => {},
      ensureRegionArcs: () => {},
      syncRegionSelection: () => {},
      resetView: () => {},
      captureSnapshot: () => {},
    };
  }

  const arcs = [];
  const rings = [];

  const world = Globe({ rendererConfig: { preserveDrawingBuffer: true } })(globeEl)
    .width(globeEl.clientWidth)
    .height(globeEl.clientHeight)
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl('img/earth-hd.jpg')
    .bumpImageUrl('img/earth-topology.png')
    .showAtmosphere(true)
    .atmosphereColor('#3eb4ff')
    .atmosphereAltitude(0.20)
    // pulse rings on arrival / new booking
    .ringsData(rings)
    .ringColor((d) => (t) => `rgba(${d.rgb},${Math.pow(1 - t, 0.7)})`)
    .ringMaxRadius(4.2)
    .ringPropagationSpeed(2.6)
    .ringRepeatPeriod(650);

  const camera = world.camera();
  const halfFov = Math.tan(camera.fov * DEG2RAD / 2);

  function resize() {
    const { clientWidth: width, clientHeight: height } = globeEl;
    if (!width || !height) return;
    world.width(width).height(height);
    // Keep the globe in frame on tall canvases without moving the camera.
    camera.fov = 2 * Math.atan(halfFov / Math.min(1, width / height)) * RAD2DEG;
    camera.updateProjectionMatrix();
  }

  // Sync bottom legend pill with REGIONS colors + neon glow
  function syncCaptionUI() {
    if (!captionEl) return;
    const selectedRegion = getSelectedRegion?.() || null;
    const buttons = captionEl.querySelectorAll('button[data-region]');
    for (const btn of buttons) {
      const r = btn.dataset.region || null;
      const isAllBtn = r === null;
      const isActive = isAllBtn ? selectedRegion === null : selectedRegion === r;
      const isDimmed = !isAllBtn && Boolean(selectedRegion) && selectedRegion !== r;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('dimmed', isDimmed);
      btn.setAttribute('aria-pressed', String(isActive));
    }
  }

  if (captionEl) {
    captionEl.innerHTML =
      `<button type="button" class="caption-item caption-reset" data-region="">All Regions</button>` +
      regionKeys
        .map((r) => {
          const c = regions[r].color;
          return `<button type="button" class="caption-item" data-region="${r}" style="--region-color:${c};--region-glow:${c}88"><i style="background:${c};box-shadow:0 0 8px ${c}"></i>${r}</button>`;
        })
        .join('');
    captionEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-region]');
      if (!btn) return;
      onSelectRegion?.(btn.dataset.region || null);
    });
    syncCaptionUI();
  }

  // Larger globe view filling the center stage
  world.pointOfView(DEFAULT_POV, 0);
  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Enhance 4K satellite relief, anisotropic sharpness & balanced 3D shading
  (function enhanceGlobeMaterial() {
    const mat = world.globeMaterial();
    if (!mat.map) return setTimeout(enhanceGlobeMaterial, 120);
    const maxAniso = world.renderer().capabilities.getMaxAnisotropy();
    mat.map.anisotropy = maxAniso;
    mat.map.needsUpdate = true;
    if (mat.bumpMap) {
      mat.bumpMap.anisotropy = maxAniso;
      mat.bumpScale = 5.5;
    }
    mat.color = new THREE.Color('#4a6688');
    mat.emissiveMap = mat.map;
    mat.emissive = new THREE.Color('#e8f4ff');
    mat.emissiveIntensity = 0.78;
    mat.specular = new THREE.Color('#184470');
    mat.shininess = 18;
    mat.needsUpdate = true;
  })();

  const controls = world.controls();
  controls.autoRotate = Boolean(getDashboardPrefs?.()?.autoRotate);
  controls.autoRotateSpeed = -0.55; // rotate east -> west
  controls.enableZoom = false;

  // ===================== Glowing Airport Beacons & Destination Targets =====================
  const texCache = new Map();

  function getBeaconTexture(colorHex) {
    const key = 'beacon_' + colorHex;
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');

    // Soft outer neon halo + saturated color ring + bright white core
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, '#ffffff');
    grad.addColorStop(0.32, colorHex);
    grad.addColorStop(0.55, colorHex + 'cc');
    grad.addColorStop(0.80, colorHex + '44');
    grad.addColorStop(1, colorHex + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();

    // Subtle dark contrast rim + crisp colored outer ring so it pops even on bright deserts
    ctx.strokeStyle = 'rgba(4, 14, 34, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(64, 64, 28, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    texCache.set(key, tex);
    return tex;
  }

  function getTargetTexture(colorHex) {
    const key = 'target_' + colorHex;
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');

    // Outer radiant bloom
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, '#ffffff');
    grad.addColorStop(0.32, colorHex);
    grad.addColorStop(0.72, colorHex + '55');
    grad.addColorStop(1, colorHex + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();

    // Outer bullseye target ring
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 64, 44, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright white ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 22, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    texCache.set(key, tex);
    return tex;
  }

  function getPlaneAuraTexture(colorHex) {
    const key = 'aura_' + colorHex;
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, colorHex + 'aa');
    grad.addColorStop(0.45, colorHex + '44');
    grad.addColorStop(1, colorHex + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    texCache.set(key, tex);
    return tex;
  }

  // Render bright self-illuminated airport beacons across the globe
  const beaconsGroup = new THREE.Group();
  world.scene().add(beaconsGroup);
  const beaconGeo = new THREE.PlaneGeometry(2.6, 2.6);

  for (const ap of airports) {
    const colorHex = regions[ap.region].color;
    const mat = new THREE.MeshBasicMaterial({
      map: getBeaconTexture(colorHex),
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(beaconGeo, mat);
    const pos = world.getCoords(ap.lat, ap.lng, 0.004);
    m.position.set(pos.x, pos.y, pos.z);
    m.lookAt(pos.x * 2, pos.y * 2, pos.z * 2);
    m.userData = { airport: ap, region: ap.region };
    beaconsGroup.add(m);
  }

  function syncBeaconsUI() {
    const selectedRegion = getSelectedRegion?.() || null;
    for (const m of beaconsGroup.children) {
      const isMatch = !selectedRegion || m.userData.region === selectedRegion;
      m.material.opacity = selectedRegion ? (isMatch ? 1.0 : 0.16) : 0.95;
      const s = selectedRegion ? (isMatch ? 1.2 : 0.75) : 1.0;
      m.scale.set(s, s, 1);
    }
  }

  // ===================== 3D Planes & Trailing Arcs =====================
  // Airplanes lead the flight path. The trailing arc grows out behind the plane's tail.
  function geoInterpolate(a, b) {
    const x0 = a[0] * DEG2RAD, y0 = a[1] * DEG2RAD;
    const x1 = b[0] * DEG2RAD, y1 = b[1] * DEG2RAD;
    const cy0 = Math.cos(y0), sy0 = Math.sin(y0);
    const cy1 = Math.cos(y1), sy1 = Math.sin(y1);
    const kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0);
    const kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1);
    const d = 2 * Math.asin(Math.sqrt(Math.sin((y1 - y0) / 2) ** 2 + cy0 * cy1 * (Math.sin((x1 - x0) / 2) ** 2)));
    if (!d) return { fn: () => [a[0], a[1]], d: 0 };
    const sinD = Math.sin(d);
    return {
      d,
      fn(t) {
        const td = t * d;
        const B = Math.sin(td) / sinD, A = Math.sin(d - td) / sinD;
        const x = A * kx0 + B * kx1;
        const y = A * ky0 + B * ky1;
        const z = A * sy0 + B * sy1;
        return [
          Math.atan2(y, x) * RAD2DEG,
          Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD2DEG,
        ];
      },
    };
  }

  function makeArcCurve(startLat, startLng, endLat, endLng) {
    const { fn, d } = geoInterpolate([startLng, startLat], [endLng, endLat]);
    const altitude = (d / 2) * 0.45;
    const p0 = world.getCoords(startLat, startLng, 0);
    const [lng1, lat1] = fn(0.25);
    const p1 = world.getCoords(lat1, lng1, altitude * 1.5);
    const [lng2, lat2] = fn(0.75);
    const p2 = world.getCoords(lat2, lng2, altitude * 1.5);
    const p3 = world.getCoords(endLat, endLng, 0);
    return {
      curve: new THREE.CubicBezierCurve3(
        new THREE.Vector3(p0.x, p0.y, p0.z),
        new THREE.Vector3(p1.x, p1.y, p1.z),
        new THREE.Vector3(p2.x, p2.y, p2.z),
        new THREE.Vector3(p3.x, p3.y, p3.z)
      ),
      distance: d,
    };
  }

  function buildPlaneMesh(colorHex) {
    const group = new THREE.Group();
    group.matrixAutoUpdate = false;

    // Fuselage: nose cone pointing along +Z
    const noseGeo = new THREE.ConeGeometry(0.7, 2.4, 7);
    noseGeo.rotateX(Math.PI / 2);
    noseGeo.translate(0, 0, 1.2);
    const noseMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    group.add(new THREE.Mesh(noseGeo, noseMat));

    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.6, 2.6, 7);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.translate(0, 0, -1.3);
    const bodyMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    group.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Soft neon aura beneath the aircraft so it stands out sharply against coastlines & terrain
    const auraGeo = new THREE.PlaneGeometry(8.2, 8.2);
    auraGeo.rotateX(Math.PI / 2);
    auraGeo.translate(0, -0.15, -0.6);
    const auraMat = new THREE.MeshBasicMaterial({
      map: getPlaneAuraTexture(colorHex),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(auraGeo, auraMat));

    // Swept wings (oriented in X-Z plane)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 1.0);
    wingShape.lineTo(3.6, -1.6);
    wingShape.lineTo(3.0, -2.2);
    wingShape.lineTo(0.4, -1.4);
    wingShape.lineTo(-0.4, -1.4);
    wingShape.lineTo(-3.0, -2.2);
    wingShape.lineTo(-3.6, -1.6);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(Math.PI / 2);
    const wingMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(wingGeo, wingMat));

    // Tail vertical fin (standing up in Y-Z plane)
    const finGeo = new THREE.BufferGeometry();
    const finVerts = new Float32Array([
      0, 0.3, -1.0,
      0, 1.8, -2.3,
      0, 0.3, -2.3,
    ]);
    finGeo.setAttribute('position', new THREE.BufferAttribute(finVerts, 3));
    finGeo.computeVertexNormals();
    group.add(new THREE.Mesh(finGeo, wingMat));

    // Horizontal tail stabilizer
    const hTailShape = new THREE.Shape();
    hTailShape.moveTo(0, -1.6);
    hTailShape.lineTo(1.5, -2.3);
    hTailShape.lineTo(1.2, -2.5);
    hTailShape.lineTo(0, -2.3);
    hTailShape.lineTo(-1.2, -2.5);
    hTailShape.lineTo(-1.5, -2.3);
    hTailShape.closePath();
    const hTailGeo = new THREE.ShapeGeometry(hTailShape);
    hTailGeo.rotateX(Math.PI / 2);
    group.add(new THREE.Mesh(hTailGeo, wingMat));

    // Glowing afterburner nozzle at the exact tail connector point
    const nozzleGeo = new THREE.SphereGeometry(0.35, 6, 6);
    nozzleGeo.translate(0, 0.25, -2.4);
    const nozzleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    group.add(new THREE.Mesh(nozzleGeo, nozzleMat));

    return group;
  }

  const planes = [];
  const planesGroup = new THREE.Group();
  world.scene().add(planesGroup);

  const SEGMENTS = 50;
  const destTargetGeo = new THREE.PlaneGeometry(3.8, 3.8);

  function createPlane(arc, colorHex, isInitial) {
    const { curve, distance } = makeArcCurve(arc.startLat, arc.startLng, arc.endLat, arc.endLng);
    const mesh = buildPlaneMesh(colorHex);
    planesGroup.add(mesh);

    // Glowing pulsing destination bullseye at arc.to
    const destMat = new THREE.MeshBasicMaterial({
      map: getTargetTexture(colorHex),
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide,
    });
    const destMesh = new THREE.Mesh(destTargetGeo, destMat);
    const dPos = world.getCoords(arc.endLat, arc.endLng, 0.005);
    destMesh.position.set(dPos.x, dPos.y, dPos.z);
    destMesh.lookAt(dPos.x * 2, dPos.y * 2, dPos.z * 2);
    planesGroup.add(destMesh);

    const curvePoints = curve.getPoints(SEGMENTS);
    const maxPts = SEGMENTS + 2;
    const positions = new Float32Array(maxPts * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeo.setDrawRange(0, 0);

    // Outer colored trailing arc
    const lineMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
    });
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    planesGroup.add(lineMesh);

    // Inner bright core trail
    const coreMat = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.55,
      depthTest: true,
    });
    const coreMesh = new THREE.Line(lineGeo, coreMat);
    planesGroup.add(coreMesh);

    const selectedRegion = getSelectedRegion?.() || null;
    const isVisible = !selectedRegion || arc.region === selectedRegion;
    mesh.visible = isVisible;
    destMesh.visible = isVisible;
    lineMesh.visible = isVisible;
    coreMesh.visible = isVisible;

    const plane = {
      arc,
      curve,
      curvePoints,
      mesh,
      destMesh,
      lineMesh,
      coreMesh,
      positions,
      t: isInitial ? Math.random() : 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00014 + (1 / (4500 + distance * 3600)),
      colorHex,
    };
    arc.plane = plane;
    planes.push(plane);
  }

  function removePlane(arc) {
    if (!arc || !arc.plane) return;
    const plane = arc.plane;
    const idx = planes.indexOf(plane);
    if (idx !== -1) planes.splice(idx, 1);
    planesGroup.remove(plane.mesh);
    planesGroup.remove(plane.destMesh);
    planesGroup.remove(plane.lineMesh);
    planesGroup.remove(plane.coreMesh);
    plane.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    plane.destMesh.material.dispose();
    plane.lineMesh.geometry.dispose();
    plane.lineMesh.material.dispose();
    plane.coreMesh.geometry.dispose();
    plane.coreMesh.material.dispose();
  }

  const matrix = new THREE.Matrix4();
  const forward = new THREE.Vector3();
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  const trueUp = new THREE.Vector3();
  const scaleVec = new THREE.Vector3();
  const tailLocal = new THREE.Vector3();
  const tailPos = new THREE.Vector3();

  let lastTime = performance.now();
  function animatePlanes(now) {
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;
    const selectedRegion = getSelectedRegion?.() || null;

    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      const isMatch = !selectedRegion || p.arc.region === selectedRegion;
      p.t += p.speed * dt;
      if (p.t > 1) {
        p.t = 0;
        if (isMatch) addRing(p.arc.to, p.arc.region); // trigger pulse ring at destination when plane arrives
      }

      p.mesh.visible = isMatch;
      p.destMesh.visible = isMatch;
      p.lineMesh.visible = isMatch;
      p.coreMesh.visible = isMatch;
      if (!isMatch) continue;

      // 1. Position & orientation of plane
      const t1 = p.t;
      const t2 = Math.min(p.t + 0.005, 1.0);
      const p1 = p.curve.getPoint(t1);
      const p2 = p.curve.getPoint(t2);

      forward.subVectors(p2, p1).normalize();
      up.copy(p1).normalize();
      right.crossVectors(forward, up).normalize();
      trueUp.crossVectors(right, forward).normalize();

      // Scale up at takeoff, scale down at landing
      const fade = Math.min(1, Math.sin(Math.PI * p.t) * 5.0);
      const s = fade * 0.85;
      scaleVec.set(s, s, s);

      matrix.makeBasis(right, trueUp, forward);
      matrix.setPosition(p1);
      matrix.scale(scaleVec);
      p.mesh.matrix.copy(matrix);

      // 2. Exact world coordinates of plane's tail
      tailLocal.set(0, 0.25, -2.4);
      tailPos.copy(tailLocal).applyMatrix4(matrix);

      // 3. Trailing line: from departure airport up to the plane's tail!
      const curveIdx = Math.floor(p.t * SEGMENTS);
      let count = 0;
      const pos = p.positions;

      for (let k = 0; k <= curveIdx && k < p.curvePoints.length; k++) {
        const pt = p.curvePoints[k];
        pos[count * 3]     = pt.x;
        pos[count * 3 + 1] = pt.y;
        pos[count * 3 + 2] = pt.z;
        count++;
      }

      // Connect last vertex directly to the tail
      pos[count * 3]     = tailPos.x;
      pos[count * 3 + 1] = tailPos.y;
      pos[count * 3 + 2] = tailPos.z;
      count++;

      p.lineMesh.geometry.attributes.position.needsUpdate = true;
      p.lineMesh.geometry.setDrawRange(0, count);
      p.lineMesh.material.opacity = Math.min(0.95, fade * 1.2);
      p.coreMesh.material.opacity = Math.min(0.55, fade * 0.8);

      // 4. Pulse destination bullseye beacon so arrival points shine clearly
      const approachBoost = p.t > 0.65 ? (p.t - 0.65) / 0.35 : 0;
      const pulse = 0.88 + 0.25 * Math.sin(now * 0.006 + p.phase) + 0.35 * approachBoost;
      p.destMesh.scale.set(pulse, pulse, 1);
      p.destMesh.material.opacity = Math.min(1.0, 0.72 + 0.28 * approachBoost);
    }
    requestAnimationFrame(animatePlanes);
  }
  requestAnimationFrame(animatePlanes);

  function addArc(b, isInitial) {
    const selectedRegion = getSelectedRegion?.() || null;
    const c = regions[b.region].color;
    const arc = {
      region: b.region,
      from: b.from,
      to: b.to,
      startLat: b.from.lat, startLng: b.from.lng, endLat: b.to.lat, endLng: b.to.lng,
    };
    createPlane(arc, c, isInitial);
    arcs.push(arc);
    if (arcs.length > 80) {
      let dropIdx = 0;
      if (selectedRegion) {
        const nonMatchIdx = arcs.findIndex((a) => a.region !== selectedRegion);
        if (nonMatchIdx !== -1) dropIdx = nonMatchIdx;
      }
      const [removed] = arcs.splice(dropIdx, 1);
      removePlane(removed);
    }
  }

  function ensureRegionArcs(region, minCount = 10) {
    let count = arcs.reduce((acc, a) => acc + (a.region === region ? 1 : 0), 0);
    while (count < minCount) {
      addArc(genBooking(region), true);
      count++;
    }
  }

  function syncGlobeRings() {
    const selectedRegion = getSelectedRegion?.() || null;
    const visibleRings = selectedRegion ? rings.filter((r) => r.region === selectedRegion) : rings;
    world.ringsData([...visibleRings]);
  }

  function addRing(ap, regionOverride = null) {
    const selectedRegion = getSelectedRegion?.() || null;
    const reg = regionOverride || ap.region;
    rings.push({ lat: ap.lat, lng: ap.lng, rgb: hexToRgb(regions[reg].color), region: reg });
    if (rings.length > 14) {
      let dropIdx = 0;
      if (selectedRegion) {
        const nonMatchIdx = rings.findIndex((r) => r.region !== selectedRegion);
        if (nonMatchIdx !== -1) dropIdx = nonMatchIdx;
      }
      rings.splice(dropIdx, 1);
    }
    syncGlobeRings();
  }

  for (let i = 0; i < 65; i++) addArc(genBooking(), true);

  function resetView() {
    if (controls) {
      if (controls.target && typeof controls.target.set === 'function') {
        controls.target.set(0, 0, 0);
      }
      if (typeof controls.update === 'function') {
        controls.update();
      }
    }
    if (world) {
      world.pointOfView(DEFAULT_POV, 900);
    }
  }

  function syncRegionSelection(region) {
    if (region) {
      ensureRegionArcs(region, 10);
      controls.autoRotate = false;
      if (REGION_COORDS[region]) {
        world.pointOfView(REGION_COORDS[region], 850);
      }
    } else {
      controls.autoRotate = Boolean(getDashboardPrefs?.()?.autoRotate);
      world.pointOfView(DEFAULT_POV, 850);
    }
    syncCaptionUI();
    syncBeaconsUI();
    syncGlobeRings();
  }

  // ===================== Dashboard Snapshot (PNG) =====================
  function formatSnapshotFilename(date = new Date()) {
    return `onefly-snapshot-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`;
  }

  function downloadUrl(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function captureSnapshot() {
    const renderer = world.renderer();
    const webglCanvas = renderer?.domElement;
    if (!webglCanvas || !webglCanvas.width || !webglCanvas.height) return;

    const composer = typeof world.postProcessingComposer === 'function' ? world.postProcessingComposer() : null;
    if (composer && composer.passes && composer.passes.length > 1) {
      composer.render();
    } else {
      renderer.render(world.scene(), world.camera());
    }

    const w = webglCanvas.width;
    const h = webglCanvas.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const cx = w * 0.5;
    const cy = h * 0.45;
    const r = Math.max(w, h) * 0.72;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    bg.addColorStop(0, '#0b1e45');
    bg.addColorStop(0.55, '#050d24');
    bg.addColorStop(1, '#02060f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.filter = 'contrast(1.04) saturate(1.08)';
    ctx.drawImage(webglCanvas, 0, 0, w, h);
    ctx.filter = 'none';

    const filename = formatSnapshotFilename();
    if (typeof out.toBlob === 'function') {
      out.toBlob((blob) => {
        if (!blob) {
          downloadUrl(out.toDataURL('image/png'), filename);
          return;
        }
        const url = URL.createObjectURL(blob);
        downloadUrl(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    } else {
      downloadUrl(out.toDataURL('image/png'), filename);
    }

    if (btnSnapshot) {
      btnSnapshot.classList.remove('captured');
      void btnSnapshot.offsetWidth;
      btnSnapshot.classList.add('captured');
      setTimeout(() => btnSnapshot.classList.remove('captured'), 700);
    }
  }

  if (btnSnapshot) btnSnapshot.addEventListener('click', captureSnapshot);

  return {
    globeEl,
    world,
    controls,
    resize,
    addArc,
    addRing,
    ensureRegionArcs,
    syncRegionSelection,
    resetView,
    captureSnapshot,
  };
}
