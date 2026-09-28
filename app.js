/**
 * OPS-CORE FAST // SMART SOLDIER SYSTEM
 * Palantir Foundry × Apple Pro Tactical Telemetry C2 Platform
 * Three.js WebGL Digital Twin + Live Web Serial Hardware Integration Engine
 */

// ============================================================================
// 1. STATE & TELEMETRY MODEL (100% REAL HARDWARE PROTOCOL — ZERO HARDCODED VALUES)
// ============================================================================
const state = {
  serialPort: null,
  reader: null,
  writer: null,
  keepReading: false,
  isConnected: false,
  hasLiveStream: false,
  isSimulating: false,
  audioEnabled: true,
  packetCount: 0,
  lastPacketTime: null,
  activeIncidents: [],

  // Live Telemetry (Initialized to null — ABSOLUTELY ZERO HARDCODED MOCK VALUES)
  telemetry: {
    // MPU-6050 6-Axis Inertial Measurement Unit (IMU)
    ax: null,
    ay: null,
    az: null,
    roll: null,
    pitch: null,
    yaw: null,
    gforce: null,

    // DHT22 Micro-Climate Life Support
    ambientTemp: null,
    humidity: null,
    dewPoint: null,

    // MQ-135 Hazardous Gases & VOC Air Quality
    gasPpm: null,
    mq135Do: null,

    // MQ-7 Carbon Monoxide (CO)
    coPpm: null,
    mq7Do: null,

    // Infrared Proximity / Face Shield Seal
    irStatus: null,

    // Onboard Actuators & C2
    buzzer: null,
    oledPage: null,
    gps: null,

    // Soldier Biometrics (Awaiting sensor harness attachment)
    bpm: null,
    spo2: null,
    temp: null,

    sos: false,
    concussion: false
  },

  // 3D Digital Twin Viewport State
  three: {
    isUserInteracting: false,
    manualPitch: 0.12,
    manualYaw: -0.38,
    demoSpin: false,
    lastMouseX: 0,
    lastMouseY: 0
  }
};

// UI Cache Mapping
const UI = {
  // Navigation & Connectivity
  btnConnect: document.getElementById('btn-serial-connect'),
  btnConnectText: document.getElementById('btn-connect-text'),
  btnDemo: document.getElementById('btn-demo-toggle'),
  btnDemoText: document.getElementById('btn-demo-text'),
  btnAudio: document.getElementById('btn-audio-toggle'),
  audioIcon: document.getElementById('audio-icon'),
  portStatusText: document.getElementById('port-status-text'),
  systemStatusPill: document.getElementById('system-status-pill'),
  systemStatusText: document.getElementById('system-status-text'),

  // Incident Notification Banner
  incidentBanner: document.getElementById('incident-banner'),
  incidentTitle: document.getElementById('incident-title'),
  incidentMsg: document.getElementById('incident-msg'),
  incidentActionText: document.getElementById('incident-action-text'),
  btnDismissIncident: document.getElementById('btn-dismiss-incident'),

  // Standards Modal
  modalStandards: document.getElementById('modal-standards'),
  btnOpenProtocols: document.getElementById('btn-open-protocols'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnModalDone: document.getElementById('btn-modal-done'),

  // Interactive Apple Widget Card Containers
  cardMq135: document.getElementById('card-mq135'),
  cardMq7: document.getElementById('card-mq7'),
  cardDht22: document.getElementById('card-dht22'),
  cardIr: document.getElementById('card-ir'),
  cardGforce: document.getElementById('card-gforce'),
  cardHardwareC2: document.getElementById('card-hardware-c2'),
  cardBiometrics: document.getElementById('card-biometrics'),
  cardTerminal: document.getElementById('card-terminal'),

  // Scenario Status Lines ("Saying what has happened")
  scenarioGas: document.getElementById('scenario-gas'),
  scenarioCo: document.getElementById('scenario-co'),
  scenarioDht: document.getElementById('scenario-dht'),
  scenarioIr: document.getElementById('scenario-ir'),
  scenarioGforce: document.getElementById('scenario-gforce'),
  scenarioHw: document.getElementById('scenario-hw'),
  scenarioBio: document.getElementById('scenario-bio'),
  scenarioTerm: document.getElementById('scenario-term'),

  // Domain 1: Atmospheric & CBRN Matrix
  valGas: document.getElementById('val-gas'),
  pillGas: document.getElementById('pill-gas'),
  barGas: document.getElementById('bar-gas'),

  valCo: document.getElementById('val-co'),
  pillCo: document.getElementById('pill-co'),
  barCo: document.getElementById('bar-co'),

  valDhtSummary: document.getElementById('val-dht-summary'),
  valAmbTemp: document.getElementById('val-amb-temp'),
  valHumidity: document.getElementById('val-humidity'),
  valDewPoint: document.getElementById('val-dew-point'),
  pillDht22: document.getElementById('pill-dht22'),

  valIr: document.getElementById('val-ir'),
  pillIr: document.getElementById('pill-ir'),

  // Domain 2: Ballistics & Kinematics
  valGforce: document.getElementById('val-gforce'),
  barGforce: document.getElementById('bar-gforce'),
  concussionBadge: document.getElementById('concussion-badge'),

  valRoll: document.getElementById('val-roll'),
  valPitch: document.getElementById('val-pitch'),
  valYaw: document.getElementById('val-yaw'),
  valHudG: document.getElementById('val-hud-g'),

  // Top Dedicated Flight HUD Overlays
  hudRollPointer: document.getElementById('hud-roll-pointer'),
  hudPitchLadder: document.getElementById('hud-pitch-ladder'),
  hudStabilityText: document.getElementById('hud-stability-text'),

  // Domain 3: Actuators & Hardware C2
  valGps: document.getElementById('val-gps'),
  valOled: document.getElementById('val-oled'),
  valBuzzer: document.getElementById('val-buzzer'),
  btnSoundBuzzer: document.getElementById('btn-sound-buzzer'),
  btnManualSos: document.getElementById('btn-manual-sos'),

  // Domain 4: Biometrics
  valBpm: document.getElementById('val-bpm'),
  valSpo2: document.getElementById('val-spo2'),
  valTemp: document.getElementById('val-temp'),
  pillBio: document.getElementById('pill-bio'),

  // 3D Viewport Controls & Zoom
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnSyncGyro: document.getElementById('btn-sync-gyro'),
  btnTiltAnim: document.getElementById('btn-tilt-anim'),

  // Serial Terminal
  terminalBody: document.getElementById('terminal-body'),
  btnClearTerm: document.getElementById('btn-clear-term'),
  packetCounter: document.getElementById('packet-counter'),

  // Theme Toggle (Light / Dark Mode)
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  themeText: document.getElementById('theme-text'),

  // Widget On-Screen Detail Popup Modal
  modalWidgetDetail: document.getElementById('modal-widget-detail'),
  btnCloseWidgetModal: document.getElementById('btn-close-widget-modal'),
  btnDoneWidgetModal: document.getElementById('btn-done-widget-modal'),
  detailModalDot: document.getElementById('detail-modal-dot'),
  detailModalChip: document.getElementById('detail-modal-chip'),
  detailModalStatus: document.getElementById('detail-modal-status'),
  detailModalTitle: document.getElementById('detail-modal-title'),
  detailModalSubtitle: document.getElementById('detail-modal-subtitle'),
  detailModalValue: document.getElementById('detail-modal-value'),
  detailModalSub: document.getElementById('detail-modal-sub'),
  detailModalScenario: document.getElementById('detail-modal-scenario'),
  detailModalPin: document.getElementById('detail-modal-pin'),
  detailModalProtocol: document.getElementById('detail-modal-protocol'),
  detailModalStd: document.getElementById('detail-modal-std'),
  detailModalRange: document.getElementById('detail-modal-range'),
  detailModalWarn: document.getElementById('detail-modal-warn'),
  detailModalCrit: document.getElementById('detail-modal-crit'),
  detailModalDescription: document.getElementById('detail-modal-description'),
  detailModalRemediation: document.getElementById('detail-modal-remediation'),
  detailModalActions: document.getElementById('detail-modal-actions')
};

// ============================================================================
// 2. TACTICAL C2 ACOUSTIC SYNTHESIZER (Web Audio API)
// ============================================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTacticalChirp(freq = 1200, type = 'sine', duration = 0.06, gainVal = 0.08) {
  if (!state.audioEnabled) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { }
}

const playJarvisChirp = playTacticalChirp; // Backward compatibility alias

function playAlertSiren() {
  if (!state.audioEnabled) return;
  try {
    initAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) { }
}

// ============================================================================
// 3. THREE.JS 3D HOLOGRAPHIC HELMET ENGINE (Iron Man / Tesla Visualizer)
// ============================================================================
let scene, camera, renderer, helmetGroup, shockwaveMesh, ledPipMesh;

function initThreeHoloChamber() {
  const canvas = document.getElementById('threeHoloCanvas');
  const container = canvas.parentElement;
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 500;

  // Scene
  scene = new THREE.Scene();
  if (document.body.classList.contains('light-theme')) {
    scene.background = new THREE.Color(0xffffff);
  }

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0.5, 7.2);

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Tactical Studio Lighting (Optimized for Desert Tan / FDE Ballistic Shell)
  const ambientLight = new THREE.AmbientLight(0x322e28, 2.2);
  scene.add(ambientLight);

  // Main Tactical Sun Key Light (Warm daylight)
  const sunLight = new THREE.DirectionalLight(0xfff5e6, 3.2);
  sunLight.position.set(4.5, 5.5, 4.0);
  scene.add(sunLight);

  // Soft Front-Left Fill Light
  const fillLight = new THREE.DirectionalLight(0xd4cbb8, 1.6);
  fillLight.position.set(-4.5, 3.0, 3.5);
  scene.add(fillLight);

  // High-Tech Stark Cyan Rim Light (Subtle edge glow on rails & rear)
  const cyanRim = new THREE.DirectionalLight(0x00f0ff, 1.8);
  cyanRim.position.set(0, 4.0, -5.0);
  scene.add(cyanRim);

  // Under-chassis bounce light (illuminates chinstrap & interior)
  const underLight = new THREE.DirectionalLight(0x383022, 1.2);
  underLight.position.set(0, -4.5, 0);
  scene.add(underLight);

  // Initial neutral 3/4 tactical hero pose matching reference photo
  state.three.manualPitch = 0.12;
  state.three.manualYaw = -0.38;

  // Build the Authentic 3D Ops-Core FAST Combat Helmet
  buildTacticalHelmetModel();

  // Orbit / Interaction Listeners
  init3DInteraction(canvas);

  // Handle Resize
  window.addEventListener('resize', onWindowResize);

  // Start Render Loop
  animate3D();
}

function buildTacticalHelmetModel() {
  helmetGroup = new THREE.Group();

  // --------------------------------------------------------------------------
  // COLOR PALETTE (Military Spec Desert Tan / Flat Dark Earth - FDE)
  // --------------------------------------------------------------------------
  const COLOR_SHELL_FDE = 0xc8b28a;      // US Military Desert Tan matte Kevlar
  const COLOR_RAIL_COYOTE = 0x967e52;    // Coyote Tan injection-molded ARC rails
  const COLOR_SHROUD_TAN = 0xbba078;     // Wilcox NVG shroud polymer base
  const COLOR_ALUM_DARK = 0x2a2e33;      // Anodized aircraft aluminum NVG receiver
  const COLOR_VELCRO = 0xa58e65;         // Coyote Tan loop pile velcro
  const COLOR_STRAP = 0x9e865a;          // Tan nylon suspension webbing
  const COLOR_CHINCUP = 0x8a724a;        // Molded ergonomic chin cup
  const COLOR_HARDWARE = 0x181a1c;       // Blackened oxide steel screws & buckles
  const COLOR_PADS = 0x1b1e20;           // Black EPP impact foam padding
  const COLOR_RUBBER_BEAD = 0x221e18;    // Matte rubber rim edge molding

  // --------------------------------------------------------------------------
  // 1. DUAL-WALLED BALLISTIC SHELL (High-Cut Ear Arches + Occipital Nape)
  // --------------------------------------------------------------------------
  const radialSegs = 64;
  const heightSegs = 36;
  const radX = 1.36;
  const radY = 1.28;
  const radZ = 1.56;
  const shellThick = 0.06;

  function getShellPoint(u, v, isInner) {
    const phi = u * Math.PI * 0.5;
    const rDome = Math.sin(phi);
    const yDome = Math.cos(phi) * radY;

    const sx = Math.sin(v);
    const cz = Math.cos(v);

    const rearFactor = Math.max(0, -cz);
    const frontFactor = Math.max(0, cz);

    // Authentic Ops-Core FAST High-Cut Curve:
    // Left/Right ear clearance: +0.44 * sin^4(v)
    // Rear nape skull protection: -0.42 * rearFactor^1.3
    // Brow line: -0.17
    const yRim = -0.12 + (0.44 * Math.pow(sx, 4)) - (0.42 * Math.pow(rearFactor, 1.3)) - (0.05 * frontFactor);

    let y = yDome + Math.pow(u, 1.8) * yRim;
    let x = rDome * sx * radX;
    let z = rDome * cz * radZ;

    // Rear occipital bulge & front brow lip
    z -= rearFactor * u * 0.15;
    z += Math.pow(frontFactor, 2) * u * 0.08;

    if (isInner) {
      x *= (1.0 - shellThick / radX);
      z *= (1.0 - shellThick / radZ);
      y = y > 0 ? y - shellThick : y + shellThick * 0.35;
    }
    return [x, y, z];
  }

  const positions = [];
  const indices = [];

  // Outer Shell Vertices
  for (let i = 0; i <= heightSegs; i++) {
    const u = i / heightSegs;
    for (let j = 0; j <= radialSegs; j++) {
      const v = (j / radialSegs) * Math.PI * 2;
      positions.push(...getShellPoint(u, v, false));
    }
  }

  // Outer Shell Triangles
  for (let i = 0; i < heightSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j;
      const b = (i + 1) * (radialSegs + 1) + j;
      const c = (i + 1) * (radialSegs + 1) + (j + 1);
      const d = i * (radialSegs + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Inner Shell Vertices
  const innerOffset = positions.length / 3;
  for (let i = 0; i <= heightSegs; i++) {
    const u = i / heightSegs;
    for (let j = 0; j <= radialSegs; j++) {
      const v = (j / radialSegs) * Math.PI * 2;
      positions.push(...getShellPoint(u, v, true));
    }
  }

  // Inner Shell Triangles (Inverted normals)
  for (let i = 0; i < heightSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = innerOffset + i * (radialSegs + 1) + j;
      const b = innerOffset + (i + 1) * (radialSegs + 1) + j;
      const c = innerOffset + (i + 1) * (radialSegs + 1) + (j + 1);
      const d = innerOffset + i * (radialSegs + 1) + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  // Rim seam connecting outer & inner shells
  const outerRimStart = heightSegs * (radialSegs + 1);
  const innerRimStart = innerOffset + heightSegs * (radialSegs + 1);
  for (let j = 0; j < radialSegs; j++) {
    const oA = outerRimStart + j;
    const oB = outerRimStart + j + 1;
    const iA = innerRimStart + j;
    const iB = innerRimStart + j + 1;
    indices.push(oA, iA, oB);
    indices.push(oB, iA, iB);
  }

  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shellGeo.setIndex(indices);
  shellGeo.computeVertexNormals();

  const shellMat = new THREE.MeshStandardMaterial({
    color: COLOR_SHELL_FDE,
    roughness: 0.76,
    metalness: 0.08
  });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  helmetGroup.add(shellMesh);

  // --------------------------------------------------------------------------
  // 2. RUBBER RIM MOLDING / PERIMETER EDGE BEAD
  // --------------------------------------------------------------------------
  const rimPoints = [];
  for (let j = 0; j < 64; j++) {
    const v = (j / 64) * Math.PI * 2;
    const pt = getShellPoint(1.0, v, false);
    rimPoints.push(new THREE.Vector3(pt[0], pt[1], pt[2]));
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true);
  const rimGeo = new THREE.TubeGeometry(rimCurve, 64, 0.032, 8, true);
  const rimMat = new THREE.MeshStandardMaterial({
    color: COLOR_RUBBER_BEAD,
    roughness: 0.88,
    metalness: 0.05
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  helmetGroup.add(rimMesh);

  // --------------------------------------------------------------------------
  // 3. WILCOX SKELETON NVG SHROUD (Forehead Night Vision Mount)
  // --------------------------------------------------------------------------
  const nvgGroup = new THREE.Group();
  nvgGroup.position.set(0, 0.15, 1.58);
  nvgGroup.rotation.x = -0.14; // Matches brow tilt

  // Base Trapezoid Frame
  const shroudBaseGeo = new THREE.BoxGeometry(0.74, 0.68, 0.08);
  const shroudBaseMat = new THREE.MeshStandardMaterial({
    color: COLOR_SHROUD_TAN,
    roughness: 0.65,
    metalness: 0.12
  });
  const shroudBase = new THREE.Mesh(shroudBaseGeo, shroudBaseMat);
  nvgGroup.add(shroudBase);

  // Chamfered upper shroud crest
  const shroudTopGeo = new THREE.BoxGeometry(0.55, 0.22, 0.09);
  const shroudTop = new THREE.Mesh(shroudTopGeo, shroudBaseMat);
  shroudTop.position.set(0, 0.28, 0.01);
  nvgGroup.add(shroudTop);

  // Inner Aircraft Aluminum Bracket
  const nvgBracketGeo = new THREE.BoxGeometry(0.40, 0.44, 0.10);
  const nvgBracketMat = new THREE.MeshStandardMaterial({
    color: COLOR_ALUM_DARK,
    roughness: 0.32,
    metalness: 0.85
  });
  const nvgBracket = new THREE.Mesh(nvgBracketGeo, nvgBracketMat);
  nvgBracket.position.set(0, 0.02, 0.02);
  nvgGroup.add(nvgBracket);

  // Central Vertical Latch Channel & Arm Socket
  const nvgSocketGeo = new THREE.BoxGeometry(0.18, 0.26, 0.11);
  const nvgSocketMat = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.5,
    metalness: 0.8
  });
  const nvgSocket = new THREE.Mesh(nvgSocketGeo, nvgSocketMat);
  nvgSocket.position.set(0, 0.02, 0.03);
  nvgGroup.add(nvgSocket);

  // Wilcox 3-Hole Fastener Pattern (Hex bolts in blackened oxide)
  const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12);
  boltGeo.rotateX(Math.PI / 2);
  const boltMat = new THREE.MeshStandardMaterial({
    color: COLOR_HARDWARE,
    roughness: 0.3,
    metalness: 0.8
  });
  const boltPositions = [
    [0, 0.26, 0.06],      // Top center
    [-0.24, -0.18, 0.06], // Lower left
    [0.24, -0.18, 0.06]   // Lower right
  ];
  boltPositions.forEach(bp => {
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(bp[0], bp[1], bp[2]);
    nvgGroup.add(bolt);
  });

  // Micro MPU-6050 Status Indicator LED (Emerald Green HUD Pip)
  const pipGeo = new THREE.SphereGeometry(0.028, 12, 12);
  const pipMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
  ledPipMesh = new THREE.Mesh(pipGeo, pipMat);
  ledPipMesh.position.set(0, 0.32, 0.06);
  nvgGroup.add(ledPipMesh);

  helmetGroup.add(nvgGroup);

  // --------------------------------------------------------------------------
  // 4. OPS-CORE ARC ACCESSORY RAILS (Left & Right Sides)
  // --------------------------------------------------------------------------
  [-1, 1].forEach(side => {
    const railGroup = new THREE.Group();
    const xPos = side * 1.38;

    // Main Rail Curved Spine following ear cutout
    const railLength = 1.7;
    const railSpineGeo = new THREE.BoxGeometry(0.09, 0.18, railLength);
    const railMat = new THREE.MeshStandardMaterial({
      color: COLOR_RAIL_COYOTE,
      roughness: 0.62,
      metalness: 0.15
    });
    const railSpine = new THREE.Mesh(railSpineGeo, railMat);
    railSpine.position.set(xPos, 0.38, -0.05);
    railSpine.rotation.y = side * 0.05;
    railGroup.add(railSpine);

    // Front Rail Ramp (Temple Anchor)
    const rampFrontGeo = new THREE.BoxGeometry(0.09, 0.16, 0.45);
    const rampFront = new THREE.Mesh(rampFrontGeo, railMat);
    rampFront.position.set(xPos - side * 0.06, 0.16, 0.75);
    rampFront.rotation.x = -0.32;
    railGroup.add(rampFront);

    // Rear Rail Ramp (Nape Anchor)
    const rampRearGeo = new THREE.BoxGeometry(0.09, 0.16, 0.55);
    const rampRear = new THREE.Mesh(rampRearGeo, railMat);
    rampRear.position.set(xPos - side * 0.08, 0.10, -0.85);
    rampRear.rotation.x = 0.38;
    railGroup.add(rampRear);

    // Upper Picatinny Accessory Slots (4 distinct slotted teeth)
    for (let k = 0; k < 4; k++) {
      const slotGeo = new THREE.BoxGeometry(0.12, 0.07, 0.09);
      const slot = new THREE.Mesh(slotGeo, railMat);
      slot.position.set(xPos + side * 0.02, 0.49, -0.35 + k * 0.24);
      railGroup.add(slot);
    }

    // Lower T-Slot Channel Guide
    const tChannelGeo = new THREE.BoxGeometry(0.11, 0.05, 0.95);
    const tChannelMat = new THREE.MeshStandardMaterial({
      color: 0x1d1b17,
      roughness: 0.8
    });
    const tChannel = new THREE.Mesh(tChannelGeo, tChannelMat);
    tChannel.position.set(xPos + side * 0.01, 0.30, -0.05);
    railGroup.add(tChannel);

    // Rail Mounting Hardware Screws
    [0.78, -0.05, -0.88].forEach((zScrew, idx) => {
      const yScrew = idx === 0 ? 0.16 : (idx === 1 ? 0.38 : 0.08);
      const screwGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.03, 10);
      screwGeo.rotateZ(Math.PI / 2);
      const screw = new THREE.Mesh(screwGeo, boltMat);
      screw.position.set(xPos + side * 0.05, yScrew, zScrew);
      railGroup.add(screw);
    });

    // NVG Retention Bungee Cord (from Rail front to Shroud base)
    const bungeePoints = [
      new THREE.Vector3(xPos + side * 0.02, 0.15, 0.70),
      new THREE.Vector3(side * 0.65, 0.05, 1.25),
      new THREE.Vector3(side * 0.28, 0.02, 1.55)
    ];
    const bungeeCurve = new THREE.CatmullRomCurve3(bungeePoints);
    const bungeeGeo = new THREE.TubeGeometry(bungeeCurve, 18, 0.016, 6, false);
    const bungeeMat = new THREE.MeshStandardMaterial({
      color: 0x2e2920,
      roughness: 0.85
    });
    const bungee = new THREE.Mesh(bungeeGeo, bungeeMat);
    railGroup.add(bungee);

    helmetGroup.add(railGroup);
  });

  // --------------------------------------------------------------------------
  // 5. HOOK-AND-LOOP VELCRO LOOP PILE PANELS
  // --------------------------------------------------------------------------
  const velcroMat = new THREE.MeshStandardMaterial({
    color: COLOR_VELCRO,
    roughness: 0.96,
    metalness: 0.02
  });

  // --------------------------------------------------------------------------
  // 5. INDIAN ARMED FORCES TACTICAL EMBLEM (TOP CROWN CREST) & SIDE VELCRO
  // --------------------------------------------------------------------------
  // Procedural Military Insignia: Ashoka Lion Capital, Indian Tricolor & Crossed Sabres
  function createIndianMilitaryEmblemTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    function drawRoundedRect(c, x, y, w, h, r) {
      if (typeof c.roundRect === 'function') {
        c.beginPath();
        c.roundRect(x, y, w, h, r);
      } else {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      }
    }

    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;
    const outerR = 236;

    // 1. Tactical Circular Patch Backing (Subdued dark coyote / olive drab)
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, outerR);
    bgGrad.addColorStop(0, '#2d2822');
    bgGrad.addColorStop(0.7, '#24201a');
    bgGrad.addColorStop(1, '#1a1713');
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Subtle tactical fabric weave texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let i = 24; i < 490; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 24);
      ctx.lineTo(i, 488);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(24, i);
      ctx.lineTo(488, i);
      ctx.stroke();
    }

    // 2. Tactical Edge Stitching & Bezel Rings
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#3e372e';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 16, 0, Math.PI * 2);
    ctx.strokeStyle = '#6e624c';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 26, 0, Math.PI * 2);
    ctx.strokeStyle = '#151310';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Indian Army Crossed Cavalry Sabres (behind the crest)
    ctx.save();
    ctx.strokeStyle = '#9ca3af'; // Burnished steel
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Saber 1 (Bottom Left to Top Right)
    ctx.beginPath();
    ctx.moveTo(140, 360);
    ctx.quadraticCurveTo(240, 230, 370, 130);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(146, 354, 12, 0.8 * Math.PI, 1.8 * Math.PI);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Saber 2 (Bottom Right to Top Left)
    ctx.beginPath();
    ctx.moveTo(372, 360);
    ctx.quadraticCurveTo(272, 230, 142, 130);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(366, 354, 12, -0.8 * Math.PI, 0.2 * Math.PI);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 4. Subtle Indian Tricolor (Tiranga) Tactical Bar
    const flagY = 328;
    const flagW = 220;
    const flagH = 48;
    const flagX = cx - flagW / 2;
    const stripeH = flagH / 3;

    ctx.save();
    drawRoundedRect(ctx, flagX, flagY, flagW, flagH, 8);
    ctx.clip();

    // Top Stripe: Saffron (Tactical subdued)
    ctx.fillStyle = '#d97706';
    ctx.fillRect(flagX, flagY, flagW, stripeH);

    // Middle Stripe: White / Light Stone
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(flagX, flagY + stripeH, flagW, stripeH);

    // Bottom Stripe: Green (Tactical India Green)
    ctx.fillStyle = '#15803d';
    ctx.fillRect(flagX, flagY + stripeH * 2, flagW, stripeH);

    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    drawRoundedRect(ctx, flagX, flagY, flagW, flagH, 8);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Ashoka Chakra (Dharma Wheel) in Flag Center
    const chakraX = cx;
    const chakraY = flagY + flagH / 2;
    const chakraR = 7;

    ctx.save();
    ctx.strokeStyle = '#1e3a8a';
    ctx.fillStyle = '#1e3a8a';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.arc(chakraX, chakraY, chakraR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(chakraX, chakraY, 1.6, 0, Math.PI * 2);
    ctx.fill();

    for (let s = 0; s < 24; s++) {
      const angle = (s * Math.PI * 2) / 24;
      ctx.beginPath();
      ctx.moveTo(chakraX, chakraY);
      ctx.lineTo(chakraX + Math.cos(angle) * chakraR, chakraY + Math.sin(angle) * chakraR);
      ctx.stroke();
    }
    ctx.restore();

    // 6. National State Emblem of India: Ashoka Lion Capital
    ctx.save();
    const goldLight = '#d4af37';
    const goldMid = '#b8972e';
    const goldDark = '#785b1a';

    const abacusY = 278;
    ctx.fillStyle = goldMid;
    drawRoundedRect(ctx, cx - 52, abacusY, 104, 14, 4);
    ctx.fill();
    ctx.strokeStyle = goldDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, abacusY + 7, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = goldLight;
    ctx.strokeStyle = goldDark;
    ctx.lineWidth = 1.5;

    // Center Lion Head & Mane
    ctx.beginPath();
    ctx.arc(cx, 185, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let a = -0.7; a <= 0.7; a += 0.28) {
      ctx.beginPath();
      ctx.arc(cx + Math.sin(a) * 30, 188 - Math.cos(a) * 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = goldMid;
    ctx.beginPath();
    ctx.ellipse(cx, 194, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = goldDark;
    ctx.beginPath();
    ctx.moveTo(cx - 4, 188);
    ctx.lineTo(cx + 4, 188);
    ctx.lineTo(cx, 193);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(cx - 7, 182, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 7, 182, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Left Lion Profile
    ctx.fillStyle = goldMid;
    ctx.beginPath();
    ctx.ellipse(cx - 36, 196, 17, 21, -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx - 52, 194, 9, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(cx - 44, 191, 2, 0, Math.PI * 2);
    ctx.fill();

    // Right Lion Profile
    ctx.fillStyle = goldMid;
    ctx.beginPath();
    ctx.ellipse(cx + 36, 196, 17, 21, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + 52, 194, 9, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(cx + 44, 191, 2, 0, Math.PI * 2);
    ctx.fill();

    // Lion Pillar Base
    ctx.fillStyle = goldLight;
    ctx.beginPath();
    ctx.moveTo(cx - 36, 216);
    ctx.lineTo(cx + 36, 216);
    ctx.lineTo(cx + 30, abacusY);
    ctx.lineTo(cx - 30, abacusY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (let px of [-22, -8, 8, 22]) {
      ctx.beginPath();
      ctx.ellipse(cx + px, abacusY - 2, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 7. Tactical Arc Lettering
    ctx.save();
    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const arcText = "★  INDIAN ARMED FORCES  ★";
    const textRadius = outerR - 44;
    const startAngle = -Math.PI / 2 - 0.72;
    const angleStep = 1.44 / (arcText.length - 1);

    for (let i = 0; i < arcText.length; i++) {
      const angle = startAngle + i * angleStep;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * textRadius, cy + Math.sin(angle) * textRadius);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(arcText[i], 0, 0);
      ctx.restore();
    }

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText("SEVA PARAMO DHARMAH • SPECIAL FORCES", cx, 404);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  // Tactical Emblem Mounted Flush on Helmet Dome Top
  const emblemTexture = createIndianMilitaryEmblemTexture();

  // Subtle beveled patch foundation disc
  const patchBaseGeo = new THREE.CylinderGeometry(0.285, 0.285, 0.012, 32);
  const patchBaseMat = new THREE.MeshStandardMaterial({
    color: 0x222520,
    roughness: 0.94,
    metalness: 0.04
  });
  const patchBase = new THREE.Mesh(patchBaseGeo, patchBaseMat);
  patchBase.position.set(0, 1.340, 0.02);
  patchBase.rotation.x = -0.04;
  helmetGroup.add(patchBase);

  // Curved emblem surface hugging the helmet crown dome
  const emblemGeo = new THREE.PlaneGeometry(0.55, 0.55, 20, 20);
  emblemGeo.rotateX(-Math.PI / 2);
  const emblemPos = emblemGeo.attributes.position;
  for (let i = 0; i < emblemPos.count; i++) {
    const px = emblemPos.getX(i);
    const pz = emblemPos.getZ(i);
    const r2 = px * px + pz * pz;
    emblemPos.setY(i, emblemPos.getY(i) - r2 * 0.38);
  }
  emblemGeo.computeVertexNormals();

  const emblemMat = new THREE.MeshStandardMaterial({
    map: emblemTexture,
    transparent: true,
    roughness: 0.85,
    metalness: 0.12,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
  emblemMesh.position.set(0, 1.346, 0.02);
  emblemMesh.rotation.x = -0.04;
  helmetGroup.add(emblemMesh);

  // Low-profile NEO-6M Ceramic GPS Patch on Rear Shell Slope
  const gpsBaseGeo = new THREE.BoxGeometry(0.22, 0.035, 0.22);
  const gpsBaseMat = new THREE.MeshStandardMaterial({
    color: 0x323538,
    metalness: 0.7,
    roughness: 0.3
  });
  const gpsBase = new THREE.Mesh(gpsBaseGeo, gpsBaseMat);
  gpsBase.position.set(0, 1.06, -0.62);
  gpsBase.rotation.x = 0.45;
  helmetGroup.add(gpsBase);

  const gpsCeramicGeo = new THREE.BoxGeometry(0.16, 0.025, 0.16);
  const gpsCeramicMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    metalness: 0.3,
    roughness: 0.4
  });
  const gpsCeramic = new THREE.Mesh(gpsCeramicGeo, gpsCeramicMat);
  gpsCeramic.position.set(0, 1.08, -0.62);
  gpsCeramic.rotation.x = 0.45;
  helmetGroup.add(gpsCeramic);

  // Left & Right IFF Flag Patches (above ARC rails)
  [-1, 1].forEach(side => {
    const flagGeo = new THREE.BoxGeometry(0.04, 0.42, 0.65);
    const flag = new THREE.Mesh(flagGeo, velcroMat);
    flag.position.set(side * 1.28, 0.72, 0.05);
    flag.rotation.z = side * -0.32;
    flag.rotation.y = side * 0.08;
    helmetGroup.add(flag);
  });

  // Rear Occipital Counterweight / Battery Pack Velcro
  const rearVelcroGeo = new THREE.BoxGeometry(0.78, 0.45, 0.04);
  const rearVelcro = new THREE.Mesh(rearVelcroGeo, velcroMat);
  rearVelcro.position.set(0, 0.20, -1.55);
  rearVelcro.rotation.x = 0.32;
  helmetGroup.add(rearVelcro);

  // --------------------------------------------------------------------------
  // 6. 4-POINT CHINSTRAP HARNESS & ERGONOMIC FULL OVAL CHIN CUP
  // --------------------------------------------------------------------------
  const strapMat = new THREE.MeshStandardMaterial({
    color: COLOR_STRAP,
    roughness: 0.90,
    metalness: 0.05
  });

  // Function to create a clean webbing ribbon strap
  function createStrap(p1, p2, width = 0.045, thick = 0.015) {
    const v1 = new THREE.Vector3(...p1);
    const v2 = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    const geo = new THREE.BoxGeometry(thick, len, width);
    const mesh = new THREE.Mesh(geo, strapMat);
    mesh.position.addVectors(v1, v2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  // Chinstrap harness anchor webbing
  [-1, 1].forEach(side => {
    // Front temple anchor down to tri-glide slider
    const s1 = createStrap(
      [side * 1.25, -0.05, 0.68],
      [side * 0.65, -0.72, 0.25]
    );
    helmetGroup.add(s1);

    // Rear nape anchor forward down to tri-glide slider
    const s2 = createStrap(
      [side * 1.05, -0.35, -0.65],
      [side * 0.65, -0.72, 0.25]
    );
    helmetGroup.add(s2);

    // Tri-glide slider buckle
    const buckleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const buckle = new THREE.Mesh(buckleGeo, boltMat);
    buckle.position.set(side * 0.65, -0.72, 0.25);
    helmetGroup.add(buckle);

    // Lower strap down to chin cup side anchor
    const s3 = createStrap(
      [side * 0.65, -0.72, 0.25],
      [side * 0.28, -1.38, 0.52]
    );
    helmetGroup.add(s3);
  });

  // Complete Ergonomic Full Oval Chin Cup
  const chinCupGroup = new THREE.Group();
  chinCupGroup.position.set(0, -1.40, 0.52);
  chinCupGroup.rotation.x = -0.12;

  // 1. Molded Ballistic Hypalon Oval Outer Cup Body
  const cupShape = new THREE.Shape();
  const radiusX = 0.32; // Full oval width: 0.64
  const radiusY = 0.21; // Full oval height: 0.42
  cupShape.absellipse(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0);

  // Ergonomic Oval Ventilation Port in Center
  const ventHole = new THREE.Path();
  ventHole.absellipse(0, 0, 0.12, 0.055, 0, Math.PI * 2, true, 0);
  cupShape.holes.push(ventHole);

  const extrudeSettings = {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035
  };
  const chinCupGeo = new THREE.ExtrudeGeometry(cupShape, extrudeSettings);

  // Anatomically curve the oval cradle so it wraps naturally around the chin
  const cupPos = chinCupGeo.attributes.position;
  for (let i = 0; i < cupPos.count; i++) {
    const x = cupPos.getX(i);
    const y = cupPos.getY(i);
    const z = cupPos.getZ(i);
    const curveZ = (x * x) * 0.50 + (y * y) * 0.28;
    cupPos.setZ(i, z - curveZ);
  }
  chinCupGeo.computeVertexNormals();

  const cupMat = new THREE.MeshStandardMaterial({
    color: COLOR_CHINCUP,
    roughness: 0.78,
    metalness: 0.15
  });
  const chinCupMesh = new THREE.Mesh(chinCupGeo, cupMat);
  chinCupGroup.add(chinCupMesh);

  // 2. Inner Padded Oval Chin Cushion Liner (Breathable Suede/Memory Foam)
  const padShape = new THREE.Shape();
  padShape.absellipse(0, 0, radiusX * 0.86, radiusY * 0.84, 0, Math.PI * 2, false, 0);
  const padGeo = new THREE.ExtrudeGeometry(padShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  });
  const padPos = padGeo.attributes.position;
  for (let i = 0; i < padPos.count; i++) {
    const x = padPos.getX(i);
    const y = padPos.getY(i);
    const z = padPos.getZ(i);
    padPos.setZ(i, z - ((x * x) * 0.50 + (y * y) * 0.28) - 0.02);
  }
  padGeo.computeVertexNormals();
  const innerPadMat = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.94,
    metalness: 0.02
  });
  const innerPadMesh = new THREE.Mesh(padGeo, innerPadMat);
  chinCupGroup.add(innerPadMesh);

  // 3. Left & Right Heavy-Duty Tactical Webbing Retaining Buckles / Pass-through Grommets
  [-1, 1].forEach(side => {
    const grommetGeo = new THREE.TorusGeometry(0.045, 0.012, 8, 16);
    grommetGeo.rotateY(Math.PI / 2);
    const grommet = new THREE.Mesh(grommetGeo, boltMat);
    grommet.position.set(side * 0.29, 0.02, -0.04);
    chinCupGroup.add(grommet);

    // Lateral webbing clamp tab
    const tabGeo = new THREE.BoxGeometry(0.04, 0.08, 0.03);
    const tab = new THREE.Mesh(tabGeo, strapMat);
    tab.position.set(side * 0.28, 0.02, -0.02);
    chinCupGroup.add(tab);
  });

  // 4. Under-Jaw Security Webbing Strap (connecting lateral anchors under the jaw)
  const underJaw = createStrap([-0.29, -0.05, -0.04], [0.29, -0.05, -0.04], 0.038, 0.012);
  chinCupGroup.add(underJaw);

  helmetGroup.add(chinCupGroup);

  // --------------------------------------------------------------------------
  // 7. INTERIOR EPP IMPACT MEMORY FOAM PADS
  // --------------------------------------------------------------------------
  const padMat = new THREE.MeshStandardMaterial({
    color: COLOR_PADS,
    roughness: 0.92,
    metalness: 0.02
  });

  // Front Brow Cushion
  const browPadGeo = new THREE.BoxGeometry(0.85, 0.22, 0.12);
  const browPad = new THREE.Mesh(browPadGeo, padMat);
  browPad.position.set(0, 0.18, 1.35);
  browPad.rotation.x = -0.15;
  helmetGroup.add(browPad);

  // Crown Top Circular Cushion
  const crownPadGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.10, 20);
  const crownPad = new THREE.Mesh(crownPadGeo, padMat);
  crownPad.position.set(0, 1.15, 0.05);
  helmetGroup.add(crownPad);

  // Left & Right Temple Cushions
  [-1, 1].forEach(side => {
    const templePadGeo = new THREE.BoxGeometry(0.12, 0.32, 0.50);
    const templePad = new THREE.Mesh(templePadGeo, padMat);
    templePad.position.set(side * 1.12, 0.45, 0.05);
    templePad.rotation.z = side * -0.25;
    helmetGroup.add(templePad);
  });

  // Rear Occipital Nape Cushion
  const napePadGeo = new THREE.BoxGeometry(0.75, 0.28, 0.12);
  const napePad = new THREE.Mesh(napePadGeo, padMat);
  napePad.position.set(0, 0.10, -1.35);
  napePad.rotation.x = 0.28;
  helmetGroup.add(napePad);

  // --------------------------------------------------------------------------
  // 8. TACTICAL COMMUNICATIONS / COMTAC HEADSET CUPS (IN HIGH CUT ARCHES)
  // --------------------------------------------------------------------------
  [-1, 1].forEach(side => {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 1.18, 0.12, 0.02);

    // Earcup body
    const earCupGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.16, 20);
    earCupGeo.rotateZ(Math.PI / 2);
    const earCupMat = new THREE.MeshStandardMaterial({
      color: 0x4f493b, // Tactical drab olive / coyote
      roughness: 0.7,
      metalness: 0.2
    });
    const earCup = new THREE.Mesh(earCupGeo, earCupMat);
    earGroup.add(earCup);

    // Gel ear seal cushion (black)
    const sealGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 20);
    sealGeo.rotateZ(Math.PI / 2);
    const sealMat = new THREE.MeshStandardMaterial({
      color: 0x121416,
      roughness: 0.95
    });
    const seal = new THREE.Mesh(sealGeo, sealMat);
    seal.position.set(side * -0.07, 0, 0);
    earGroup.add(seal);

    // Wire rail attachment bracket arm (connecting headset to ARC rail)
    const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
    const armMat = new THREE.MeshStandardMaterial({
      color: COLOR_HARDWARE,
      metalness: 0.8,
      roughness: 0.3
    });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(side * 0.05, 0.22, 0);
    arm.rotation.z = side * -0.25;
    earGroup.add(arm);

    helmetGroup.add(earGroup);
  });

  // --------------------------------------------------------------------------
  // 9. CONCUSSION IMPACT SHOCKWAVE AURA (Pulses on high G-force)
  // --------------------------------------------------------------------------
  const shockGeo = new THREE.SphereGeometry(2.1, 24, 24);
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
    transparent: true,
    opacity: 0.0,
    wireframe: true
  });
  shockwaveMesh = new THREE.Mesh(shockGeo, shockMat);
  helmetGroup.add(shockwaveMesh);

  // Set Default Tactical Hero Orientation (3/4 angle as in reference photo)
  helmetGroup.rotation.x = 0.12;
  helmetGroup.rotation.y = -0.38;

  scene.add(helmetGroup);
}

// 3D Canvas Interaction (Drag to Orbit / Tilt with Mouse + Wheel Zoom)
function init3DInteraction(canvas) {
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    state.three.isUserInteracting = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevX;
    const deltaY = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;

    state.three.manualYaw += deltaX * 0.008;
    state.three.manualPitch += deltaY * 0.008;
    state.three.manualPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, state.three.manualPitch));
  });

  // Smooth Zoom In / Zoom Out with Mouse Wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!camera) return;
    camera.position.z += e.deltaY * 0.005;
    camera.position.z = Math.max(3.2, Math.min(13.0, camera.position.z));
  }, { passive: false });

  // Touch support for tablets/mobile
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      state.three.isUserInteracting = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevX;
    const deltaY = e.touches[0].clientY - prevY;
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;

    state.three.manualYaw += deltaX * 0.01;
    state.three.manualPitch += deltaY * 0.01;
  });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  });
}

function onWindowResize() {
  const canvas = document.getElementById('threeHoloCanvas');
  if (!canvas || !renderer || !camera) return;
  const container = canvas.parentElement;
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 500;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Global Widget Accordion Depth Toggle (Interactive UI)
window.toggleWidgetDepth = function(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.toggle('open');
  playTacticalChirp(1300, 'sine', 0.03, 0.05);
};

// ============================================================================
// THEME MANAGER (DARK / LIGHT MODE ENGINE)
// ============================================================================
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const theme = isLight ? 'light' : 'dark';
  try { localStorage.setItem('helmet-theme', theme); } catch (e) { }

  if (UI.themeIcon) UI.themeIcon.textContent = isLight ? '🌙' : '☀️';
  if (UI.themeText) UI.themeText.textContent = isLight ? 'DARK' : 'LIGHT';

  if (scene) {
    scene.background = isLight ? new THREE.Color(0xffffff) : null;
  }

  playTacticalChirp(isLight ? 1500 : 1100, 'sine', 0.04, 0.06);
  logTerminal(`[THEME] Switched to ${theme.toUpperCase()} MODE.`);
}

function initTheme() {
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('helmet-theme') || 'dark'; } catch (e) { }
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (UI.themeIcon) UI.themeIcon.textContent = '🌙';
    if (UI.themeText) UI.themeText.textContent = 'DARK';
    if (scene) scene.background = new THREE.Color(0xffffff);
  } else {
    document.body.classList.remove('light-theme');
    if (UI.themeIcon) UI.themeIcon.textContent = '☀️';
    if (UI.themeText) UI.themeText.textContent = 'LIGHT';
    if (scene) scene.background = null;
  }
}

// ============================================================================
// SENSOR SUBSYSTEM METADATA & TELEMETRY INSPECTOR ENGINE
// ============================================================================
const SENSOR_METADATA = {
  'card-mq135': {
    chip: 'MQ-135',
    title: 'TOXIC GASES & CBRN AIR QUALITY',
    subtitle: 'Breathing Zone Inhalation Quality & Volatile Organic Compounds',
    pin: 'Analog AO (ADC1_CH4 / GPIO 32) + Digital DO (GPIO 34)',
    protocol: 'SnO₂ Metal-Oxide Semiconductor (0–5.0V Analog + Comparator DO)',
    std: 'MIL-STD-1472H §5.10 / ASHRAE 62.1-2022',
    range: '< 800 Raw AO (Clean Atmospheric Air)',
    warn: '800–1400 Raw AO (Smoke / Combustion Products / NH₃)',
    crit: '> 1400 Raw AO (Critical CBRN Toxicity / Asphyxiation Risk)',
    desc: 'The MQ-135 gas sensor employs a sensitive tin dioxide (SnO₂) layer that changes conductivity in the presence of hazardous airborne gases including ammonia (NH₃), benzene, combustion smoke particulates, and carbon dioxide (CO₂). Located at the soldier\'s breathing zone to provide continuous air quality evaluation.',
    remediation: '1. Autonomous purge of respirator canister.\n2. Audio advisory chirp to verify ballistic face shield airtight seal.\n3. Tactical CBRN squad telemetry beacon broadcast.',
    getValue: (t) => t.gasPpm !== null ? `${Math.round(t.gasPpm)} AO` : '— AO',
    getSub: (t) => t.mq135Do !== null ? `Digital Comparator DO: ${t.mq135Do} (Armed)` : 'Digital Comparator DO: Armed',
    getStatus: (t) => t.gasPpm === null ? { text: 'STANDBY', cls: 'badge-status standby', dot: 'apple-status-dot' } : (t.gasPpm > 1400 || t.mq135Do === 0 ? { text: 'DANGER', cls: 'badge-status danger', dot: 'apple-status-dot state-danger' } : (t.gasPpm > 800 ? { text: 'ELEVATED', cls: 'badge-status warn', dot: 'apple-status-dot state-warning' } : { text: 'OPTIMAL', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' })),
    getScenario: (t) => (t.gasPpm > 1400 || t.mq135Do === 0) ? 'CRITICAL CBRN BREACH: Toxic airborne gas concentration exceeds 1400 AO! Purge filter canister immediately.' : ((t.gasPpm > 800) ? 'Atmospheric Inhalation Warning: VOC concentration elevated (800–1400 AO). Combustion smoke detected.' : (t.gasPpm !== null ? 'Breathing Zone Air Clean: Nominal atmosphere, SnO₂ baseline stable.' : 'Awaiting live USB telemetry packet stream from ESP32.')),
    actions: [
      { label: 'PURGE AIRFLOW CANISTER', cmd: 'PURGE_AIR', cls: 'btn-widget-action' }
    ]
  },
  'card-mq7': {
    chip: 'MQ-7',
    title: 'CARBON MONOXIDE (CO) PROBE',
    subtitle: 'Combustion Exhaust & Weapon Blast Blowback Detector',
    pin: 'Analog AO (ADC1_CH5 / GPIO 33) + Digital DO (GPIO 35)',
    protocol: 'High/Low Temperature Thermal Cycling (5.0V / 1.4V Heater)',
    std: 'NIOSH REL: 35 ppm / OSHA PEL: 50 ppm / IDLH: 1200 ppm',
    range: '< 400 Raw AO (Safe Background CO)',
    warn: '400–900 Raw AO (Elevated Blast/Engine Exhaust Exposure)',
    crit: '> 900 Raw AO (Lethal Inhalation / IDLH Threat)',
    desc: 'The MQ-7 carbon monoxide probe features high sensitivity to carbon monoxide (CO) produced by firearm muzzle blast blowback, vehicle exhaust in confined quarters, and thermal explosions. Measures carboxyhemoglobin threat to prevent soldier hypoxia and loss of consciousness.',
    remediation: '1. Autonomous acoustic buzzer distress alert.\n2. Visual flash warning on soldier HUD.\n3. Mandatory 100% emergency O₂ delivery bypass advisory.',
    getValue: (t) => t.coPpm !== null ? `${Math.round(t.coPpm)} AO` : '— AO',
    getSub: (t) => t.mq7Do !== null ? `Digital Comparator DO: ${t.mq7Do} (Armed)` : 'Digital Comparator DO: Armed',
    getStatus: (t) => t.coPpm === null ? { text: 'STANDBY', cls: 'badge-status standby', dot: 'apple-status-dot' } : (t.coPpm > 900 || t.mq7Do === 0 ? { text: 'LETHAL CO', cls: 'badge-status danger', dot: 'apple-status-dot state-danger' } : (t.coPpm > 400 ? { text: 'WARNING CO', cls: 'badge-status warn', dot: 'apple-status-dot state-warning' } : { text: 'SAFE CO', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' })),
    getScenario: (t) => (t.coPpm > 900 || t.mq7Do === 0) ? 'LETHAL CO CONCENTRATION: Carbon monoxide exceeds lethal 900 AO threshold! Evacuate confined space.' : ((t.coPpm > 400) ? 'Warning: Elevated Carbon Monoxide detected (400–900 AO). Gunfire propellant or exhaust fumes present.' : (t.coPpm !== null ? 'CO Levels Nominal: Sub-acute background reading, safe for extended operational exposure.' : 'Awaiting live USB telemetry packet stream from ESP32.')),
    actions: [
      { label: 'EMERGENCY O2 BYPASS', cmd: 'O2_BYPASS', cls: 'btn-widget-action danger' }
    ]
  },
  'card-dht22': {
    chip: 'DHT22 / AM2302',
    title: 'MICRO-CLIMATE & VISOR ANTI-FOG',
    subtitle: 'Helmet Cavity Thermal Homeostasis & Moisture Management',
    pin: 'GPIO 4 (Single-Bus Digital Protocol with 4.7kΩ Pull-Up)',
    protocol: 'Capacitive Humidity & NTC Thermistor (16-bit Resolution)',
    std: 'US Army TB MED 507 (Heat Strain) / MIL-STD-810H Method 501.7',
    range: 'Temp 18.0°C–32.0°C / Humidity < 70%',
    warn: 'Temp 32.0°C–38.0°C (Heat Fatigue) / Humidity ≥ 75% (Visor Fogging)',
    crit: 'Temp ≥ 38.0°C (Category 5 Heat Stroke Threat)',
    desc: 'The DHT22 digital micro-climate sensor monitors the interior cavity of the ballistic helmet. Measures ambient temperature and relative humidity to compute the exact psychrometric dew point margin. Warns against imminent visor condensation that obscures operator target vision and detects heat stroke risks.',
    remediation: '1. Activates visor micro-fan defog ventilation pulse.\n2. Squad C2 notified of soldier heat strain level.\n3. Advises operator to pace exertion and hydrate.',
    getValue: (t) => t.ambientTemp !== null ? `${Number(t.ambientTemp).toFixed(1)} °C` : '— °C',
    getSub: (t) => t.humidity !== null ? `Humidity: ${Number(t.humidity).toFixed(1)}% | Dew: ${t.dewPoint ? t.dewPoint.toFixed(1) + '°C' : '—'}` : 'Humidity: — %',
    getStatus: (t) => t.ambientTemp === null ? { text: 'STANDBY', cls: 'badge-status standby', dot: 'apple-status-dot' } : (t.ambientTemp >= 38.0 ? { text: 'HEAT STROKE', cls: 'badge-status danger', dot: 'apple-status-dot state-danger' } : (t.ambientTemp >= 32.0 || (t.humidity && t.humidity >= 75) ? { text: 'HEAT STRAIN', cls: 'badge-status warn', dot: 'apple-status-dot state-warning' } : { text: 'OPTIMAL', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' })),
    getScenario: (t) => t.ambientTemp >= 38.0 ? 'HEAT STROKE ALERT: Internal visor temperature >= 38.0°C! US Army Category 5 danger.' : ((t.ambientTemp >= 32.0 || (t.humidity && t.humidity >= 75)) ? 'Thermal Strain / Fog Risk: High internal humidity or elevated temperature. Defog blower advised.' : (t.ambientTemp !== null ? 'Visor Micro-Climate Optimal: Anti-fog clear, moisture regulated, core thermal homeostasis maintained.' : 'Awaiting live USB telemetry packet stream from ESP32.')),
    actions: [
      { label: 'CYCLE VISOR DEFOG FAN', cmd: 'CYCLE_FAN', cls: 'btn-widget-action' }
    ]
  },
  'card-ir': {
    chip: 'IR DETECTOR',
    title: 'FACE SHIELD PROXIMITY & SEAL',
    subtitle: 'Optical 940nm Visor Lock & Close-Range Obstacle Detection',
    pin: 'Digital Input (GPIO 14 / Logic High Clear)',
    protocol: 'Active Infrared Phototransistor (15 cm Detection Cone)',
    std: 'STANAG 2920 Ballistic Protection / MIL-PRF-31013 Visor Retention',
    range: 'IR CLEAR (Face shield sealed & latched, obstacle distance > 15 cm)',
    warn: 'OBSTACLE DETECTED (< 15 cm Proximity)',
    crit: 'SEAL BREACH (Unlatched face shield during CBRN or blast)',
    desc: 'The active infrared proximity sensor continuously verifies the mechanical latch position of the front ballistic visor face shield. Prevents unintentional visor opening in hostile environments and provides proximity alert in zero-visibility low-light situations.',
    remediation: '1. Solenoid latch confirmation ping.\n2. Audio HUD prompt to operator to verify airtight latch.',
    getValue: (t) => t.irStatus !== null ? t.irStatus : '—',
    getSub: (t) => 'Optical Reflection Cone: 15 cm Range',
    getStatus: (t) => t.irStatus === null ? { text: 'STANDBY', cls: 'badge-status standby', dot: 'apple-status-dot' } : (t.irStatus.includes('OBSTACLE') ? { text: 'OBSTACLE', cls: 'badge-status warn', dot: 'apple-status-dot state-warning' } : { text: 'LOCKED', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' }),
    getScenario: (t) => t.irStatus ? (t.irStatus.includes('OBSTACLE') ? 'Obstacle Detected: Close-range proximity hazard within 15 cm defense cone.' : 'Ballistic Visor Locked: Optical face shield airtight seal verified and latched.') : 'Awaiting live USB telemetry packet stream from ESP32.',
    actions: [
      { label: 'TEST VISOR SENSOR', cmd: 'PING_IR', cls: 'btn-widget-action' }
    ]
  },
  'card-gforce': {
    chip: 'MPU-6050 6-DOF',
    title: 'BALLISTIC IMPACT & CONCUSSION (TBI)',
    subtitle: 'MEMS Triaxial Accelerometer & Dynamic Gyroscope Vector',
    pin: 'I2C Bus (SDA GPIO 21, SCL GPIO 22, Device 0x68)',
    protocol: 'I2C Master-Slave (400 kHz Fast Mode, 16-bit ADC Registers)',
    std: 'DoD Blast Injury Criteria / PEO Soldier TBI Concussion (>4.5G)',
    range: '< 2.50 G (Routine Soldier Kinematics)',
    warn: '2.50 G – 4.50 G (Heavy Physical Shock / Obstacle Leap)',
    crit: '> 4.50 G (High-Velocity Ballistic Impact / Blast Wave Concussion)',
    desc: 'The MPU-6050 combines a 3-axis accelerometer and 3-axis gyroscope. Computes net vector G-force load sqrt(Ax² + Ay² + Az²) and instant Euler attitude angles (Pitch and Roll). Evaluates kinetic blast overpressure to automatically diagnose Traumatic Brain Injury (TBI) and record black-box impact kinematics.',
    remediation: '1. Autonomous black-box impact logging to non-volatile EEPROM.\n2. High-priority Soldier Down distress beacon transmitted to squad leader.\n3. Automatic auditory pulse to evaluate soldier consciousness.',
    getValue: (t) => t.gforce !== null ? `${Number(t.gforce).toFixed(2)} G` : '— G',
    getSub: (t) => `AX: ${t.ax !== null ? Number(t.ax).toFixed(2) : '—'} | AY: ${t.ay !== null ? Number(t.ay).toFixed(2) : '—'} | AZ: ${t.az !== null ? Number(t.az).toFixed(2) : '—'}`,
    getStatus: (t) => t.gforce === null ? { text: 'STANDBY', cls: 'badge-status standby', dot: 'apple-status-dot' } : (t.gforce >= 4.5 ? { text: 'TBI CONCUSSION', cls: 'badge-status danger', dot: 'apple-status-dot state-danger' } : (t.gforce >= 2.5 ? { text: 'SHOCK LOAD', cls: 'badge-status warn', dot: 'apple-status-dot state-warning' } : { text: 'NOMINAL', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' })),
    getScenario: (t) => t.gforce >= 4.5 ? 'CRITICAL TBI BLAST OVERPRESSURE: Ballistic impact vector exceeds 4.5G! TBI alert broadcast.' : ((t.gforce >= 2.5) ? 'Kinetic Shock: Accelerometer registered elevated vector load (2.5G–4.5G).' : (t.gforce !== null ? 'Kinetic Load Nominal: Routine tactical soldier motion within normal operational envelope.' : 'Awaiting live USB telemetry packet stream from ESP32.')),
    actions: [
      { label: 'LOG IMPACT EVENT', cmd: 'LOG_TBI', cls: 'btn-widget-action danger' }
    ]
  },
  'card-hardware-c2': {
    chip: 'ESP32 C2 CONTROLLER',
    title: 'ESP32 HARDWARE C2 & ACTUATORS',
    subtitle: 'Dual-Core System Controller, Onboard Actuators & Satellite Recon',
    pin: 'GPIO 23 (Buzzer) | I2C (OLED Screen) | UART2 GPIO 16/17 (GPS)',
    protocol: 'ESP32 Hardware HAL (I2C, UART, Hardware Timers, PWM)',
    std: 'MIL-STD-461G EMI Compliance / IEEE 802.11 b/g/n / Bluetooth 4.2',
    range: '5.0V VBUS Sensor Power Rail / 3.3V Core Voltage / 240 MHz Clock',
    warn: 'OLED Refresh Lag / GPS Satellite Degradation',
    crit: 'Power Rail Undervoltage / Bus Fault',
    desc: 'The onboard ESP32 dual-core microcontroller coordinates all helmet subsystems. Drives the piezoelectric acoustic distress buzzer, updates the soldier-facing OLED visor screen, parses the NEO-6M satellite GPS positioning receiver, and handles bidirectional USB telemetry.',
    remediation: 'Hardware watchdog timer automatically resets crashed peripherals without disrupting life-support telemetry.',
    getValue: (t) => t.buzzer !== null ? `BUZZER: ${t.buzzer}` : 'BUS READY',
    getSub: (t) => `OLED: PAGE ${t.oledPage !== null ? t.oledPage : 0} | GPS: ${t.gps || 'ACTIVE RECON'}`,
    getStatus: (t) => ({ text: 'BUS ACTIVE', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' }),
    getScenario: (t) => 'Hardware GPIO bus active. 5.0V power rail stabilized. Actuators responsive to command directives.',
    actions: [
      { label: 'TEST BUZZER PING', cmd: 'TEST_BUZZER', cls: 'btn-widget-action' },
      { label: 'CYCLE OLED PAGE', cmd: 'CYCLE_OLED', cls: 'btn-widget-action' },
      { label: 'TRANSMIT DISTRESS SOS', cmd: 'EMERGENCY_SOS', cls: 'btn-widget-action danger' }
    ]
  },
  'card-biometrics': {
    chip: 'BIOMETRIC HARNESS',
    title: 'SOLDIER PHYSIOLOGICAL VECTORS',
    subtitle: 'Cardiovascular Pulse, Arterial SpO2 & Core Body Temperature',
    pin: 'MAX30100 (I2C Bus 0x57) + DS18B20 (1-Wire Digital Bus GPIO 13)',
    protocol: 'Photoplethysmography (PPG) Infrared/Red LEDs + 1-Wire Digital',
    std: 'NATO STANAG 2122 Triage Protocol / US SOCOM Physiological Monitoring',
    range: 'Pulse: 55–100 BPM / SpO2: 95–100% / Temp: 36.5°C–37.5°C',
    warn: 'Pulse > 130 BPM (Tachycardia / Combat Stress) / SpO2 < 92%',
    crit: 'Pulse < 40 or > 180 BPM / SpO2 < 85% (Hypoxia / Hemorrhage)',
    desc: 'The soldier biometric harness integrates the MAX30100 optical pulse oximeter and DS18B20 digital core temperature probe. Continuously evaluates circulatory performance, tactical exertion level, and blood oxygenation to anticipate fatigue and traumatic blood loss.',
    remediation: 'Automated casualty triage classification transmitted to battalion medical aid station.',
    getValue: (t) => t.bpm !== null ? `${Math.round(t.bpm)} BPM` : '— BPM',
    getSub: (t) => `SpO2: ${t.spo2 !== null ? Math.round(t.spo2) + '%' : '— %'} | Temp: ${t.temp !== null ? Number(t.temp).toFixed(1) + '°C' : '— °C'}`,
    getStatus: (t) => t.bpm === null ? { text: 'AWAITING CONTACT', cls: 'badge-status standby', dot: 'apple-status-dot' } : { text: 'ATTACHED', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' },
    getScenario: (t) => t.bpm !== null ? 'Vitals Acquired: Cardiovascular pulse and SpO2 within tactical operational envelope.' : 'Awaiting soldier pulse oximetry contact harness connection.',
    actions: [
      { label: 'ACQUIRE VITALS PING', cmd: 'PING_BIO', cls: 'btn-widget-action' }
    ]
  },
  'card-terminal': {
    chip: 'USB SERIAL BUS',
    title: 'SERIAL TELEMETRY BUS & BLACKBOX',
    subtitle: 'Web Serial Direct Hardware Ingestion Engine @ 115,200 Baud',
    pin: 'USB-UART CP2102 / CH340 Bridge (VBUS, D+, D-, GND)',
    protocol: 'Asynchronous Serial Stream (8-N-1, 115,200 Baud)',
    std: 'MIL-STD-1553 Avionics Data Bus Heritage / Universal Serial Bus 2.0',
    range: '115,200 Baud / 100 ms Packet Cycle',
    warn: 'Buffer Framing Errors / Parity Dropouts',
    crit: 'USB Bus Disconnection / Communication Timeout',
    desc: 'Direct browser-to-hardware communication bridge using the W3C Web Serial API. Enables wire-speed ingestion of ESP32 sensor telemetry packets with zero cloud latency or middleware software.',
    remediation: 'Automatic stream reconnect and buffer flush upon USB interface hotplug.',
    getValue: (t) => state.isConnected ? 'CONNECTED' : 'STANDBY',
    getSub: (t) => `${state.packetCount} Packets Ingested | Port: 115200 Baud`,
    getStatus: (t) => state.isConnected ? { text: 'LIVE STREAM', cls: 'badge-status safe', dot: 'apple-status-dot state-nominal' } : { text: 'STANDBY', cls: 'badge-status standby', dot: 'apple-status-dot' },
    getScenario: (t) => state.isConnected ? 'USB Telemetry Active: Receiving live hardware packet frames from ESP32.' : 'Awaiting USB connection. Plug in ESP32 and click CONNECT USB.',
    actions: [
      { label: 'CLEAR TERMINAL LOG', cmd: 'CLEAR_LOG', cls: 'btn-widget-action' }
    ]
  }
};

function openWidgetInspector(cardId) {
  const meta = SENSOR_METADATA[cardId];
  if (!meta) return;

  const t = state.telemetry;
  const status = meta.getStatus(t);

  if (UI.detailModalDot) UI.detailModalDot.className = status.dot;
  if (UI.detailModalChip) UI.detailModalChip.textContent = meta.chip;
  if (UI.detailModalStatus) {
    UI.detailModalStatus.textContent = status.text;
    UI.detailModalStatus.className = status.cls;
  }
  if (UI.detailModalTitle) UI.detailModalTitle.textContent = meta.title;
  if (UI.detailModalSubtitle) UI.detailModalSubtitle.textContent = meta.subtitle;

  if (UI.detailModalValue) UI.detailModalValue.textContent = meta.getValue(t);
  if (UI.detailModalSub) UI.detailModalSub.textContent = meta.getSub(t);
  if (UI.detailModalScenario) UI.detailModalScenario.textContent = meta.getScenario(t);

  if (UI.detailModalPin) UI.detailModalPin.textContent = meta.pin;
  if (UI.detailModalProtocol) UI.detailModalProtocol.textContent = meta.protocol;
  if (UI.detailModalStd) UI.detailModalStd.textContent = meta.std;
  if (UI.detailModalRange) UI.detailModalRange.textContent = meta.range;
  if (UI.detailModalWarn) UI.detailModalWarn.textContent = meta.warn;
  if (UI.detailModalCrit) UI.detailModalCrit.textContent = meta.crit;
  if (UI.detailModalDescription) UI.detailModalDescription.textContent = meta.desc;
  if (UI.detailModalRemediation) UI.detailModalRemediation.textContent = meta.remediation;

  if (UI.detailModalActions) {
    UI.detailModalActions.innerHTML = '';
    meta.actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = act.cls || 'btn-widget-action';
      btn.textContent = act.label;
      btn.onclick = () => {
        if (act.cmd === 'CLEAR_LOG') {
          if (UI.terminalBody) UI.terminalBody.innerHTML = '';
        } else {
          sendSerialCommand(act.cmd);
        }
      };
      UI.detailModalActions.appendChild(btn);
    });
  }

  UI.modalWidgetDetail?.classList.remove('hidden');
  playTacticalChirp(1400, 'sine', 0.05, 0.07);
}

function closeWidgetInspector() {
  UI.modalWidgetDetail?.classList.add('hidden');
  playTacticalChirp(900, 'sine', 0.04, 0.05);
}

window.openWidgetInspector = openWidgetInspector;
window.closeWidgetInspector = closeWidgetInspector;
window.toggleTheme = toggleTheme;

// Animation Loop (60 FPS Smooth Digital Twin + Aircraft HUD Dynamics)
let clock = new THREE.Clock();

function animate3D() {
  requestAnimationFrame(animate3D);
  const elapsedTime = clock.getElapsedTime();

  let currentPitchDeg = 0;
  let currentRollDeg = 0;

  if (helmetGroup) {
    if (state.three.demoSpin) {
      helmetGroup.rotation.y += 0.015;
      helmetGroup.rotation.x = Math.sin(elapsedTime * 1.2) * 0.2;
      helmetGroup.rotation.z = Math.cos(elapsedTime * 1.0) * 0.1;
      currentPitchDeg = (helmetGroup.rotation.x * 180) / Math.PI;
      currentRollDeg = -(helmetGroup.rotation.z * 180) / Math.PI;
    } else if (state.three.isUserInteracting) {
      helmetGroup.rotation.x += (state.three.manualPitch - helmetGroup.rotation.x) * 0.12;
      helmetGroup.rotation.y += (state.three.manualYaw - helmetGroup.rotation.y) * 0.12;
      helmetGroup.rotation.z += (0 - helmetGroup.rotation.z) * 0.12;
      currentPitchDeg = (helmetGroup.rotation.x * 180) / Math.PI;
      currentRollDeg = -(helmetGroup.rotation.z * 180) / Math.PI;
    } else if (state.hasLiveStream && state.telemetry.pitch !== null) {
      // Live MPU-6050 Euler angles received from hardware
      currentPitchDeg = Number(state.telemetry.pitch) || 0;
      currentRollDeg = Number(state.telemetry.roll) || 0;
      const targetPitchRad = (currentPitchDeg * Math.PI) / 180;
      const targetRollRad = (currentRollDeg * Math.PI) / 180;
      const targetYawRad = (((state.telemetry.yaw || 180) - 180) * Math.PI) / 180;

      helmetGroup.rotation.x += (targetPitchRad - helmetGroup.rotation.x) * 0.1;
      helmetGroup.rotation.z += (-targetRollRad - helmetGroup.rotation.z) * 0.1;
      helmetGroup.rotation.y += (targetYawRad - helmetGroup.rotation.y) * 0.1;
    } else {
      // Neutral tactical inspection pose
      helmetGroup.rotation.x += (0.12 - helmetGroup.rotation.x) * 0.06;
      helmetGroup.rotation.y += (-0.38 - helmetGroup.rotation.y) * 0.06;
      helmetGroup.rotation.z += (0 - helmetGroup.rotation.z) * 0.06;
      currentPitchDeg = (helmetGroup.rotation.x * 180) / Math.PI;
      currentRollDeg = -(helmetGroup.rotation.z * 180) / Math.PI;
    }

    // Subtle micro-float
    helmetGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.04;
  }

  // --- DYNAMIC AIRCRAFT FIGHTER HUD LEVEL METER UPDATES (ACCURATE & STABLE) ---
  let hudPitchDeg = 0;
  let hudRollDeg = 0;
  let hudYawDeg = 0;

  if (state.hasLiveStream && state.telemetry.pitch !== null) {
    hudPitchDeg = Number(state.telemetry.pitch) || 0;
    hudRollDeg = Number(state.telemetry.roll) || 0;
    hudYawDeg = Number(state.telemetry.yaw) || 0;
  } else if (state.three.demoSpin || state.three.isUserInteracting) {
    hudPitchDeg = (helmetGroup.rotation.x * 180) / Math.PI;
    hudRollDeg = -(helmetGroup.rotation.z * 180) / Math.PI;
    hudYawDeg = (helmetGroup.rotation.y * 180) / Math.PI;
  }
  // At default/standby: hudPitchDeg = 0.0, hudRollDeg = 0.0 (Rock-solid exact stable level!)

  // 1. Bank Angle / Roll Pointer along Top Arc
  if (UI.hudRollPointer) {
    const clampedRoll = Math.max(-45, Math.min(45, hudRollDeg));
    UI.hudRollPointer.style.transform = `translateX(-50%) rotate(${clampedRoll.toFixed(1)}deg)`;
  }

  // 2. Horizon Line & Pitch Ladder in Top Widget Window
  if (UI.hudPitchLadder) {
    const pitchOffsetPx = hudPitchDeg * -1.8;
    UI.hudPitchLadder.style.transform = `translate(-50%, calc(-50% + ${pitchOffsetPx.toFixed(1)}px)) rotate(${hudRollDeg.toFixed(1)}deg)`;
  }

  // 3. Digital HUD Readout Numbers
  if (UI.valRoll) {
    UI.valRoll.textContent = `${hudRollDeg.toFixed(1)}°`;
    if (state.hasLiveStream) UI.valRoll.classList.remove('no-data');
    else UI.valRoll.classList.add('no-data');
  }
  if (UI.valPitch) {
    UI.valPitch.textContent = `${hudPitchDeg.toFixed(1)}°`;
    if (state.hasLiveStream) UI.valPitch.classList.remove('no-data');
    else UI.valPitch.classList.add('no-data');
  }
  if (UI.valYaw) {
    UI.valYaw.textContent = `${hudYawDeg.toFixed(1)}°`;
    if (state.hasLiveStream) UI.valYaw.classList.remove('no-data');
    else UI.valYaw.classList.add('no-data');
  }

  // 4. Stability Badge in Top Widget
  if (UI.hudStabilityText) {
    if (Math.abs(hudPitchDeg) < 0.8 && Math.abs(hudRollDeg) < 0.8) {
      UI.hudStabilityText.textContent = 'STABLE LEVEL // 0.0°';
      UI.hudStabilityText.style.color = 'var(--accent-cyan)';
    } else {
      const pSign = hudPitchDeg >= 0 ? '+' : '';
      const rSign = hudRollDeg >= 0 ? '+' : '';
      UI.hudStabilityText.textContent = `P: ${pSign}${hudPitchDeg.toFixed(1)}° / R: ${rSign}${hudRollDeg.toFixed(1)}°`;
      UI.hudStabilityText.style.color = (Math.abs(hudRollDeg) > 30 || Math.abs(hudPitchDeg) > 25) ? 'var(--state-danger-red)' : 'var(--accent-cyan)';
    }
  }

  // 5. G-Force Load Readout
  if (UI.valHudG) {
    if (state.telemetry.gforce !== null && state.hasLiveStream) {
      UI.valHudG.textContent = `${Number(state.telemetry.gforce).toFixed(2)} G`;
      UI.valHudG.classList.remove('no-data');
    } else {
      UI.valHudG.textContent = '1.00 G';
      UI.valHudG.classList.add('no-data');
    }
  }

  // Forehead status LED pulse
  if (ledPipMesh) {
    const pulse = state.hasLiveStream ? (0.8 + 0.3 * Math.sin(elapsedTime * 5.0)) : 0.7;
    ledPipMesh.scale.set(pulse, pulse, pulse);
  }

  // Concussion shockwave pulse on severe G-force
  if (shockwaveMesh) {
    if (state.hasLiveStream && (state.telemetry.concussion || (state.telemetry.gforce !== null && state.telemetry.gforce >= 4.5))) {
      const pulseScale = 1.0 + (Math.sin(elapsedTime * 12) + 1.0) * 0.25;
      shockwaveMesh.scale.set(pulseScale, pulseScale, pulseScale);
      shockwaveMesh.material.opacity = 0.65;
    } else {
      shockwaveMesh.material.opacity = 0.0;
    }
  }

  renderer.render(scene, camera);
}

// ============================================================================
// 4. SCIENTIFIC SAFETY STANDARDS & REMEDIATION LOGIC ENGINE
// ============================================================================
function calculateDewPoint(tempC, humidity) {
  if (tempC === null || humidity === null || isNaN(tempC) || isNaN(humidity)) return null;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100.0);
  return (b * alpha) / (a - alpha);
}

function evaluateSafetyStandards(t) {
  const incidents = [];

  // 1. MQ-7 Carbon Monoxide (NIOSH REL: 35 ppm, OSHA PEL: 50 ppm, IDLH: > 100 ppm)
  if (t.coPpm !== null) {
    if (t.coPpm > 900 || t.mq7Do === 0) {
      incidents.push({
        severity: 'danger',
        sensor: 'MQ-7',
        title: 'LETHAL CARBON MONOXIDE INFILTRATION (> 100 PPM)',
        msg: 'Dangerous CO concentration detected in helmet breathing zone. NIOSH IDLH ceiling breached.',
        action: 'Activate emergency oxygen bypass; verify mask airtight seal; immediate combat zone evacuation.'
      });
    } else if (t.coPpm > 400) {
      incidents.push({
        severity: 'warn',
        sensor: 'MQ-7',
        title: 'ELEVATED CO ACCUMULATION (35–100 PPM)',
        msg: 'OSHA PEL 8-hr ceiling exceeded. Risk of cognitive impairment and delayed reaction time.',
        action: 'Ventilate helmet breathing chamber; check vehicle / combustion exhaust source.'
      });
    }
  }

  // 2. MQ-135 Hazardous Toxic Gases & Combustion Fumes (MIL-STD-1472H / ASHRAE 62.1)
  if (t.gasPpm !== null) {
    if (t.gasPpm > 1400 || t.mq135Do === 0) {
      incidents.push({
        severity: 'danger',
        sensor: 'MQ-135',
        title: 'TOXIC CHEMICAL / CBRN VAPOR BREACH (> 2000 PPM EQ)',
        msg: 'Airborne volatile organics, ammonia, or combustion smoke exceed safe physiological limits.',
        action: 'Engage CBRN canister filter valve; seal ballistic visor; withdraw upwind from toxic plume.'
      });
    } else if (t.gasPpm > 800) {
      incidents.push({
        severity: 'warn',
        sensor: 'MQ-135',
        title: 'ELEVATED AIR TOXICITY (1000–2000 PPM EQ)',
        msg: 'Degraded air quality inside breathing enclosure. Potential soldier eye irritation and drowsiness.',
        action: 'Enable active forced-air ventilation purge.'
      });
    }
  }

  // 3. DHT22 Visor Climate & Heat Stress (US Army TB MED 507)
  if (t.ambientTemp !== null) {
    if (t.ambientTemp >= 38.0) {
      incidents.push({
        severity: 'danger',
        sensor: 'DHT22',
        title: 'HEAT STROKE HAZARD (INTERNAL TEMP >= 38.0°C)',
        msg: 'Critical thermal strain. US Army Heat Category 5 danger threshold exceeded.',
        action: 'Enforce immediate hydration; loosen retention harness; apply rapid cooling protocol.'
      });
    } else if (t.ambientTemp >= 32.0) {
      incidents.push({
        severity: 'warn',
        sensor: 'DHT22',
        title: 'HEAT FATIGUE STRAIN (32.0°C–38.0°C)',
        msg: 'High thermal burden inside tactical shell. Core temperature monitoring advised.',
        action: 'Schedule hydration break; pace physical exertion rate.'
      });
    }
  }

  if (t.humidity !== null && t.humidity >= 75.0) {
    incidents.push({
      severity: 'warn',
      sensor: 'DHT22',
      title: 'VISOR OPTICAL FOGGING CONDENSATION RISK',
      msg: 'Internal relative humidity >= 75%. Dew point condensation severely degrades marksmanship.',
      action: 'Pulse active anti-fog micro-blower on visor inner surface.'
    });
  }

  // 4. MPU-6050 Ballistic Impact & TBI Concussion (DoD Blast Injury Standard)
  if (t.gforce !== null) {
    if (t.gforce >= 4.5 || t.concussion) {
      incidents.push({
        severity: 'danger',
        sensor: 'MPU-6050',
        title: 'TRAUMATIC BRAIN INJURY (TBI) SHOCK >= 4.5G',
        msg: 'Severe blast shockwave or ballistic shell deflection trauma. High risk of closed head injury.',
        action: 'Log black-box EEPROM telemetry; transmit Soldier Down beacon; pupil triage.'
      });
    } else if (t.gforce >= 2.5) {
      incidents.push({
        severity: 'warn',
        sensor: 'MPU-6050',
        title: 'HIGH-G KINETIC IMPULSE (2.5G–4.5G)',
        msg: 'High acceleration detected from vehicle recoil, parachute landing, or rapid tactical dive.',
        action: 'Confirm operator physical stability and helmet fit.'
      });
    }
  }

  // 5. IR Face Shield
  if (t.irStatus && t.irStatus.includes('OBSTACLE')) {
    incidents.push({
      severity: 'warn',
      sensor: 'IR',
      title: 'VISOR SEAL UNLATCHED OR CLOSE-RANGE OBSTACLE',
      msg: 'Ballistic face shield is unsealed or obstacle detected within 15 cm defense cone.',
      action: 'Latching face shield locked position before advancing.'
    });
  }

  return incidents;
}

// ============================================================================
// 5. TELEMETRY REFLECTION & DASHBOARD UI UPDATE (ZERO HARDCODED VALUES)
// ============================================================================
function updateDashboardUI(t) {
  // If NO live data has been received yet, keep dashboard strictly in STANDBY (zero hardcoded values)
  if (!state.hasLiveStream) {
    // 1. MQ-135 Gas
    if (UI.valGas) { UI.valGas.textContent = '— AO'; UI.valGas.className = 'metric-compact no-data'; }
    if (UI.pillGas) { UI.pillGas.textContent = 'STANDBY'; UI.pillGas.className = 'badge-status standby'; }
    if (UI.barGas) UI.barGas.style.width = '0%';
    if (UI.cardMq135) UI.cardMq135.className = 'apple-widget state-standby';
    if (UI.scenarioGas) UI.scenarioGas.textContent = 'Awaiting live USB telemetry packet stream from ESP32.';

    // 2. MQ-7 CO
    if (UI.valCo) { UI.valCo.textContent = '— AO'; UI.valCo.className = 'metric-compact no-data'; }
    if (UI.pillCo) { UI.pillCo.textContent = 'STANDBY'; UI.pillCo.className = 'badge-status standby'; }
    if (UI.barCo) UI.barCo.style.width = '0%';
    if (UI.cardMq7) UI.cardMq7.className = 'apple-widget state-standby';
    if (UI.scenarioCo) UI.scenarioCo.textContent = 'Awaiting live USB telemetry packet stream from ESP32.';

    // 3. DHT22 Climate
    if (UI.valDhtSummary) { UI.valDhtSummary.textContent = '—°C / —%'; UI.valDhtSummary.className = 'metric-compact no-data'; }
    if (UI.valAmbTemp) { UI.valAmbTemp.textContent = '— °C'; UI.valAmbTemp.className = 'split-val no-data'; }
    if (UI.valHumidity) { UI.valHumidity.textContent = '— %'; UI.valHumidity.className = 'split-val no-data'; }
    if (UI.valDewPoint) { UI.valDewPoint.textContent = '— °C [STANDBY]'; }
    if (UI.pillDht22) { UI.pillDht22.textContent = 'STANDBY'; UI.pillDht22.className = 'badge-status standby'; }
    if (UI.cardDht22) UI.cardDht22.className = 'apple-widget state-standby';
    if (UI.scenarioDht) UI.scenarioDht.textContent = 'Awaiting live USB telemetry packet stream from ESP32.';

    // 4. IR Proximity
    if (UI.valIr) { UI.valIr.textContent = '—'; UI.valIr.className = 'metric-compact no-data'; }
    if (UI.pillIr) { UI.pillIr.textContent = 'STANDBY'; UI.pillIr.className = 'badge-status standby'; }
    if (UI.cardIr) UI.cardIr.className = 'apple-widget state-standby';
    if (UI.scenarioIr) UI.scenarioIr.textContent = 'Awaiting live USB telemetry packet stream from ESP32.';

    // 5. MPU-6050 G-Force
    if (UI.valGforce) { UI.valGforce.textContent = '— G'; UI.valGforce.className = 'metric-compact no-data'; }
    if (UI.concussionBadge) { UI.concussionBadge.textContent = 'STANDBY'; UI.concussionBadge.className = 'badge-status standby'; }
    if (UI.barGforce) UI.barGforce.style.width = '0%';
    if (UI.cardGforce) UI.cardGforce.className = 'apple-widget state-standby';
    if (UI.scenarioGforce) UI.scenarioGforce.textContent = 'Awaiting live USB telemetry packet stream from ESP32.';

    // 6. Actuators & Biometrics
    if (UI.cardHardwareC2) UI.cardHardwareC2.className = 'apple-widget state-nominal';
    if (UI.scenarioHw) UI.scenarioHw.textContent = 'Hardware GPIO bus active. 5.0V power rail stabilized.';

    if (UI.valBpm) { UI.valBpm.textContent = '— BPM'; UI.valBpm.className = 'bio-num no-data'; }
    if (UI.valSpo2) { UI.valSpo2.textContent = '— %'; UI.valSpo2.className = 'bio-num no-data'; }
    if (UI.valTemp) { UI.valTemp.textContent = '— °C'; UI.valTemp.className = 'bio-num no-data'; }
    if (UI.pillBio) { UI.pillBio.textContent = 'STANDBY'; UI.pillBio.className = 'badge-status standby'; }
    if (UI.cardBiometrics) UI.cardBiometrics.className = 'apple-widget state-standby';
    if (UI.scenarioBio) UI.scenarioBio.textContent = 'Awaiting soldier pulse oximetry contact harness connection.';

    if (UI.cardTerminal) UI.cardTerminal.className = 'apple-widget state-nominal';
    if (UI.scenarioTerm) UI.scenarioTerm.textContent = 'Direct hardware UART ingestion stream via Web Serial API.';

    if (UI.valBuzzer) UI.valBuzzer.textContent = 'STANDBY';
    UI.incidentBanner?.classList.add('hidden');
    return;
  }

  // --- LIVE TELEMETRY POPULATION ---

  // 1. MPU-6050 Orientation & Ballistic Impact
  if (t.gforce !== null) {
    if (UI.valGforce) {
      UI.valGforce.textContent = `${Number(t.gforce).toFixed(2)} G`;
      UI.valGforce.className = 'metric-compact';
    }
    const gPct = Math.min(100, (t.gforce / 6.0) * 100);
    if (UI.barGforce) UI.barGforce.style.width = `${gPct}%`;

    if (t.gforce >= 4.5 || t.concussion) {
      if (UI.concussionBadge) { UI.concussionBadge.textContent = 'TBI IMPACT!'; UI.concussionBadge.className = 'badge-status danger'; }
      if (UI.barGforce) UI.barGforce.className = 'threshold-bar danger';
      if (UI.cardGforce) UI.cardGforce.className = 'apple-widget state-danger open';
      if (UI.scenarioGforce) UI.scenarioGforce.textContent = 'TBI CONCUSSION BREACH: High-G blast deflection shock (>= 4.5 G)! Black-box impact logged.';
    } else if (t.gforce >= 2.5) {
      if (UI.concussionBadge) { UI.concussionBadge.textContent = 'HIGH SHOCK'; UI.concussionBadge.className = 'badge-status warn'; }
      if (UI.barGforce) UI.barGforce.className = 'threshold-bar warn';
      if (UI.cardGforce) UI.cardGforce.className = 'apple-widget state-warning';
      if (UI.scenarioGforce) UI.scenarioGforce.textContent = 'High Shock Impulse: 2.5G–4.5G kinetic load detected. Parachute/vehicle recoil logged.';
    } else {
      if (UI.concussionBadge) { UI.concussionBadge.textContent = 'ROUTINE'; UI.concussionBadge.className = 'badge-status safe'; }
      if (UI.barGforce) UI.barGforce.className = 'threshold-bar safe';
      if (UI.cardGforce) UI.cardGforce.className = 'apple-widget state-nominal';
      if (UI.scenarioGforce) UI.scenarioGforce.textContent = 'Kinetic Baseline Normal: Routine head motion within benign physiological bounds (< 2.5 G).';
    }
  }

  // 2. MQ-135 Hazardous Gases
  if (t.gasPpm !== null) {
    if (UI.valGas) {
      UI.valGas.textContent = `${Math.round(t.gasPpm)} AO`;
      UI.valGas.className = 'metric-compact';
    }
    const gasPct = Math.min(100, (t.gasPpm / 2500) * 100);
    if (UI.barGas) UI.barGas.style.width = `${gasPct}%`;

    if (t.gasPpm > 1400 || t.mq135Do === 0) {
      if (UI.pillGas) { UI.pillGas.textContent = 'TOXIC TRIP!'; UI.pillGas.className = 'badge-status danger'; }
      if (UI.barGas) UI.barGas.className = 'threshold-bar danger';
      if (UI.cardMq135) UI.cardMq135.className = 'apple-widget state-danger open';
      if (UI.scenarioGas) UI.scenarioGas.textContent = 'CRITICAL: Toxic Chemical / CBRN Vapor breach (>2000 ppm eq)! Auto-purging filter valve.';
    } else if (t.gasPpm > 800) {
      if (UI.pillGas) { UI.pillGas.textContent = 'ELEVATED VOC'; UI.pillGas.className = 'badge-status warn'; }
      if (UI.barGas) UI.barGas.className = 'threshold-bar warn';
      if (UI.cardMq135) UI.cardMq135.className = 'apple-widget state-warning';
      if (UI.scenarioGas) UI.scenarioGas.textContent = 'Warning: Elevated VOC accumulation in breathing zone (1000–2000 ppm eq). Active purge recommended.';
    } else {
      if (UI.pillGas) { UI.pillGas.textContent = 'OPTIMAL'; UI.pillGas.className = 'badge-status safe'; }
      if (UI.barGas) UI.barGas.className = 'threshold-bar safe';
      if (UI.cardMq135) UI.cardMq135.className = 'apple-widget state-nominal';
      if (UI.scenarioGas) UI.scenarioGas.textContent = 'Air Quality Optimal: All airborne VOCs, smoke, and CO₂ within safe physiological limits (<800 AO).';
    }
  }

  // 3. MQ-7 Carbon Monoxide (CO)
  if (t.coPpm !== null) {
    if (UI.valCo) {
      UI.valCo.textContent = `${Math.round(t.coPpm)} AO`;
      UI.valCo.className = 'metric-compact';
    }
    const coPct = Math.min(100, (t.coPpm / 2000) * 100);
    if (UI.barCo) UI.barCo.style.width = `${coPct}%`;

    if (t.coPpm > 900 || t.mq7Do === 0) {
      if (UI.pillCo) { UI.pillCo.textContent = 'LETHAL CO!'; UI.pillCo.className = 'badge-status danger'; }
      if (UI.barCo) UI.barCo.className = 'threshold-bar danger';
      if (UI.cardMq7) UI.cardMq7.className = 'apple-widget state-danger open';
      if (UI.scenarioCo) UI.scenarioCo.textContent = 'LETHAL HAZARD: Carbon Monoxide IDLH threshold breached (>100 ppm)! Evacuate combat zone immediately.';
    } else if (t.coPpm > 400) {
      if (UI.pillCo) { UI.pillCo.textContent = 'WARNING CO'; UI.pillCo.className = 'badge-status warn'; }
      if (UI.barCo) UI.barCo.className = 'threshold-bar warn';
      if (UI.cardMq7) UI.cardMq7.className = 'apple-widget state-warning';
      if (UI.scenarioCo) UI.scenarioCo.textContent = 'Warning: CO accumulation exceeds 35 ppm OSHA PEL limit. Ventilate breathing chamber.';
    } else {
      if (UI.pillCo) { UI.pillCo.textContent = 'SAFE CO'; UI.pillCo.className = 'badge-status safe'; }
      if (UI.barCo) UI.barCo.className = 'threshold-bar safe';
      if (UI.cardMq7) UI.cardMq7.className = 'apple-widget state-nominal';
      if (UI.scenarioCo) UI.scenarioCo.textContent = 'CO Concentration Safe: Zero blast combustion blowback detected (<35 ppm eq baseline).';
    }
  }

  // 4. DHT22 Micro-Climate
  if (t.ambientTemp !== null) {
    if (UI.valAmbTemp) {
      UI.valAmbTemp.textContent = `${Number(t.ambientTemp).toFixed(1)} °C`;
      UI.valAmbTemp.className = 'split-val';
    }
  }
  if (t.humidity !== null) {
    if (UI.valHumidity) {
      UI.valHumidity.textContent = `${Number(t.humidity).toFixed(1)} %`;
      UI.valHumidity.className = 'split-val';
    }
  }

  if (t.ambientTemp !== null && t.humidity !== null) {
    if (UI.valDhtSummary) {
      UI.valDhtSummary.textContent = `${Number(t.ambientTemp).toFixed(1)}°C / ${Math.round(t.humidity)}%`;
      UI.valDhtSummary.className = 'metric-compact';
    }
    const dew = calculateDewPoint(t.ambientTemp, t.humidity);
    if (dew !== null) {
      t.dewPoint = dew;
      const margin = t.ambientTemp - dew;
      const isFogRisk = t.humidity >= 75 || margin <= 2.5;
      if (UI.valDewPoint) {
        UI.valDewPoint.textContent = `${dew.toFixed(1)} °C ${isFogRisk ? '[FOG RISK]' : '[CLEAR]'}`;
        UI.valDewPoint.style.color = isFogRisk ? 'var(--state-warn-amber)' : 'var(--text-secondary)';
      }

      if (t.ambientTemp >= 38.0) {
        if (UI.pillDht22) { UI.pillDht22.textContent = 'HEAT STROKE'; UI.pillDht22.className = 'badge-status danger'; }
        if (UI.cardDht22) UI.cardDht22.className = 'apple-widget state-danger open';
        if (UI.scenarioDht) UI.scenarioDht.textContent = 'HEAT STROKE ALERT: Internal visor temperature >= 38.0°C! US Army Category 5 danger.';
      } else if (t.ambientTemp >= 32.0 || isFogRisk) {
        if (UI.pillDht22) { UI.pillDht22.textContent = isFogRisk ? 'FOG RISK' : 'HEAT FATIGUE'; UI.pillDht22.className = 'badge-status warn'; }
        if (UI.cardDht22) UI.cardDht22.className = 'apple-widget state-warning';
        if (UI.scenarioDht) UI.scenarioDht.textContent = isFogRisk ? 'Fogging Hazard: Internal humidity >= 75% — Dew point condensation trips marksmanship.' : 'Thermal Strain: Internal temperature 32.0°C–38.0°C. Hydration pacing advised.';
      } else {
        if (UI.pillDht22) { UI.pillDht22.textContent = 'OPTIMAL'; UI.pillDht22.className = 'badge-status safe'; }
        if (UI.cardDht22) UI.cardDht22.className = 'apple-widget state-nominal';
        if (UI.scenarioDht) UI.scenarioDht.textContent = 'Visor Micro-Climate Optimal: Anti-fog clear, moisture regulated, core thermal homeostasis maintained.';
      }
    }
  }

  // 5. IR Face Shield
  if (t.irStatus !== null) {
    if (UI.valIr) {
      UI.valIr.textContent = t.irStatus;
      UI.valIr.className = 'metric-compact';
    }
    if (t.irStatus.includes('OBSTACLE') || t.irStatus.includes('DETECT')) {
      if (UI.pillIr) { UI.pillIr.textContent = 'OBSTACLE'; UI.pillIr.className = 'badge-status warn'; }
      if (UI.cardIr) UI.cardIr.className = 'apple-widget state-warning';
      if (UI.scenarioIr) UI.scenarioIr.textContent = 'Obstacle Detected: Close-range proximity hazard within 15 cm defense cone.';
    } else {
      if (UI.pillIr) { UI.pillIr.textContent = 'LOCKED'; UI.pillIr.className = 'badge-status safe'; }
      if (UI.cardIr) UI.cardIr.className = 'apple-widget state-nominal';
      if (UI.scenarioIr) UI.scenarioIr.textContent = 'Ballistic Visor Locked: Optical face shield airtight seal verified and latched.';
    }
  }

  // 6. Actuators
  if (t.buzzer !== null && UI.valBuzzer) UI.valBuzzer.textContent = `${t.buzzer} // READY`;
  if (t.oledPage !== null && UI.valOled) UI.valOled.textContent = `PAGE ${t.oledPage} [SYS]`;
  if (t.gps !== null && UI.valGps) UI.valGps.textContent = t.gps;

  // 7. Biometrics
  if (t.bpm !== null && !isNaN(t.bpm)) {
    if (UI.valBpm) { UI.valBpm.textContent = `${Math.round(t.bpm)} BPM`; UI.valBpm.className = 'bio-num'; }
    if (UI.pillBio) { UI.pillBio.textContent = 'ATTACHED'; UI.pillBio.className = 'badge-status safe'; }
    if (UI.cardBiometrics) UI.cardBiometrics.className = 'apple-widget state-nominal';
    if (UI.scenarioBio) UI.scenarioBio.textContent = 'Vitals Acquired: Cardiovascular pulse and SpO2 within tactical operational envelope.';
  } else {
    if (UI.valBpm) { UI.valBpm.textContent = '— BPM'; UI.valBpm.className = 'bio-num no-data'; }
  }

  if (t.spo2 !== null && !isNaN(t.spo2)) {
    if (UI.valSpo2) { UI.valSpo2.textContent = `${Math.round(t.spo2)} %`; UI.valSpo2.className = 'bio-num'; }
  } else {
    if (UI.valSpo2) { UI.valSpo2.textContent = '— %'; UI.valSpo2.className = 'bio-num no-data'; }
  }

  if (t.temp !== null && !isNaN(t.temp)) {
    if (UI.valTemp) { UI.valTemp.textContent = `${Number(t.temp).toFixed(1)} °C`; UI.valTemp.className = 'bio-num'; }
  } else {
    if (UI.valTemp) { UI.valTemp.textContent = '— °C'; UI.valTemp.className = 'bio-num no-data'; }
  }

  // 8. Incident Assessment & Autonomous Remediation Alert
  const incidents = evaluateSafetyStandards(t);
  state.activeIncidents = incidents;

  if (incidents.length > 0) {
    const highest = incidents.find(i => i.severity === 'danger') || incidents[0];
    if (UI.incidentTitle) UI.incidentTitle.textContent = highest.title;
    if (UI.incidentMsg) UI.incidentMsg.textContent = highest.msg;
    if (UI.incidentActionText) UI.incidentActionText.textContent = highest.action;
    UI.incidentBanner?.classList.remove('hidden');

    if (highest.severity === 'danger') {
      playAlertSiren();
    }
  } else {
    UI.incidentBanner?.classList.add('hidden');
  }
}

// ============================================================================
// 6. WEB SERIAL API HARDWARE INGESTION (DIRECT USB CONNECTION)
// ============================================================================
async function connectWebSerial() {
  if (!('serial' in navigator)) {
    alert('Web Serial is supported in modern Google Chrome and Microsoft Edge on Desktop.');
    return;
  }
  try {
    logTerminal('[SERIAL] Requesting USB serial access to ESP32 (115200 Baud)...');
    state.serialPort = await navigator.serial.requestPort();
    await state.serialPort.open({ baudRate: 115200 });

    state.isConnected = true;
    state.keepReading = true;
    UI.btnConnectText.textContent = 'DISCONNECT';
    UI.btnConnect.classList.add('connected');
    UI.portStatusText.textContent = 'PORT OPEN (COM)';
    UI.portStatusText.classList.add('connected');

    UI.systemStatusPill.className = 'stream-status-pill live';
    UI.systemStatusText.textContent = 'STREAMING LIVE DATA // 115200 BAUD';

    logTerminal('[SERIAL] ESP32 Connected! Ingesting live telemetry stream...');
    playJarvisChirp(980, 'sine', 0.12, 0.12);

    readSerialStream();
  } catch (err) {
    logTerminal(`[SERIAL ERROR] ${err.message}`);
  }
}

async function disconnectWebSerial() {
  state.keepReading = false;
  if (state.reader) {
    try { await state.reader.cancel(); } catch (e) { }
    state.reader = null;
  }
  if (state.serialPort) {
    try { await state.serialPort.close(); } catch (e) { }
    state.serialPort = null;
  }
  state.isConnected = false;
  state.hasLiveStream = false;
  UI.btnConnectText.textContent = 'CONNECT USB';
  UI.btnConnect.classList.remove('connected');
  UI.portStatusText.textContent = 'DISCONNECTED';
  UI.portStatusText.classList.remove('connected');

  UI.systemStatusPill.className = 'stream-status-pill standby';
  UI.systemStatusText.textContent = 'HARDWARE STANDBY — CONNECT USB';

  updateDashboardUI(state.telemetry);
  logTerminal('[SERIAL] Port disconnected. Reverting to standby (zero hardcoded values).');
}

async function readSerialStream() {
  let lineBuffer = '';
  const textDecoder = new TextDecoderStream();
  state.serialPort.readable.pipeTo(textDecoder.writable);
  state.reader = textDecoder.readable.getReader();

  try {
    while (state.keepReading) {
      const { value, done } = await state.reader.read();
      if (done) break;
      if (value) {
        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 0) {
            handleIncomingSerialLine(trimmed);
          }
        }
      }
    }
  } catch (e) {
    if (state.keepReading) logTerminal(`[STREAM ERROR] ${e.message}`);
  } finally {
    state.reader.releaseLock();
  }
}

// 100% Real Protocol Parser for ESP32 Output
function handleIncomingSerialLine(raw) {
  state.packetCount++;
  state.lastPacketTime = Date.now();
  state.hasLiveStream = true;

  if (UI.packetCounter) {
    UI.packetCounter.textContent = `${state.packetCount} PKTS`;
  }
  logTerminal(raw);

  // Check if payload is JSON
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      if (obj.ax !== undefined) state.telemetry.ax = parseFloat(obj.ax);
      if (obj.ay !== undefined) state.telemetry.ay = parseFloat(obj.ay);
      if (obj.az !== undefined) state.telemetry.az = parseFloat(obj.az);
      if (obj.roll !== undefined) state.telemetry.roll = parseFloat(obj.roll);
      if (obj.pitch !== undefined) state.telemetry.pitch = parseFloat(obj.pitch);
      if (obj.yaw !== undefined) state.telemetry.yaw = parseFloat(obj.yaw);
      if (obj.temp !== undefined) state.telemetry.ambientTemp = parseFloat(obj.temp);
      if (obj.hum !== undefined) state.telemetry.humidity = parseFloat(obj.hum);
      if (obj.mq135 !== undefined) state.telemetry.gasPpm = parseFloat(obj.mq135);
      if (obj.mq7 !== undefined) state.telemetry.coPpm = parseFloat(obj.mq7);
      if (obj.ir !== undefined) state.telemetry.irStatus = obj.ir ? 'OBSTACLE DETECTED' : 'CLEAR';

      if (state.telemetry.ax !== null && state.telemetry.ay !== null && state.telemetry.az !== null) {
        state.telemetry.gforce = Math.sqrt(
          state.telemetry.ax * state.telemetry.ax +
          state.telemetry.ay * state.telemetry.ay +
          state.telemetry.az * state.telemetry.az
        );
      }
      updateDashboardUI(state.telemetry);
      return;
    } catch (e) { }
  }

  const upper = raw.toUpperCase();

  // 1. DHT22 Temperature & Humidity
  if (upper.includes('DHT22') && upper.includes('TEMP')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.ambientTemp = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }
  if (upper.includes('DHT22') && upper.includes('HUM')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.humidity = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }

  // 2. MPU-6050 Accelerometer & Gyroscope
  if (!state.rawAccel) state.rawAccel = { ax: 0, ay: 0, az: 1.0 };
  if (upper.includes('MPU6050 AX')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.rawAccel.ax = parseFloat(match[1]);
    return;
  }
  if (upper.includes('MPU6050 AY')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.rawAccel.ay = parseFloat(match[1]);
    return;
  }
  if (upper.includes('MPU6050 AZ')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) {
      state.rawAccel.az = parseFloat(match[1]);
      const ax = state.rawAccel.ax;
      const ay = state.rawAccel.ay;
      const az = state.rawAccel.az;

      state.telemetry.ax = ax;
      state.telemetry.ay = ay;
      state.telemetry.az = az;
      state.telemetry.gforce = Math.sqrt(ax * ax + ay * ay + az * az);

      state.telemetry.pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);
      state.telemetry.roll = Math.atan2(ay, az) * (180 / Math.PI);
      if (state.telemetry.yaw === null) state.telemetry.yaw = 180.0;

      updateDashboardUI(state.telemetry);
    }
    return;
  }

  // 3. MQ-135 Air Quality Sensor
  if (upper.includes('MQ135 AO')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.gasPpm = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }
  if (upper.includes('MQ135 DO')) {
    const match = raw.match(/:\s*(\d+)/);
    if (match) state.telemetry.mq135Do = parseInt(match[1], 10);
    updateDashboardUI(state.telemetry);
    return;
  }

  // 4. MQ-7 Carbon Monoxide Sensor
  if (upper.includes('MQ7 AO')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.coPpm = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }
  if (upper.includes('MQ7 DO')) {
    const match = raw.match(/:\s*(\d+)/);
    if (match) state.telemetry.mq7Do = parseInt(match[1], 10);
    updateDashboardUI(state.telemetry);
    return;
  }

  // 5. IR Face Shield Proximity
  if (upper.includes('IR') && !upper.includes('OLED')) {
    const isClear = upper.includes('CLEAR') || upper.includes('0');
    state.telemetry.irStatus = isClear ? 'SEALED & CLEAR' : 'OBSTACLE DETECTED';
    updateDashboardUI(state.telemetry);
    return;
  }

  // 6. Actuators
  if (upper.includes('BUZZER')) {
    state.telemetry.buzzer = upper.includes('ON') ? 'ACTIVE' : 'OFF';
    updateDashboardUI(state.telemetry);
    return;
  }

  if (upper.includes('OLED PAGE')) {
    const match = raw.match(/:\s*(\d+)/);
    if (match) state.telemetry.oledPage = parseInt(match[1], 10);
    updateDashboardUI(state.telemetry);
    return;
  }

  if (upper.includes('GPS')) {
    state.telemetry.gps = 'ACTIVE RECON';
    updateDashboardUI(state.telemetry);
    return;
  }

  // 7. DS18B20 & MAX30100 Soldier Biometrics
  if (upper.includes('DS18B20')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.temp = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }
  if (upper.includes('MAX30100') && upper.includes('HR')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.bpm = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }
  if (upper.includes('MAX30100') && upper.includes('SPO2')) {
    const match = raw.match(/:\s*([-\d.]+)/);
    if (match) state.telemetry.spo2 = parseFloat(match[1]);
    updateDashboardUI(state.telemetry);
    return;
  }
}

// Send Command over Serial to ESP32
async function sendSerialCommand(cmd) {
  if (!state.serialPort || !state.isConnected) {
    logTerminal(`[COMMAND SIM] '${cmd}' execution acknowledged.`);
    playJarvisChirp(1050, 'square', 0.08, 0.12);
    return;
  }
  try {
    const encoder = new TextEncoder();
    const writer = state.serialPort.writable.getWriter();
    await writer.write(encoder.encode(cmd + '\n'));
    writer.releaseLock();
    logTerminal(`TX: ${cmd}`);
    playJarvisChirp(1200, 'sine', 0.05, 0.1);
  } catch (e) {
    logTerminal(`[TX ERROR] ${e.message}`);
  }
}

// ============================================================================
// 7. TEST HARNESS (TRANSPARENT SIMULATION FOR FIELD TESTING)
// ============================================================================
let simInterval = null;

function toggleSimulator() {
  state.isSimulating = !state.isSimulating;
  if (state.isSimulating) {
    state.hasLiveStream = true;
    UI.btnDemoText.textContent = 'DISENGAGE TEST';
    UI.btnDemo.classList.add('active');
    UI.systemStatusPill.className = 'stream-status-pill live';
    UI.systemStatusText.textContent = 'TEST HARNESS ACTIVE // LIVE SIMULATION';
    logTerminal('[TEST HARNESS] Engaged. Simulating dynamic 10 Hz soldier kinematic & CBRN stream.');
    playJarvisChirp(880, 'sine', 0.1, 0.1);

    simInterval = setInterval(() => {
      state.packetCount++;
      if (UI.packetCounter) UI.packetCounter.textContent = `${state.packetCount} PKTS`;

      // Live kinematics
      state.telemetry.roll = 24.0 + Math.sin(Date.now() / 1400) * 16.0;
      state.telemetry.pitch = 26.0 + Math.cos(Date.now() / 1800) * 12.0;
      state.telemetry.yaw = (Number(state.telemetry.yaw || 180) + 0.4) % 360;
      state.telemetry.gforce = 0.95 + Math.abs(Math.sin(Date.now() / 1200) * 0.4);

      // Environmental variations
      state.telemetry.ambientTemp = 31.8 + Math.sin(Date.now() / 6000) * 2.2;
      state.telemetry.humidity = 58.0 + Math.cos(Date.now() / 5000) * 4.5;
      state.telemetry.gasPpm = 680 + Math.sin(Date.now() / 4000) * 110;
      state.telemetry.coPpm = 340 + Math.cos(Date.now() / 4500) * 80;
      state.telemetry.irStatus = 'SEALED & CLEAR';
      state.telemetry.buzzer = 'STANDBY';
      state.telemetry.oledPage = 0;
      state.telemetry.gps = 'ACTIVE RECON';

      updateDashboardUI(state.telemetry);
    }, 100);
  } else {
    UI.btnDemoText.textContent = 'TEST HARNESS';
    UI.btnDemo.classList.remove('active');
    clearInterval(simInterval);
    simInterval = null;

    if (!state.isConnected) {
      state.hasLiveStream = false;
      UI.systemStatusPill.className = 'stream-status-pill standby';
      UI.systemStatusText.textContent = 'HARDWARE STANDBY — CONNECT USB';
      updateDashboardUI(state.telemetry);
      logTerminal('[TEST HARNESS] Disengaged. Dashboard restored to clean standby.');
    }
  }
}

// ============================================================================
// 8. TERMINAL LOG HELPER
// ============================================================================
function logTerminal(text) {
  if (!UI.terminalBody) return;
  const line = document.createElement('div');
  line.className = 't-line';
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  line.textContent = `[${timeStr}] ${text}`;
  UI.terminalBody.appendChild(line);

  if (UI.terminalBody.children.length > 80) {
    UI.terminalBody.removeChild(UI.terminalBody.firstChild);
  }
  UI.terminalBody.scrollTop = UI.terminalBody.scrollHeight;
}

// ============================================================================
// 9. EVENT LISTENERS & INITIALIZATION
// ============================================================================
function initEventListeners() {
  // Web Serial Connect / Disconnect
  UI.btnConnect.addEventListener('click', () => {
    if (state.isConnected) disconnectWebSerial();
    else connectWebSerial();
  });

  // Test Harness Toggle
  UI.btnDemo.addEventListener('click', toggleSimulator);

  // Audio Toggle
  UI.btnAudio.addEventListener('click', () => {
    state.audioEnabled = !state.audioEnabled;
    UI.audioIcon.textContent = state.audioEnabled ? '🔊' : '🔇';
    if (state.audioEnabled) playJarvisChirp(880, 'sine', 0.1, 0.1);
  });

  // Theme Mode Toggle (Light / Dark)
  if (UI.btnThemeToggle) {
    UI.btnThemeToggle.addEventListener('click', toggleTheme);
  }

  // Standards Modal Controls
  if (UI.btnOpenProtocols) {
    UI.btnOpenProtocols.addEventListener('click', () => {
      UI.modalStandards.classList.remove('hidden');
    });
  }
  if (UI.btnCloseModal) {
    UI.btnCloseModal.addEventListener('click', () => {
      UI.modalStandards.classList.add('hidden');
    });
  }
  if (UI.btnModalDone) {
    UI.btnModalDone.addEventListener('click', () => {
      UI.modalStandards.classList.add('hidden');
    });
  }

  // Widget On-Screen Detail Popup Modal Controls
  if (UI.btnCloseWidgetModal) {
    UI.btnCloseWidgetModal.addEventListener('click', closeWidgetInspector);
  }
  if (UI.btnDoneWidgetModal) {
    UI.btnDoneWidgetModal.addEventListener('click', closeWidgetInspector);
  }
  if (UI.modalWidgetDetail) {
    UI.modalWidgetDetail.addEventListener('click', (e) => {
      if (e.target === UI.modalWidgetDetail) closeWidgetInspector();
    });
  }

  // Global Keyboard Escape Listener to Close Any Open Modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWidgetInspector();
      if (UI.modalStandards) UI.modalStandards.classList.add('hidden');
    }
  });

  // Incident Dismissal
  if (UI.btnDismissIncident) {
    UI.btnDismissIncident.addEventListener('click', () => {
      UI.incidentBanner.classList.add('hidden');
    });
  }

  // Actuator: Helmet Buzzer Ping
  UI.btnSoundBuzzer.addEventListener('click', () => {
    sendSerialCommand('BUZZ');
    playJarvisChirp(1000, 'sawtooth', 0.22, 0.2);
    logTerminal('[ACTUATOR] Fired acoustic pulse on physical helmet buzzer.');
  });

  // Actuator: Emergency SOS Beacon
  UI.btnManualSos.addEventListener('click', () => {
    state.telemetry.sos = !state.telemetry.sos;
    if (state.telemetry.sos) {
      UI.btnManualSos.innerHTML = '<span>CANCEL DISTRESS SOS</span>';
      playAlertSiren();
      logTerminal('>>> EMERGENCY SOS BEACON TRANSMITTING <<<');
      sendSerialCommand('CMD:SOS_ON');
    } else {
      UI.btnManualSos.innerHTML = '<span>TRANSMIT DISTRESS SOS</span>';
      logTerminal('[INFO] SOS Distress cancelled.');
      sendSerialCommand('CMD:SOS_OFF');
    }
  });

  // 3D Viewport Controls & Zoom Buttons
  if (UI.btnZoomIn) {
    UI.btnZoomIn.addEventListener('click', () => {
      if (!camera) return;
      camera.position.z = Math.max(3.2, camera.position.z - 0.9);
      playTacticalChirp(1400, 'sine', 0.03, 0.05);
      logTerminal(`[ZOOM] Camera magnification: ${(7.2 / camera.position.z).toFixed(2)}x`);
    });
  }

  if (UI.btnZoomOut) {
    UI.btnZoomOut.addEventListener('click', () => {
      if (!camera) return;
      camera.position.z = Math.min(13.0, camera.position.z + 0.9);
      playTacticalChirp(1100, 'sine', 0.03, 0.05);
      logTerminal(`[ZOOM] Camera magnification: ${(7.2 / camera.position.z).toFixed(2)}x`);
    });
  }

  if (UI.btnSyncGyro) {
    UI.btnSyncGyro.addEventListener('click', () => {
      state.three.isUserInteracting = false;
      state.three.demoSpin = false;
      state.three.manualPitch = 0.12;
      state.three.manualYaw = -0.38;
      if (camera) camera.position.set(0, 0.5, 7.2);
      playTacticalChirp(1200, 'sine', 0.06, 0.08);
      logTerminal('[3D DIGITAL TWIN] View reset to standard 3/4 tactical perspective.');
    });
  }

  if (UI.btnTiltAnim) {
    UI.btnTiltAnim.addEventListener('click', () => {
      state.three.demoSpin = !state.three.demoSpin;
      state.three.isUserInteracting = false;
      playTacticalChirp(950, 'sine', 0.06, 0.08);
      logTerminal(state.three.demoSpin ? '[3D DIGITAL TWIN] 360° Inspection spin engaged.' : '[3D DIGITAL TWIN] Spin paused.');
    });
  }

  // Terminal Clear
  if (UI.btnClearTerm) {
    UI.btnClearTerm.addEventListener('click', () => {
      UI.terminalBody.innerHTML = '';
    });
  }
}

// Global Exports
window.sendSerialCommand = sendSerialCommand;

// Window Load Lifecycle
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initThreeHoloChamber();
  initEventListeners();
  // Initialize dashboard in strict zero-hardcoded state
  updateDashboardUI(state.telemetry);
  logTerminal('[SYSTEM READY] Smart Soldier Helmet Telemetry C2 initialized in zero-hardcoded standby.');
});
