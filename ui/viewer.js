// Mesh2Step 3D Studio - Three.js WebGL Engine & UI Controller
// Offline hardware-accelerated 3D viewport with real-time ground alignment, AI Auto-Tune, and CAD export.

let scene, camera, renderer, controls;
let meshGroup, solidGroup, gridHelper, axesHelper;
let currentLoadedMesh = null;
let currentLoadedSolid = null;
let currentBounds = null;
let viewMode = 'mesh'; // 'mesh' | 'solid' | 'compare'
let conversionMode = 'ai'; // 'ai' | 'expert'
let currentFilePath = null;
let currentStepPath = null;
let hasSavedCurrentStep = false;
let pendingLoadAction = null;
let currentAutoTune = null;
let currentHistoryData = [];

// Initialize Three.js WebGL Scene
function initViewer() {
  const container = document.getElementById('viewport-wrapper');
  const canvas = document.getElementById('webgl-canvas');

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);

  // Camera (CAD Standard Z-UP)
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
  camera.up.set(0, 0, 1);
  camera.position.set(100, -140, 90);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Orbit Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;

  // Lights oriented for Z-up
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(150, -150, 200);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
  fillLight.position.set(-150, 150, 100);
  scene.add(fillLight);

  const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
  topLight.position.set(0, 0, 250);
  scene.add(topLight);

  // Groups
  meshGroup = new THREE.Group();
  solidGroup = new THREE.Group();
  scene.add(meshGroup);
  scene.add(solidGroup);

  // Floor Grid in XY plane (Z=0)
  gridHelper = new THREE.GridHelper(300, 60, 0x00f2fe, 0x1e293b);
  gridHelper.rotation.x = Math.PI / 2; // Lie flat on XY ground
  gridHelper.position.set(0, 0, 0); // Exactly at Z=0
  scene.add(gridHelper);

  axesHelper = new THREE.AxesHelper(40);
  scene.add(axesHelper);

  // Resize listener
  window.addEventListener('resize', onWindowResize);

  // Universal 3D Raycaster for interactive model dragging, selection & inspection
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pointerDownPos = { x: 0, y: 0 };
  let isDragging = false;
  let draggedTarget = null;
  let dragPlane = new THREE.Plane();
  let dragOffset = new THREE.Vector3();
  let dragMoved = false;

  function getIntersectedTarget(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    let candidates = [];
    if (viewMode === 'mesh' || viewMode === 'compare' || viewMode === 'split') {
      meshGroup.traverse(child => {
        if (child.isMesh && child.visible) {
          candidates.push(child);
        }
      });
    }
    if (viewMode === 'solid' || viewMode === 'compare' || viewMode === 'split') {
      solidGroup.traverse(child => {
        if (child.isMesh && child.visible) {
          candidates.push(child);
        }
      });
    }

    const intersects = raycaster.intersectObjects(candidates, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const obj = hit.object;

      // In side-by-side 'split' mode, prioritize moving meshGroup or solidGroup independently
      if (viewMode === 'split') {
        let isMesh = false;
        let curr = obj;
        while (curr) {
          if (curr === meshGroup) { isMesh = true; break; }
          if (curr === solidGroup) { break; }
          curr = curr.parent;
        }
        return {
          type: isMesh ? 'meshGroup' : 'solidGroup',
          group: isMesh ? meshGroup : solidGroup,
          point: hit.point,
          object: obj,
          bodyId: obj.userData ? obj.userData.bodyId : null
        };
      }

      // In standard view with multi-body assembly, allow dragging individual body
      if (obj.userData && obj.userData.bodyId !== undefined && window.currentBodies && window.currentBodies.length > 1) {
        return {
          type: 'body',
          bodyId: String(obj.userData.bodyId),
          point: hit.point,
          object: obj
        };
      }

      // Single model or entire group drag
      let isMesh = false;
      let curr = obj;
      while (curr) {
        if (curr === meshGroup) { isMesh = true; break; }
        if (curr === solidGroup) { break; }
        curr = curr.parent;
      }
      return {
        type: isMesh ? 'meshGroup' : 'solidGroup',
        group: isMesh ? meshGroup : solidGroup,
        point: hit.point,
        object: obj,
        bodyId: obj.userData ? obj.userData.bodyId : null
      };
    }
    return null;
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
    dragMoved = false;

    if (e.button !== 0) return; // Left click only for 3D model dragging
    if (!window.is3DDragEnabled) return;

    const hit = getIntersectedTarget(e.clientX, e.clientY);
    if (hit) {
      draggedTarget = hit;
      isDragging = true;
      controls.enabled = false; // Disable orbit camera while dragging 3D object

      // Setup camera-facing plane passing through the 3D hit point
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir).negate();
      dragPlane.setFromNormalAndCoplanarPoint(camDir, hit.point);

      const planeHit = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, planeHit);

      if (hit.type === 'body') {
        const curPos = getBodyTotalPosition(hit.bodyId);
        dragOffset.subVectors(curPos, planeHit);
      } else if (hit.type === 'meshGroup') {
        dragOffset.subVectors(meshGroup.position, planeHit);
      } else if (hit.type === 'solidGroup') {
        dragOffset.subVectors(solidGroup.position, planeHit);
      }

      renderer.domElement.style.cursor = 'grabbing';
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging && draggedTarget) {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 3) dragMoved = true;

      raycaster.setFromCamera(mouse, camera);
      const planeHit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane, planeHit)) {
        if (draggedTarget.type === 'body') {
          const newTotalPos = new THREE.Vector3().addVectors(planeHit, dragOffset);
          if (!window.bodyOffsets) window.bodyOffsets = {};
          if (!window.bodyOffsets[draggedTarget.bodyId]) {
            window.bodyOffsets[draggedTarget.bodyId] = { exploded: new THREE.Vector3(), manual: new THREE.Vector3() };
          }
          const exp = window.bodyOffsets[draggedTarget.bodyId].exploded || new THREE.Vector3();
          window.bodyOffsets[draggedTarget.bodyId].manual.subVectors(newTotalPos, exp);
          updateBody3DPosition(draggedTarget.bodyId);
        } else if (draggedTarget.type === 'meshGroup') {
          meshGroup.position.addVectors(planeHit, dragOffset);
        } else if (draggedTarget.type === 'solidGroup') {
          solidGroup.position.addVectors(planeHit, dragOffset);
        }
      }
    } else if (window.is3DDragEnabled) {
      // Dynamic hover cursor over any 3D draggable object
      const hit = getIntersectedTarget(e.clientX, e.clientY);
      if (hit) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    }
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (isDragging) {
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
      controls.enabled = true;
      isDragging = false;
      renderer.domElement.style.cursor = 'default';

      if (!dragMoved && draggedTarget && draggedTarget.type === 'body') {
        // Simple click without move toggles solo inspection in multi-body
        toggleSoloInspect(draggedTarget.bodyId);
      }
      draggedTarget = null;
    } else {
      // Regular click check
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist <= 5) {
        const hit = getIntersectedTarget(e.clientX, e.clientY);
        if (hit && hit.type === 'body') {
          toggleSoloInspect(hit.bodyId);
        }
      }
    }
  });

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function onWindowResize() {
  const container = document.getElementById('viewport-wrapper');
  if (!container) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Convert Base64 Float32 to native Float32Array safely
function base64ToFloat32Array(b64) {
  if (!b64 || typeof b64 !== 'string') {
    return new Float32Array(0);
  }
  try {
    const binaryString = window.atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Float32Array(bytes.buffer);
  } catch (err) {
    console.error('base64ToFloat32Array decode error:', err);
    return new Float32Array(0);
  }
}

// Clean and dispose of previous solid CAD model (STEP) geometry, materials, and UI state
function clearSolid() {
  while (solidGroup.children.length > 0) {
    const obj = solidGroup.children[0];
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    solidGroup.remove(obj);
  }

  currentLoadedSolid = null;
  currentStepPath = null;
  hasSavedCurrentStep = false;

  // Reset HUD view mode buttons
  const btnSolid = document.getElementById('btn-view-solid');
  const btnCompare = document.getElementById('btn-view-compare');
  const btnSplit = document.getElementById('btn-view-split');
  if (btnSolid) btnSolid.style.display = 'none';
  if (btnCompare) btnCompare.style.display = 'none';
  if (btnSplit) btnSplit.style.display = 'none';

  const badge = document.getElementById('split-hud-badge');
  if (badge) badge.style.display = 'none';

  // Hide Conversion Results and CAD Export Cards
  const resCard = document.getElementById('conversion-results-card');
  const expCard = document.getElementById('cad-export-card');
  if (resCard) resCard.style.display = 'none';
  if (expCard) expCard.style.display = 'none';

  // Ensure solidGroup is hidden and return view mode to mesh
  solidGroup.visible = false;
  meshGroup.visible = true;
  meshGroup.position.set(0, 0, 0);
  solidGroup.position.set(0, 0, 0);
  setMeshOpacity(1.0);
  setViewMode('mesh');
}

// Unsaved Converted Model Guard & Lifecycle Management
function openUnsavedModal() {
  const modal = document.getElementById('unsaved-modal');
  const fnEl = document.getElementById('unsaved-filename');
  if (fnEl && currentStepPath) {
    fnEl.textContent = currentStepPath.split(/[\\/]/).pop();
  }
  if (modal) modal.style.display = 'flex';
}

function closeUnsavedModal() {
  const modal = document.getElementById('unsaved-modal');
  if (modal) modal.style.display = 'none';
  pendingLoadAction = null;
}

function proceedWithoutSaving() {
  const modal = document.getElementById('unsaved-modal');
  if (modal) modal.style.display = 'none';
  const action = pendingLoadAction;
  pendingLoadAction = null;
  clearSolid();
  if (action) action();
}

async function saveAndProceed() {
  if (!currentStepPath) {
    proceedWithoutSaving();
    return;
  }
  try {
    const res = await window.pywebview.api.save_step_as(currentStepPath);
    if (res && res.success) {
      hasSavedCurrentStep = true;
      showToast('STEP dosyası başarıyla kaydedildi: ' + res.path, 'success');
      const modal = document.getElementById('unsaved-modal');
      if (modal) modal.style.display = 'none';
      const action = pendingLoadAction;
      pendingLoadAction = null;
      clearSolid();
      if (action) action();
    } else if (res && res.cancelled) {
      showToast('Kaydetme iptal edildi. Yeni model yüklenmedi.', 'info');
    } else {
      showToast('Kaydetme hatası: ' + (res ? res.error : 'Bilinmeyen hata'), 'error');
    }
  } catch (e) {
    showToast('Hata: ' + e, 'error');
  }
}

function requestLoadWithGuard(loadFn) {
  if (currentStepPath && !hasSavedCurrentStep) {
    pendingLoadAction = loadFn;
    openUnsavedModal();
  } else {
    loadFn();
  }
}

window.openUnsavedModal = openUnsavedModal;
window.closeUnsavedModal = closeUnsavedModal;
window.proceedWithoutSaving = proceedWithoutSaving;
window.saveAndProceed = saveAndProceed;

// Global tracking for multi-body assemblies
window.activeBodyMeshes = {};
window.currentBodies = [];

// Load and Render Raw Mesh (STL / 3MF) with Multi-Body Assembly Support
function renderMesh(meshData) {
  // Always clean previous solid model and reset solid states
  clearSolid();

  // Clear previous mesh
  while (meshGroup.children.length > 0) {
    const obj = meshGroup.children[0];
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    meshGroup.remove(obj);
  }

  window.activeBodyMeshes = {};
  window.currentBodies = meshData.bodies || [];

  if (meshData.is_multi_body && meshData.bodies && meshData.bodies.length > 1) {
    // Multi-body assembly mode: each body gets its own color & geometry
    meshData.bodies.forEach(body => {
      const positions = base64ToFloat32Array(body.vertices_b64);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.computeVertexNormals();

      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(body.color || '#475569'),
        roughness: 0.45,
        metalness: 0.20,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });

      const bodyMesh = new THREE.Mesh(geometry, bodyMat);
      bodyMesh.name = 'body_' + body.id;
      bodyMesh.userData = { bodyId: body.id, name: body.name };
      meshGroup.add(bodyMesh);

      // Wireframe overlay per body
      const wireGeometry = new THREE.WireframeGeometry(geometry);
      const wireMaterial = new THREE.LineBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.25,
        linewidth: 1
      });
      const wireObj = new THREE.LineSegments(wireGeometry, wireMaterial);
      wireObj.name = 'meshWireframe';
      wireObj.userData = { bodyId: body.id };
      meshGroup.add(wireObj);

      window.activeBodyMeshes[body.id] = {
        mesh: bodyMesh,
        wire: wireObj,
        data: body
      };
    });

    window.currentBodies = meshData.bodies;
    window.bodyOffsets = {};
    meshData.bodies.forEach(b => {
      window.bodyOffsets[b.id] = {
        exploded: new THREE.Vector3(0, 0, 0),
        manual: new THREE.Vector3(0, 0, 0)
      };
    });

    renderBodiesList(meshData.bodies);
    const cardBodies = document.getElementById('card-bodies');
    if (cardBodies) cardBodies.style.display = 'flex';

    // Show Multi-Body Separation & 3D Arrangement HUD
    const expGroup = document.getElementById('hud-exploded-group');
    const expDivider = document.getElementById('hud-exploded-divider');
    if (expGroup) expGroup.style.display = 'flex';
    if (expDivider) expDivider.style.display = 'block';
    const slider = document.getElementById('slider-exploded');
    if (slider) slider.value = 0;
    const valText = document.getElementById('val-exploded');
    if (valText) valText.textContent = '0%';
  } else {
    // Single body mode
    window.currentBodies = null;
    window.bodyOffsets = {};
    let b64 = meshData.vertices_b64;
    if (!b64 && meshData.bodies && meshData.bodies.length > 0 && meshData.bodies[0].vertices_b64) {
      b64 = meshData.bodies[0].vertices_b64;
    }
    const positions = base64ToFloat32Array(b64);
    if (positions.length === 0) {
      console.warn('renderMesh: Geometri verisi boş veya çözülemedi.');
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();

    const meshMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569, // Slate grey
      roughness: 0.5,
      metalness: 0.15,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const meshObject = new THREE.Mesh(geometry, meshMaterial);
    meshObject.name = 'originalMesh';
    meshGroup.add(meshObject);

    const wireGeometry = new THREE.WireframeGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.45,
      linewidth: 1
    });
    const wireframeObject = new THREE.LineSegments(wireGeometry, wireMaterial);
    wireframeObject.name = 'meshWireframe';
    meshGroup.add(wireframeObject);

    const cardBodies = document.getElementById('card-bodies');
    if (cardBodies) cardBodies.style.display = 'none';

    const expGroup = document.getElementById('hud-exploded-group');
    const expDivider = document.getElementById('hud-exploded-divider');
    if (expGroup) expGroup.style.display = 'none';
    if (expDivider) expDivider.style.display = 'none';
    exitSoloInspect();
  }

  currentLoadedMesh = meshData;
  currentBounds = meshData.bounds;

  // Ensure grid sits flat at Z=0
  gridHelper.position.set(0, 0, 0);

  fitCameraToBounds(currentBounds);
  setViewMode('mesh');
  updateUIWithMeshData(meshData);

  // Hide empty dropzone and reveal HUD toolbar
  document.getElementById('empty-dropzone').style.display = 'none';
  document.getElementById('viewport-hud').style.display = 'flex';
}

let draggedBodyIndex = null;
window.isSoloInspectMode = false;
window.currentSoloBodyId = null;

function renderBodiesList(bodies) {
  const container = document.getElementById('bodies-list-container');
  const badge = document.getElementById('bodies-count-badge');
  if (!container) return;

  window.currentBodies = bodies;
  const total = bodies.length;
  const activeCount = bodies.filter(b => b.selected !== false).length;
  if (badge) badge.textContent = `${activeCount} / ${total}`;

  container.innerHTML = '';
  bodies.forEach((body, index) => {
    const item = document.createElement('div');
    const isInactive = body.selected === false;
    const isSolo = window.isSoloInspectMode && String(window.currentSoloBodyId) === String(body.id);
    item.className = 'body-item' + (isInactive ? ' inactive' : '') + (isSolo ? ' solo-active' : '');
    item.id = `body-item-${body.id}`;
    item.setAttribute('draggable', 'true');
    item.dataset.index = index;
    item.dataset.id = body.id;

    item.innerHTML = `
      <span class="drag-handle" title="Sıralamayı değiştirmek için sürükleyin">⋮⋮</span>
      <label class="body-label">
        <input type="checkbox" class="body-checkbox" id="body-chk-${body.id}" data-id="${body.id}" ${body.selected !== false ? 'checked' : ''} onchange="onBodyCheckboxChange('${body.id}', this.checked)">
        <span class="body-color-dot" style="background-color: ${body.color}; color: ${body.color};"></span>
        <span class="body-name" title="${body.name}">${body.name}</span>
      </label>
      <span class="body-triangles">${body.triangle_count.toLocaleString()} ${typeof t === 'function' ? t('unit_facets', 'faset') : 'faset'}</span>
      <button class="btn-inspect" title="Bu parçayı izole et ve yan yana incele" onclick="toggleSoloInspect('${body.id}', event)">
        ${isSolo ? (typeof t === 'function' ? t('btn_inspecting', '✓ İncelemede') : '✓ İncelemede') : (typeof t === 'function' ? t('btn_inspect', '🔍 İncele') : '🔍 İncele')}
      </button>
    `;

    // HTML5 Drag and Drop Reordering
    item.addEventListener('dragstart', (e) => {
      draggedBodyIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        item.classList.add('drag-over-top');
        item.classList.remove('drag-over-bottom');
      } else {
        item.classList.add('drag-over-bottom');
        item.classList.remove('drag-over-top');
      }
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over-top', 'drag-over-bottom');
      if (draggedBodyIndex === null || draggedBodyIndex === index) return;

      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      let targetIndex = index;

      const movedItem = bodies.splice(draggedBodyIndex, 1)[0];
      bodies.splice(targetIndex, 0, movedItem);
      draggedBodyIndex = null;
      renderBodiesList(bodies);

      // Persist order to backend
      if (window.pywebview && window.pywebview.api && window.pywebview.api.reorder_bodies) {
        window.pywebview.api.reorder_bodies(bodies.map(b => b.id));
      }
    });

    item.addEventListener('dragend', () => {
      draggedBodyIndex = null;
      document.querySelectorAll('.body-item').forEach(el => {
        el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
    });

    // 3D Viewport Hover Highlight
    item.addEventListener('mouseenter', () => {
      if (window.activeBodyMeshes && window.activeBodyMeshes[body.id]) {
        const wire = window.activeBodyMeshes[body.id].wire;
        if (wire && wire.material) {
          wire.material.color.setHex(0xffffff);
          wire.material.opacity = 0.85;
        }
      }
    });

    item.addEventListener('mouseleave', () => {
      if (window.activeBodyMeshes && window.activeBodyMeshes[body.id]) {
        const wire = window.activeBodyMeshes[body.id].wire;
        if (wire && wire.material) {
          wire.material.color.setHex(0x00f2fe);
          wire.material.opacity = 0.25;
        }
      }
    });

    container.appendChild(item);
  });
}

function toggleSoloInspect(bodyId, e) {
  if (e) e.stopPropagation();
  if (window.isSoloInspectMode && String(window.currentSoloBodyId) === String(bodyId)) {
    exitSoloInspect();
  } else {
    enterSoloInspect(bodyId);
  }
}

function enterSoloInspect(bodyId) {
  if (!window.currentBodies) return;
  const targetBody = window.currentBodies.find(b => String(b.id) === String(bodyId));
  if (!targetBody) return;

  window.isSoloInspectMode = true;
  window.currentSoloBodyId = String(bodyId);

  // 1. Isolate in meshGroup
  if (window.activeBodyMeshes) {
    Object.keys(window.activeBodyMeshes).forEach(id => {
      const isTarget = (String(id) === String(bodyId));
      window.activeBodyMeshes[id].mesh.visible = isTarget;
      window.activeBodyMeshes[id].wire.visible = isTarget;
    });
  }

  // 2. Isolate in solidGroup (if per-body solid meshes exist)
  solidGroup.traverse(child => {
    if (child.userData && child.userData.bodyId !== undefined) {
      child.visible = (String(child.userData.bodyId) === String(bodyId));
    }
  });

  // 3. Zoom camera into component
  if (targetBody.bounds) {
    fitCameraToBounds(targetBody.bounds);
  }

  // 4. If solid CAD model is loaded, activate split/side-by-side mode for direct comparison
  if (currentLoadedSolid && viewMode !== 'split' && viewMode !== 'compare') {
    setViewMode('split');
  }

  // 5. Update Solo Inspect HUD
  const hud = document.getElementById('solo-inspect-hud');
  const dot = document.getElementById('solo-dot');
  const title = document.getElementById('solo-title');
  const stats = document.getElementById('solo-stats');
  const counter = document.getElementById('solo-counter');

  if (hud) hud.style.display = 'flex';
  if (dot) {
    dot.style.backgroundColor = targetBody.color;
    dot.style.color = targetBody.color;
  }
  if (title) title.textContent = targetBody.name;
  if (stats) stats.textContent = `${targetBody.triangle_count.toLocaleString()} faset ${currentLoadedSolid ? '• Katı Model Aktif' : ''}`;

  const currentIndex = window.currentBodies.findIndex(b => String(b.id) === String(bodyId));
  if (counter) counter.textContent = `${currentIndex + 1} / ${window.currentBodies.length}`;

  // 6. Update sidebar active styles
  document.querySelectorAll('.body-item').forEach(el => {
    el.classList.toggle('solo-active', el.dataset.id === String(bodyId));
    const btn = el.querySelector('.btn-inspect');
    if (btn) btn.textContent = (el.dataset.id === String(bodyId)) ? '✓ İncelemede' : '🔍 İncele';
  });
}

function exitSoloInspect() {
  window.isSoloInspectMode = false;
  window.currentSoloBodyId = null;

  // Restore meshGroup visibility based on checkboxes
  if (window.activeBodyMeshes) {
    Object.keys(window.activeBodyMeshes).forEach(id => {
      const isChecked = window.activeBodyMeshes[id].data.selected !== false;
      window.activeBodyMeshes[id].mesh.visible = isChecked;
      window.activeBodyMeshes[id].wire.visible = isChecked;
    });
  }

  // Restore solidGroup visibility
  solidGroup.traverse(child => {
    if (child.userData && child.userData.bodyId !== undefined) {
      const bodyData = (window.currentBodies || []).find(b => String(b.id) === String(child.userData.bodyId));
      child.visible = bodyData ? (bodyData.selected !== false) : true;
    } else {
      child.visible = true;
    }
  });

  const hud = document.getElementById('solo-inspect-hud');
  if (hud) hud.style.display = 'none';

  document.querySelectorAll('.body-item').forEach(el => {
    el.classList.remove('solo-active');
    const btn = el.querySelector('.btn-inspect');
    if (btn) btn.textContent = '🔍 İncele';
  });

  if (currentBounds) {
    fitCameraToBounds(currentBounds);
  }
}

function navigateSoloBody(direction) {
  if (!window.currentBodies || window.currentBodies.length === 0) return;
  let currIdx = window.currentBodies.findIndex(b => String(b.id) === String(window.currentSoloBodyId));
  if (currIdx === -1) currIdx = 0;
  let nextIdx = (currIdx + direction + window.currentBodies.length) % window.currentBodies.length;
  enterSoloInspect(window.currentBodies[nextIdx].id);
}

// =========================================================================
// Multi-Body 3D Direct Positioning, Separation & Arrangement System
// =========================================================================
window.bodyOffsets = {};
window.is3DDragEnabled = true;

function getBodyTotalPosition(bodyId) {
  if (window.bodyOffsets && window.bodyOffsets[bodyId]) {
    const off = window.bodyOffsets[bodyId];
    return new THREE.Vector3().addVectors(
      off.exploded || new THREE.Vector3(),
      off.manual || new THREE.Vector3()
    );
  }
  if (window.activeBodyMeshes && window.activeBodyMeshes[bodyId]) {
    return window.activeBodyMeshes[bodyId].mesh.position.clone();
  }
  return new THREE.Vector3(0, 0, 0);
}

function updateBody3DPosition(bodyId) {
  if (!window.bodyOffsets || !window.bodyOffsets[bodyId]) return;
  const offsets = window.bodyOffsets[bodyId];
  const total = new THREE.Vector3().addVectors(
    offsets.exploded || new THREE.Vector3(),
    offsets.manual || new THREE.Vector3()
  );

  // 1. Update Mesh and Wireframe
  if (window.activeBodyMeshes && window.activeBodyMeshes[bodyId]) {
    window.activeBodyMeshes[bodyId].mesh.position.copy(total);
    window.activeBodyMeshes[bodyId].wire.position.copy(total);
  }

  // 2. Update Solid Faces and Edges
  solidGroup.traverse(child => {
    if (child.userData && String(child.userData.bodyId) === String(bodyId)) {
      child.position.copy(total);
    }
  });
}

function updateAllBody3DPositions() {
  if (!window.bodyOffsets) return;
  Object.keys(window.bodyOffsets).forEach(bid => {
    updateBody3DPosition(bid);
  });
}

// "Ayrıştır" (Exploded/Separation) Slider Implementation
function onExplodedSliderChange(percentVal) {
  const pct = parseFloat(percentVal) / 100.0;
  const valLabel = document.getElementById('val-exploded');
  if (valLabel) valLabel.textContent = `${Math.round(percentVal)}%`;

  if (!window.activeBodyMeshes || !currentBounds) return;

  const center = new THREE.Vector3(...(currentBounds.center || [0, 0, 0]));
  const maxSpan = (currentBounds.diagonal || 120) * 0.75;
  const bodyKeys = Object.keys(window.activeBodyMeshes);
  const total = bodyKeys.length;

  if (!window.bodyOffsets) window.bodyOffsets = {};

  bodyKeys.forEach((bid, idx) => {
    const item = window.activeBodyMeshes[bid];
    const bData = item.data;
    const bCenter = (bData && bData.bounds && bData.bounds.center) 
      ? new THREE.Vector3(...bData.bounds.center) 
      : new THREE.Vector3(0, 0, 0);

    let dir = new THREE.Vector3().subVectors(bCenter, center);
    if (dir.lengthSq() < 1) {
      const angle = (idx / total) * 2 * Math.PI;
      dir.set(Math.cos(angle), Math.sin(angle), 0.15);
    }
    dir.normalize();

    const offset = dir.multiplyScalar(pct * maxSpan);

    if (!window.bodyOffsets[bid]) {
      window.bodyOffsets[bid] = { exploded: new THREE.Vector3(), manual: new THREE.Vector3() };
    }
    window.bodyOffsets[bid].exploded.copy(offset);
    updateBody3DPosition(bid);
  });
}

// Arrange all bodies side-by-side along the X-axis for clear comparative inspection
function arrangeBodiesSideBySide() {
  if (!window.currentBodies || window.currentBodies.length <= 1) {
    showToast('Yan yana dizmek için modelde birden fazla gövde olmalıdır.', 'warning');
    return;
  }

  const bodies = window.currentBodies;
  if (!window.bodyOffsets) window.bodyOffsets = {};

  let widths = [];
  let totalWidth = 0;
  const margin = Math.max(16, (currentBounds && currentBounds.diagonal) ? currentBounds.diagonal * 0.18 : 25);

  bodies.forEach(b => {
    let w = 40;
    if (b.bounds && b.bounds.size && b.bounds.size[0] > 0) {
      w = b.bounds.size[0];
    } else if (window.activeBodyMeshes && window.activeBodyMeshes[b.id]) {
      const geo = window.activeBodyMeshes[b.id].mesh.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      w = geo.boundingBox.max.x - geo.boundingBox.min.x;
    }
    widths.push(w);
    totalWidth += w;
  });

  totalWidth += (bodies.length - 1) * margin;
  let curX = -totalWidth / 2;

  bodies.forEach((b, idx) => {
    const w = widths[idx];
    const targetCenterX = curX + w / 2;

    let origCenterX = 0;
    let origCenterY = 0;
    let origMinZ = 0;

    if (b.bounds) {
      origCenterX = (b.bounds.center && b.bounds.center[0]) || 0;
      origCenterY = (b.bounds.center && b.bounds.center[1]) || 0;
      origMinZ = (b.bounds.min && b.bounds.min[2]) || 0;
    }

    const deltaX = targetCenterX - origCenterX;
    const deltaY = -origCenterY;
    const deltaZ = -origMinZ; // Ground each body flat on Z=0

    window.bodyOffsets[b.id] = {
      exploded: new THREE.Vector3(0, 0, 0),
      manual: new THREE.Vector3(deltaX, deltaY, deltaZ)
    };

    curX += w + margin;
  });

  updateAllBody3DPositions();

  // Reset Ayrıştır slider UI
  const slider = document.getElementById('slider-exploded');
  if (slider) slider.value = 0;
  const valLabel = document.getElementById('val-exploded');
  if (valLabel) valLabel.textContent = '↔️';

  fitCameraToAllBodies();
  showToast('Tüm gövdeler (Mesh & Katı Model) 3D sahnede yan yana dizildi.', 'success');
}

// Reset side-by-side (split) mode positions
function resetSplitPositions() {
  const b = currentBounds || (currentLoadedMesh && currentLoadedMesh.bounds) || null;
  const width = (b && b.dimensions) ? Math.max(b.dimensions[0], b.dimensions[1] * 0.75) : 60;
  const diag = (b && b.diagonal) ? b.diagonal : 80;
  const spacing = Math.max(width * 1.4, diag * 0.8, 50);

  meshGroup.position.set(-spacing * 0.55, 0, 0);
  solidGroup.position.set(spacing * 0.55, 0, 0);

  if (window.currentBodies && window.bodyOffsets) {
    window.currentBodies.forEach(b => {
      window.bodyOffsets[b.id] = {
        exploded: new THREE.Vector3(0, 0, 0),
        manual: new THREE.Vector3(0, 0, 0)
      };
    });
    updateAllBody3DPositions();
  }

  resetView();
  showToast('Yan yana model konumları başlangıç hizasına sıfırlandı.', 'info');
}

// Reset all body/model positions back to original positions
function resetBodyPositions() {
  if (viewMode === 'split') {
    resetSplitPositions();
    return;
  }

  if (window.currentBodies && window.bodyOffsets) {
    window.currentBodies.forEach(b => {
      window.bodyOffsets[b.id] = {
        exploded: new THREE.Vector3(0, 0, 0),
        manual: new THREE.Vector3(0, 0, 0)
      };
    });
    updateAllBody3DPositions();
  }

  meshGroup.position.set(0, 0, 0);
  solidGroup.position.set(0, 0, 0);

  const slider = document.getElementById('slider-exploded');
  if (slider) slider.value = 0;
  const valLabel = document.getElementById('val-exploded');
  if (valLabel) valLabel.textContent = '0%';

  resetView();
  showToast('Model konumları orijinal pozisyona sıfırlandı.', 'info');
}

// Toggle free 3D drag mode on/off
function toggle3DDragMode() {
  window.is3DDragEnabled = !window.is3DDragEnabled;
  document.querySelectorAll('.btn-toggle-3d-drag, #btn-toggle-3d-drag, #btn-hud-toggle-3d-drag').forEach(btn => {
    btn.classList.toggle('active', window.is3DDragEnabled);
  });
  if (window.is3DDragEnabled) {
    showToast('🖐️ 3D Model Taşıma: Açık. Modelleri mouse ile tutup serbestçe sürükleyebilirsiniz.', 'info');
  } else {
    showToast('🖐️ 3D Model Taşıma: Kapalı. Standart kamera döndürme devrede.', 'info');
  }
}

window.resetSplitPositions = resetSplitPositions;

// Re-focus camera to frame all separated bodies
function fitCameraToAllBodies() {
  const box = new THREE.Box3();
  if (viewMode === 'solid' && solidGroup.children.length > 0) {
    box.setFromObject(solidGroup);
  } else if (meshGroup.children.length > 0) {
    box.setFromObject(meshGroup);
  }
  if (box.isEmpty()) return;

  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  const fov = camera.fov * (Math.PI / 180);
  let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

  controls.target.copy(center);
  camera.position.set(center.x + cameraDist * 0.7, center.y - cameraDist * 0.9, center.z + cameraDist * 0.6);
  controls.update();
}

window.arrangeBodiesSideBySide = arrangeBodiesSideBySide;
window.resetBodyPositions = resetBodyPositions;
window.toggle3DDragMode = toggle3DDragMode;
window.onExplodedSliderChange = onExplodedSliderChange;

async function onBodyCheckboxChange(bodyId, isChecked) {
  // 1. Toggle 3D mesh visibility
  if (window.activeBodyMeshes && window.activeBodyMeshes[bodyId]) {
    window.activeBodyMeshes[bodyId].mesh.visible = isChecked;
    window.activeBodyMeshes[bodyId].wire.visible = isChecked;
    window.activeBodyMeshes[bodyId].data.selected = isChecked;
  }

  const item = document.getElementById(`body-item-${bodyId}`);
  if (item) {
    item.classList.toggle('inactive', !isChecked);
  }

  // 2. Gather active IDs
  const checkedBoxes = document.querySelectorAll('.body-checkbox:checked');
  const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.id);

  const badge = document.getElementById('bodies-count-badge');
  if (badge && window.currentBodies) {
    badge.textContent = `${selectedIds.length} / ${window.currentBodies.length}`;
  }

  if (selectedIds.length === 0) {
    showToast('En az bir parça seçili kalmalıdır.', 'info');
    return;
  }

  // 3. Notify backend
  try {
    const res = await window.pywebview.api.set_selected_bodies(selectedIds);
    if (res.success) {
      document.getElementById('stat-triangles').textContent = res.triangle_count.toLocaleString() + ' adet';
      document.getElementById('stat-vertices').textContent = res.vertex_count.toLocaleString() + ' adet';
      if (res.bounds && res.bounds.dimensions) {
        const d = res.bounds.dimensions;
        document.getElementById('stat-dimensions').textContent = `${d[0]} × ${d[1]} × ${d[2]} mm`;
        document.getElementById('stat-diagonal').textContent = res.bounds.diagonal + ' mm';
        currentBounds = res.bounds;
      }
      if (res.auto_tune) {
        currentAutoTune = res.auto_tune;
        document.getElementById('ai-tune-category').textContent = res.auto_tune.category;
        document.getElementById('ai-tune-badge').textContent = res.auto_tune.badge;
        document.getElementById('ai-tune-reason').textContent = res.auto_tune.reason;
        if (res.auto_tune.recommended_mode) {
          document.getElementById('setting-engine-mode').value = res.auto_tune.recommended_mode;
        }
        if (res.auto_tune.recommended_engine) {
          setEngineCore(res.auto_tune.recommended_engine);
        }
      }
    }
  } catch (e) {
    console.error('set_selected_bodies error:', e);
  }
}

async function selectAllBodies(selectAll) {
  const checkboxes = document.querySelectorAll('.body-checkbox');
  const selectedIds = [];

  checkboxes.forEach(cb => {
    cb.checked = selectAll;
    const bodyId = cb.dataset.id;
    if (selectAll) selectedIds.push(bodyId);

    if (window.activeBodyMeshes && window.activeBodyMeshes[bodyId]) {
      window.activeBodyMeshes[bodyId].mesh.visible = selectAll;
      window.activeBodyMeshes[bodyId].wire.visible = selectAll;
      window.activeBodyMeshes[bodyId].data.selected = selectAll;
    }
    const item = document.getElementById(`body-item-${bodyId}`);
    if (item) {
      item.classList.toggle('inactive', !selectAll);
    }
  });

  const badge = document.getElementById('bodies-count-badge');
  if (badge && window.currentBodies) {
    badge.textContent = `${selectedIds.length} / ${window.currentBodies.length}`;
  }

  if (selectedIds.length === 0) {
    showToast('Tüm seçimler kaldırıldı. Dönüştürme için en az bir gövde seçin.', 'info');
    return;
  }

  try {
    const res = await window.pywebview.api.set_selected_bodies(selectedIds);
    if (res.success) {
      document.getElementById('stat-triangles').textContent = res.triangle_count.toLocaleString() + ' adet';
      document.getElementById('stat-vertices').textContent = res.vertex_count.toLocaleString() + ' adet';
      if (res.bounds && res.bounds.dimensions) {
        const d = res.bounds.dimensions;
        document.getElementById('stat-dimensions').textContent = `${d[0]} × ${d[1]} × ${d[2]} mm`;
        document.getElementById('stat-diagonal').textContent = res.bounds.diagonal + ' mm';
        currentBounds = res.bounds;
      }
      if (res.auto_tune) {
        currentAutoTune = res.auto_tune;
        document.getElementById('ai-tune-category').textContent = res.auto_tune.category;
        document.getElementById('ai-tune-badge').textContent = res.auto_tune.badge;
        document.getElementById('ai-tune-reason').textContent = res.auto_tune.reason;
        if (res.auto_tune.recommended_mode) {
          document.getElementById('setting-engine-mode').value = res.auto_tune.recommended_mode;
        }
        if (res.auto_tune.recommended_engine) {
          setEngineCore(res.auto_tune.recommended_engine);
        }
      }
      fitCameraToBounds(currentBounds);
    }
  } catch (e) {
    console.error('selectAllBodies error:', e);
  }
}

window.renderBodiesList = renderBodiesList;
window.onBodyCheckboxChange = onBodyCheckboxChange;
window.selectAllBodies = selectAllBodies;
window.toggleSoloInspect = toggleSoloInspect;
window.enterSoloInspect = enterSoloInspect;
window.exitSoloInspect = exitSoloInspect;
window.navigateSoloBody = navigateSoloBody;
window.onExplodedSliderChange = onExplodedSliderChange;

function renderSolid(solidData, switchView = false) {
  while (solidGroup.children.length > 0) {
    const obj = solidGroup.children[0];
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    solidGroup.remove(obj);
  }

  if (solidData.bodies && Array.isArray(solidData.bodies) && solidData.bodies.length > 0) {
    // Multi-body solid rendering with distinct CAD colors and per-body isolation
    solidData.bodies.forEach(b => {
      if (b.faces_b64) {
        const facePositions = base64ToFloat32Array(b.faces_b64);
        const faceGeo = new THREE.BufferGeometry();
        faceGeo.setAttribute('position', new THREE.BufferAttribute(facePositions, 3));
        faceGeo.computeVertexNormals();

        const solidMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(b.color || '#93c5fd'),
          metalness: 0.35,
          roughness: 0.38,
          side: THREE.DoubleSide
        });

        const solidFaceMesh = new THREE.Mesh(faceGeo, solidMaterial);
        solidFaceMesh.name = 'solidFace_' + b.id;
        solidFaceMesh.userData = { bodyId: String(b.id), name: b.name };
        solidGroup.add(solidFaceMesh);

        if (b.edges_b64) {
          const edgePositions = base64ToFloat32Array(b.edges_b64);
          const edgeGeo = new THREE.BufferGeometry();
          edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x0f172a,
            linewidth: 1.2
          });
          const edgeSegments = new THREE.LineSegments(edgeGeo, edgeMaterial);
          edgeSegments.name = 'solidEdges_' + b.id;
          edgeSegments.userData = { bodyId: String(b.id) };
          solidGroup.add(edgeSegments);
        } else {
          const edgeGeo = new THREE.EdgesGeometry(faceGeo, 1.0);
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x0f172a,
            linewidth: 1.2
          });
          const edgeSegments = new THREE.LineSegments(edgeGeo, edgeMaterial);
          edgeSegments.name = 'solidEdges_' + b.id;
          edgeSegments.userData = { bodyId: String(b.id) };
          solidGroup.add(edgeSegments);
        }
      }
    });
  } else if (solidData.faces_b64) {
    // 1. Solid Faces (Tessellated CAD B-Rep)
    const facePositions = base64ToFloat32Array(solidData.faces_b64);
    const faceGeo = new THREE.BufferGeometry();
    faceGeo.setAttribute('position', new THREE.BufferAttribute(facePositions, 3));
    faceGeo.computeVertexNormals();

    const solidMaterial = new THREE.MeshStandardMaterial({
      color: 0x93c5fd, // CAD metallic sky blue
      metalness: 0.30,
      roughness: 0.42,
      side: THREE.DoubleSide
    });

    const solidFaceMesh = new THREE.Mesh(faceGeo, solidMaterial);
    solidFaceMesh.name = 'solidFaces';
    solidGroup.add(solidFaceMesh);

    // 2. CAD B-Rep Feature Edges (True boundary edges matching Fusion 360)
    if (solidData.edges_b64) {
      const edgePositions = base64ToFloat32Array(solidData.edges_b64);
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x0f172a, // Authentic dark CAD boundary line
        linewidth: 1.5
      });

      const edgeSegments = new THREE.LineSegments(edgeGeo, edgeMaterial);
      edgeSegments.name = 'solidEdges';
      solidGroup.add(edgeSegments);
    } else if (solidGroup.children.length > 0) {
      const edgeGeo = new THREE.EdgesGeometry(faceGeo, 1.0);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        linewidth: 1.2
      });
      const edgeSegments = new THREE.LineSegments(edgeGeo, edgeMaterial);
      edgeSegments.name = 'solidEdges';
      solidGroup.add(edgeSegments);
    }
  }

  updateAllBody3DPositions();
  currentLoadedSolid = solidData;
  if (switchView) {
    setViewMode('solid');
  }
}

// Fallback solid CAD view if STEP tessellation was bypassed or timed out
function createFallbackSolidFromMesh() {
  while (solidGroup.children.length > 0) {
    const obj = solidGroup.children[0];
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    solidGroup.remove(obj);
  }

  meshGroup.traverse(child => {
    if (child.isMesh && child.visible && child.geometry) {
      const solidMaterial = new THREE.MeshStandardMaterial({
        color: child.material && child.material.color ? child.material.color.clone() : new THREE.Color(0x93c5fd),
        metalness: 0.35,
        roughness: 0.38,
        side: THREE.DoubleSide
      });
      const solidFaceMesh = new THREE.Mesh(child.geometry.clone(), solidMaterial);
      if (child.userData) {
        solidFaceMesh.userData = { ...child.userData };
      }
      solidGroup.add(solidFaceMesh);

      const edgeGeo = new THREE.EdgesGeometry(child.geometry, 28);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        linewidth: 1.2
      });
      const edgeSegments = new THREE.LineSegments(edgeGeo, edgeMaterial);
      edgeSegments.name = 'solidEdges';
      if (child.userData) {
        edgeSegments.userData = { ...child.userData };
      }
      solidGroup.add(edgeSegments);
    }
  });

  updateAllBody3DPositions();
  currentLoadedSolid = { is_fallback: true };
  setViewMode('solid');
}

// Fit Camera to model bounding box
function fitCameraToBounds(bounds) {
  if (!bounds) return;
  const center = new THREE.Vector3(...bounds.center);
  const diag = bounds.diagonal || 100;

  const fov = camera.fov * (Math.PI / 180);
  let distance = diag / (2 * Math.tan(fov / 2));
  distance *= 1.4;

  const offset = new THREE.Vector3(1, -1.2, 0.85).normalize().multiplyScalar(distance);
  camera.position.copy(center).add(offset);
  controls.target.copy(center);
  camera.lookAt(center);
  controls.update();
}

// Switch View Modes: 'mesh' | 'solid' | 'compare' | 'split'
function setViewMode(mode) {
  viewMode = mode;

  document.querySelectorAll('.mode-toggle-group .hud-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const badge = document.getElementById('split-hud-badge');

  if (mode === 'mesh') {
    meshGroup.visible = true;
    solidGroup.visible = false;
    meshGroup.position.set(0, 0, 0);
    solidGroup.position.set(0, 0, 0);
    setMeshOpacity(1.0);
    if (badge) badge.style.display = 'none';
  } else if (mode === 'solid') {
    meshGroup.visible = false;
    solidGroup.visible = true;
    meshGroup.position.set(0, 0, 0);
    solidGroup.position.set(0, 0, 0);
    if (badge) badge.style.display = 'none';
  } else if (mode === 'compare') {
    meshGroup.visible = true;
    solidGroup.visible = true;
    meshGroup.position.set(0, 0, 0);
    solidGroup.position.set(0, 0, 0);
    setMeshOpacity(0.45);
    if (badge) badge.style.display = 'none';
  } else if (mode === 'split') {
    // Side-by-side adjacent view for clear visual comparison
    meshGroup.visible = true;
    solidGroup.visible = true;
    setMeshOpacity(1.0);

    // Safely retrieve bounding dimensions from currentBounds or currentLoadedMesh
    const b = currentBounds || (currentLoadedMesh && currentLoadedMesh.bounds) || null;
    const width = (b && b.dimensions) ? Math.max(b.dimensions[0], b.dimensions[1] * 0.75) : 60;
    const diag = (b && b.diagonal) ? b.diagonal : 80;
    const spacing = Math.max(width * 1.4, diag * 0.8, 50);

    meshGroup.position.set(-spacing * 0.55, 0, 0);
    solidGroup.position.set(spacing * 0.55, 0, 0);

    if (badge) badge.style.display = 'flex';
  }
}

function setMeshOpacity(op) {
  meshGroup.traverse(child => {
    if (child.isMesh) {
      child.material.transparent = op < 1.0;
      child.material.opacity = op;
    }
  });
}

// Toggle Elements
function toggleWireframe() {
  const btn = document.getElementById('btn-toggle-wireframe');
  let anyVisible = false;
  meshGroup.traverse(child => {
    if (child.name === 'meshWireframe') {
      child.visible = !child.visible;
      anyVisible = child.visible;
    }
  });
  if (btn) btn.classList.toggle('active', anyVisible);
}

function toggleSolidEdges() {
  const btn = document.getElementById('btn-toggle-edges');
  const edges = solidGroup.getObjectByName('solidEdges');
  if (edges) {
    edges.visible = !edges.visible;
    btn.classList.toggle('active', edges.visible);
  }
}

function toggleGrid() {
  const btn = document.getElementById('btn-toggle-grid');
  gridHelper.visible = !gridHelper.visible;
  btn.classList.toggle('active', gridHelper.visible);
}

function resetView() {
  if (currentBounds) {
    if (viewMode === 'split') {
      const diag = currentBounds.diagonal || 100;
      fitCameraToBounds({
        center: [0, currentBounds.center ? currentBounds.center[1] : 0, currentBounds.center ? currentBounds.center[2] : 0],
        diagonal: diag * 1.65
      });
    } else {
      fitCameraToBounds(currentBounds);
    }
  }
}

// Mode Switch: AI vs Uzman Modu
function setConversionMode(mode) {
  conversionMode = mode;
  document.getElementById('btn-mode-ai').classList.toggle('active', mode === 'ai');
  document.getElementById('btn-mode-expert').classList.toggle('active', mode === 'expert');

  document.getElementById('ai-mode-container').style.display = mode === 'ai' ? 'flex' : 'none';
  document.getElementById('expert-mode-container').style.display = mode === 'expert' ? 'flex' : 'none';
}

let aiQualityPreference = 'balanced'; // 'fast' | 'balanced' | 'high'
let selectedEngineCore = 'native_re'; // 100% proprietary Titan CAD Engine (v3.0)

function setEngineCore(core) {
  selectedEngineCore = 'native_re';
  const btnNative = document.getElementById('btn-engine-native');
  const tag = document.getElementById('engine-badge-tag');

  if (btnNative) btnNative.classList.add('active');
  if (tag) {
    tag.textContent = '💎 Titan CAD v3.0';
    tag.style.background = 'rgba(0,242,254,0.15)';
    tag.style.color = 'var(--accent-cyan)';
  }
}

// Model Style & Design Characteristics System
const MODEL_STYLES_CONFIG = {
  prismatic: {
    category: "📐 Prizmatik Mekanik Gövde & Montaj Braketi",
    category_en: "📐 Prismatic Mechanical Body & Mounting Bracket",
    badge: "💎 Analitik Katı (TrueForm)",
    badge_en: "💎 Analytical Solid (TrueForm)",
    reason: "Düz montaj tablaları ve cıvata delikleri içeren prizmatik mekanik geometri. Düzlemler ve silindirik delikler analitik B-Rep olarak işlenir.",
    reason_en: "Prismatic mechanical geometry containing planar mounting surfaces and bolt holes. Analytical cylinders and planes fitted.",
    mode: "trueform",
    unify: true,
    unify_angle: 2.0,
    heal_method: "laplacian",
    crease: 25.0
  },
  gear: {
    category: "⚙️ Dişli ve Şaft / Aktarma Elemanı",
    category_en: "⚙️ Gear & Shaft / Transmission Element",
    badge: "💎 Titan Analitik CAD (Evolvent Profil)",
    badge_en: "💎 Titan Analytical CAD (Involute Profile)",
    reason: "Eksensel simetrik dişli evolvent eğrileri ve şaft yatakları. Diş profilleri mikron hassasiyetinde korunur.",
    reason_en: "Axially symmetric gear involute curves and shaft bores. Tooth profiles preserved at sub-micron fidelity.",
    mode: "trueform",
    unify: true,
    unify_angle: 1.5,
    heal_method: "laplacian",
    crease: 18.0
  },
  fastener: {
    category: "🔩 Vida, Somun ve Yivli Bağlantı Elemanı",
    category_en: "🔩 Screw, Nut & Threaded Fastener",
    badge: "💎 Titan Analitik CAD (Yiv Koruma)",
    badge_en: "💎 Titan Analytical CAD (Thread Protection)",
    reason: "Helisel vida dişi ve bağlantı geometrisi. Yivler ve altıgen formlar analitik B-Rep ile korunur.",
    reason_en: "Helical screw threads and fastener geometry. Threads and hex bodies preserved via analytical B-Rep.",
    mode: "trueform",
    unify: true,
    unify_angle: 2.0,
    heal_method: "laplacian",
    crease: 20.0
  },
  organic: {
    category: "🎨 Organik Form / Sanatsal Heykel / Figür",
    category_en: "🎨 Organic Form / Sculpture / Figurine",
    badge: "💎 Titan CAD (Organik Doku Koruma)",
    badge_en: "💎 Titan CAD (Organic Texture Protection)",
    reason: "Serbest formlu organik kıvrımlar ve estetik yüzey detayları. Anatomik detaylar faset dikişiyle tam katıya aktarılır.",
    reason_en: "Freeform organic curves and aesthetic sculpt details. Anatomical features converted into full solid via verbatim mesh.",
    mode: "verbatim",
    unify: true,
    unify_angle: 1.5,
    heal_method: "bilateral",
    crease: 45.0
  },
  honeycomb: {
    category: "🕳️ Bal Peteği / İnce Kafes Yapısı",
    category_en: "🕳️ Honeycomb / Porous Lattice Structure",
    badge: "💎 Titan CAD (Kafes Koruma)",
    badge_en: "💎 Titan CAD (Lattice Protection)",
    reason: "İnce gözenekli hücreler ve bal peteği kafes geometrisi. İnce duvarlar mikron hassasiyetinde manifold katıya dönüştürülür.",
    reason_en: "Porous cells and honeycomb lattice geometry. Thin walls converted to manifold solid with micron precision.",
    mode: "verbatim",
    unify: true,
    unify_angle: 2.5,
    heal_method: "laplacian",
    crease: 35.0
  },
  scan: {
    category: "📱 3D Tarama / Tersine Mühendislik",
    category_en: "📱 3D Scan / Reverse Engineering",
    badge: "💎 Titan CAD (Tarama İyileştirme)",
    badge_en: "💎 Titan CAD (Scan Optimization)",
    reason: "Optik/LIDAR veya fotogrametri ile taranmış gürültülü mesh. Bilateral normal yumuşatma ile pürüzsüz CAD katısına dönüştürülür.",
    reason_en: "Noisy mesh scanned via optical/LIDAR or photogrammetry. Smoothed into clean CAD solid via bilateral normal filtering.",
    mode: "verbatim",
    unify: true,
    unify_angle: 2.5,
    heal_method: "bilateral",
    crease: 35.0
  }
};

function onManualModelStyleChange(styleKey) {
  if (!styleKey) return;
  const cfg = MODEL_STYLES_CONFIG[styleKey] || MODEL_STYLES_CONFIG.prismatic;
  const isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';

  // Remove awaiting style and pulsing animation
  const selStyle = document.getElementById('select-model-style');
  if (selStyle) selStyle.classList.remove('style-awaiting-select');
  const btnAi = document.getElementById('btn-detect-style-ai');
  if (btnAi) btnAi.classList.remove('pulsing-hint');

  const styleLabel = isEn ? cfg.category_en : cfg.category;
  const hintEl = document.getElementById('style-choice-hint');
  if (hintEl) {
    hintEl.classList.add('selected-state');
    hintEl.innerHTML = `<span class="hint-bullet">✅</span><span>${isEn ? 'Style applied:' : 'Model tarzı uygulandı:'} <strong>${styleLabel}</strong></span>`;
  }

  // 1. Update source badge to Manual
  const sourceBadge = document.getElementById('model-style-source-badge');
  if (sourceBadge) {
    sourceBadge.dataset.source = 'manual';
    sourceBadge.textContent = typeof t === 'function' ? t('badge_manual') : 'Manuel';
    sourceBadge.style.background = 'rgba(255, 170, 0, 0.15)';
    sourceBadge.style.color = '#ffaa00';
    sourceBadge.style.borderColor = 'rgba(255, 170, 0, 0.4)';
  }

  // 2. Update AI auto-tune display card
  const catEl = document.getElementById('ai-tune-category');
  const badgeEl = document.getElementById('ai-tune-badge');
  const reasonEl = document.getElementById('ai-tune-reason');
  if (catEl) catEl.textContent = isEn ? cfg.category_en : cfg.category;
  if (badgeEl) badgeEl.textContent = isEn ? cfg.badge_en : cfg.badge;
  if (reasonEl) reasonEl.textContent = isEn ? cfg.reason_en : cfg.reason;

  // 3. Update expert conversion settings
  const engModeEl = document.getElementById('setting-engine-mode');
  const unifyEl = document.getElementById('setting-unify');
  const unifyAngleEl = document.getElementById('setting-unify-angle');
  if (engModeEl) engModeEl.value = cfg.mode;
  if (unifyEl) unifyEl.value = cfg.unify ? 'true' : 'false';
  if (unifyAngleEl) unifyAngleEl.value = String(cfg.unify_angle);

  // 4. Update healing method & crease angle
  const healMethodRadios = document.querySelectorAll('input[name="heal-method"]');
  healMethodRadios.forEach(r => {
    if (r.value === cfg.heal_method) r.checked = true;
  });
  const creaseSelect = document.getElementById('sel-heal-dihedral');
  if (creaseSelect) creaseSelect.value = String(cfg.crease);

  // 5. Update active autoTune state
  currentAutoTune = {
    style_key: styleKey,
    category: isEn ? cfg.category_en : cfg.category,
    badge: isEn ? cfg.badge_en : cfg.badge,
    reason: isEn ? cfg.reason_en : cfg.reason,
    recommended_mode: cfg.mode,
    recommended_unify: cfg.unify,
    recommended_unify_angle: cfg.unify_angle,
    recommended_engine: "native_re"
  };

  showToast(isEn ? `Design style applied: ${styleLabel}` : `Model tarzı uygulandı: ${styleLabel}`, 'info');
}

async function triggerAIDetectModelStyle() {
  if (!currentFilePath) {
    showToast(typeof t === 'function' ? t('status_ready') : 'Lütfen önce bir 3D model yükleyin.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-detect-style-ai');
  const catEl = document.getElementById('ai-tune-category');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> <span>...</span>';
  }
  if (catEl) {
    catEl.textContent = typeof t === 'function' ? t('ai_analyzing') : '⏳ Model Analiz Ediliyor...';
  }

  try {
    const res = await window.pywebview.api.detect_model_style(currentFilePath);
    if (res && res.success) {
      const isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
      const styleKey = res.style_key || 'prismatic';

      // Set dropdown and clear awaiting style
      const sel = document.getElementById('select-model-style');
      if (sel) {
        sel.value = styleKey;
        sel.classList.remove('style-awaiting-select');
      }
      if (btn) btn.classList.remove('pulsing-hint');

      const hintEl = document.getElementById('style-choice-hint');
      if (hintEl) {
        hintEl.classList.add('selected-state');
        hintEl.innerHTML = `<span class="hint-bullet">🤖</span><span>${isEn ? 'AI Detected:' : 'AI ile Belirlendi:'} <strong>${res.category}</strong></span>`;
      }

      // Update badge
      const sourceBadge = document.getElementById('model-style-source-badge');
      if (sourceBadge) {
        sourceBadge.dataset.source = res.source;
        if (res.source === 'gemini') {
          sourceBadge.textContent = typeof t === 'function' ? t('badge_ai_gemini') : '🤖 Gemini AI';
          sourceBadge.style.background = 'rgba(168, 85, 247, 0.15)';
          sourceBadge.style.color = '#c084fc';
          sourceBadge.style.borderColor = 'rgba(168, 85, 247, 0.4)';
        } else {
          sourceBadge.textContent = typeof t === 'function' ? t('badge_local_geo') : '⚡ Yerel Geometri';
          sourceBadge.style.background = 'rgba(0, 242, 254, 0.15)';
          sourceBadge.style.color = 'var(--accent-cyan)';
          sourceBadge.style.borderColor = 'rgba(0, 242, 254, 0.4)';
        }
      }

      // Update description
      const catEl = document.getElementById('ai-tune-category');
      const badgeEl = document.getElementById('ai-tune-badge');
      const reasonEl = document.getElementById('ai-tune-reason');
      if (catEl) catEl.textContent = res.category || (isEn ? MODEL_STYLES_CONFIG[styleKey].category_en : MODEL_STYLES_CONFIG[styleKey].category);
      if (badgeEl) badgeEl.textContent = res.badge;
      if (reasonEl) reasonEl.textContent = res.reason;

      // Update conversion settings
      if (res.recommended_mode) {
        document.getElementById('setting-engine-mode').value = res.recommended_mode;
      }
      if (res.recommended_unify !== undefined) {
        document.getElementById('setting-unify').value = res.recommended_unify ? 'true' : 'false';
      }
      if (res.recommended_unify_angle) {
        document.getElementById('setting-unify-angle').value = String(res.recommended_unify_angle);
      }

      currentAutoTune = res;
      showToast(isEn ? `Style detected: ${res.category}` : `Model tarzı belirlendi: ${res.category}`, 'success');
    } else {
      showToast(res.error || 'Tarz analizi yapılamadı.', 'error');
    }
  } catch (err) {
    console.error('detect_model_style error:', err);
    showToast('AI tarz analizi çağrısı başarısız oldu.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

function updateQualitySummaryText() {
  const sumEl = document.getElementById('ai-quality-summary');
  if (!sumEl) return;
  const isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
  if (aiQualityPreference === 'fast') {
    sumEl.textContent = isEn ? 'Fast CAD (Basic Facets)' : 'Hızlı CAD (Temel Faset)';
  } else if (aiQualityPreference === 'balanced') {
    sumEl.textContent = isEn ? 'Balanced CAD (Recommended)' : 'Dengeli CAD (Önerilen)';
  } else if (aiQualityPreference === 'high') {
    sumEl.textContent = isEn ? 'Titan Precision (Full Manifold Solid)' : 'Titan Hassas (Tam Manifold Katı)';
  }
}

function setAIQualityPreference(pref) {
  aiQualityPreference = pref;
  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.quality === pref);
  });
  updateQualitySummaryText();
}

// Transform Trigger (Grounding Z=0, Lay flat, 90 deg rotations)
async function triggerTransform(action) {
  if (!currentFilePath) return;
  try {
    const res = await window.pywebview.api.transform_mesh(action);
    if (res.success) {
      if (res.matrix_4x4) {
        // Fast in-place GPU transformation via 4x4 matrix (< 2ms, zero freeze)
        const m4 = new THREE.Matrix4();
        m4.set(
          res.matrix_4x4[0], res.matrix_4x4[1], res.matrix_4x4[2], res.matrix_4x4[3],
          res.matrix_4x4[4], res.matrix_4x4[5], res.matrix_4x4[6], res.matrix_4x4[7],
          res.matrix_4x4[8], res.matrix_4x4[9], res.matrix_4x4[10], res.matrix_4x4[11],
          0, 0, 0, 1
        );

        // 1. Transform meshGroup (both faces and wireframe lines)
        meshGroup.traverse(child => {
          if (child.isMesh || child.isLineSegments) {
            if (child.geometry) {
              child.geometry.applyMatrix4(m4);
              if (child.isMesh) child.geometry.computeVertexNormals();
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
              child.geometry.attributes.position.needsUpdate = true;
            }
          }
        });

        // 2. Transform solidGroup (both CAD B-Rep faces and true boundary feature edges)
        solidGroup.traverse(child => {
          if (child.isMesh || child.isLineSegments) {
            if (child.geometry) {
              child.geometry.applyMatrix4(m4);
              if (child.isMesh) child.geometry.computeVertexNormals();
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
              child.geometry.attributes.position.needsUpdate = true;
            }
          }
        });
      }

      currentBounds = res.bounds;
      const d = currentBounds.dimensions;
      document.getElementById('stat-dimensions').textContent = `${d[0]} × ${d[1]} × ${d[2]} mm`;
      document.getElementById('stat-diagonal').textContent = currentBounds.diagonal + ' mm';

      // Grid always sits flat at Z=0
      gridHelper.position.set(0, 0, 0);
      fitCameraToBounds(currentBounds);

      const labels = {
        'ground': 'Model Z=0 tabanına oturtuldu.',
        'lay_flat': 'Model en geniş yüzeyi tabana gelecek şekilde yatırıldı.',
        'rot_x_90': 'Model 90° döndürüldü ve tabana oturtuldu.',
        'rot_y_90': 'Model Y ekseninde 90° döndürüldü ve tabana oturtuldu.',
        'rot_z_90': 'Model Z ekseninde 90° döndürüldü ve tabana oturtuldu.',
        'flip_z': 'Model 180° ters çevrildi ve tabana oturtuldu.',
        'scale_1000': 'Model 1000x büyütüldü (Metre ➔ Milimetre CAD standardı uygulandı).',
        'scale_0001': 'Model 0.001x küçültüldü.'
      };
      if (action === 'scale_1000') {
        const mw = document.getElementById('meter-scale-warning');
        if (mw) mw.style.display = 'none';
      }
      showToast(labels[action] || 'Yönlendirme güncellendi.', 'success');
    } else {
      showToast('Yönlendirme hatası: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Hata: ' + e, 'error');
  }
}

function cycleRotate90() {
  triggerTransform('rot_x_90');
}
window.cycleRotate90 = cycleRotate90;

// UI Data Synchronization
function updateUIWithMeshData(data) {
  if (!data) return;
  if (data.filename) document.getElementById('stat-filename').textContent = data.filename;
  if (data.format) document.getElementById('stat-format').textContent = data.format;
  if (data.file_size_mb !== undefined && data.file_size_mb !== null) {
    document.getElementById('stat-filesize').textContent = data.file_size_mb + ' MB';
  }
  if (data.triangle_count !== undefined) {
    const uTris = typeof t === 'function' ? t('unit_tris', 'adet') : 'adet';
    document.getElementById('stat-triangles').textContent = data.triangle_count.toLocaleString() + ' ' + uTris;
  }
  if (data.vertex_count !== undefined) {
    const uPts = typeof t === 'function' ? t('unit_pts', 'adet') : 'adet';
    document.getElementById('stat-vertices').textContent = data.vertex_count.toLocaleString() + ' ' + uPts;
  }

  if (data.bounds && data.bounds.dimensions) {
    const d = data.bounds.dimensions;
    document.getElementById('stat-dimensions').textContent = `${d[0]} × ${d[1]} × ${d[2]} mm`;
    document.getElementById('stat-diagonal').textContent = (data.bounds.diagonal || 0) + ' mm';

    const meterWarning = document.getElementById('meter-scale-warning');
    if (meterWarning) {
      const isMeter = data.is_meter_scale || (d && d[0] < 0.5 && d[1] < 0.5 && d[2] < 0.5);
      meterWarning.style.display = isMeter ? 'flex' : 'none';
    }
  }

  // Update Model Characterization Badge (CAD vs 3D Scan)
  const typeBadge = document.getElementById('heal-model-type-badge');
  const scanShortcut = document.getElementById('scan-tab-shortcut-banner');
  const healDot = document.getElementById('tab-heal-dot');

  if (data.model_type === 'cad') {
    if (typeBadge) {
      const isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
      typeBadge.style.display = 'flex';
      typeBadge.style.background = 'rgba(56, 189, 248, 0.12)';
      typeBadge.style.border = '1px solid rgba(56, 189, 248, 0.35)';
      typeBadge.style.color = '#38bdf8';
      typeBadge.innerHTML = isEn
        ? '📐 <strong>Mechanical CAD Model Detected</strong> • Sharp edge protection active'
        : '📐 <strong>Mekanik CAD Çizimi Algılandı</strong> • Keskin Kenar Koruması devrede';
    }
    const chkFeat = document.getElementById('chk-heal-preserve-features');
    if (chkFeat) chkFeat.checked = true;
    toggleFeatureAngleVisibility(true);
    if (scanShortcut) scanShortcut.style.display = 'none';
    if (healDot) healDot.style.display = 'none';
  } else if (data.model_type === 'scan') {
    if (typeBadge) {
      const isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
      typeBadge.style.display = 'flex';
      typeBadge.style.background = 'rgba(168, 85, 247, 0.12)';
      typeBadge.style.border = '1px solid rgba(168, 85, 247, 0.35)';
      typeBadge.style.color = '#c084fc';
      typeBadge.innerHTML = isEn
        ? '📷 <strong>3D Scan / Photogrammetry Model</strong> Detected'
        : '📷 <strong>3D Tarama / Fotogrametri Modeli</strong> Algılandı';
    }
    if (scanShortcut) scanShortcut.style.display = 'flex';
    if (healDot) healDot.style.display = 'inline-block';
  } else {
    if (typeBadge) typeBadge.style.display = 'none';
    if (scanShortcut) scanShortcut.style.display = 'none';
    if (healDot) healDot.style.display = 'none';
  }

  // Apply AI Auto-Tune Recommendation
  if (data.auto_tune) {
    currentAutoTune = data.auto_tune;
    const styleKey = data.auto_tune.style_key || (data.model_type === 'scan' ? 'scan' : 'prismatic');
    const selStyle = document.getElementById('select-model-style');
    if (selStyle) {
      selStyle.value = styleKey;
      selStyle.classList.remove('style-awaiting-select');
    }

    const btnAi = document.getElementById('btn-detect-style-ai');
    if (btnAi) btnAi.classList.remove('pulsing-hint');

    const hintEl = document.getElementById('style-choice-hint');
    if (hintEl) {
      hintEl.classList.add('selected-state');
      const isEn = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en';
      hintEl.innerHTML = `<span class="hint-bullet">⚡</span><span>${isEn ? 'Automatic Geometry Analysis:' : 'Otomatik Geometri Analizi:'} <strong>${data.auto_tune.category || styleKey}</strong></span>`;
    }

    const sourceBadge = document.getElementById('model-style-source-badge');
    if (sourceBadge) {
      sourceBadge.dataset.source = 'auto';
      sourceBadge.textContent = typeof t === 'function' ? t('badge_auto') : 'Otomatik';
      sourceBadge.style.background = 'rgba(0, 242, 254, 0.15)';
      sourceBadge.style.color = 'var(--accent-cyan)';
      sourceBadge.style.borderColor = 'rgba(0, 242, 254, 0.4)';
    }

    document.getElementById('ai-tune-category').textContent = data.auto_tune.category;
    document.getElementById('ai-tune-badge').textContent = data.auto_tune.badge;
    document.getElementById('ai-tune-reason').textContent = data.auto_tune.reason;

    // Preset expert dropdowns to recommended defaults
    document.getElementById('setting-engine-mode').value = data.auto_tune.recommended_mode;
    document.getElementById('setting-unify').value = data.auto_tune.recommended_unify ? 'true' : 'false';

    if (data.auto_tune.recommended_engine) {
      setEngineCore(data.auto_tune.recommended_engine);
    }
  }

  // Enable convert buttons
  document.getElementById('btn-convert-ai').disabled = false;
  document.getElementById('btn-convert-expert').disabled = false;
  document.getElementById('conversion-results-card').style.display = 'none';
  document.getElementById('cad-export-card').style.display = 'none';

  // Reset AI CAD analysis output
  const aiOutput = document.getElementById('ai-output-box');
  if (aiOutput) {
    aiOutput.textContent = 'Yapay zeka analizini başlatmak için yukarıdaki butona tıklayın...';
  }

  // Automatically refresh DfAM metrics in background
  refreshDfAMInspection();
}

function updateUIWithConversionResult(res) {
  const card = document.getElementById('conversion-results-card');
  card.style.display = 'flex';

  const engineEl = document.getElementById('res-engine');
  if (engineEl) {
    engineEl.textContent = res.engine_mode || '💎 Titan Analitik CAD (v3.0 B-Rep)';
  }

  document.getElementById('res-watertight').textContent = res.watertight ? 'EVET (Su Geçirmez Katı)' : 'Açık Kabuk (Shell)';
  document.getElementById('res-watertight').className = res.watertight ? 'stat-value success' : 'stat-value';

  const volEl = document.getElementById('res-volume');
  if (volEl) {
    if (res.mesh_vol_cm3 && res.brep_vol_cm3) {
      const dev = (res.vol_deviation_pct !== undefined && res.vol_deviation_pct !== null) ? ` (Sapma: %${res.vol_deviation_pct})` : '';
      volEl.textContent = `${res.mesh_vol_cm3} cm³ ➔ ${res.brep_vol_cm3} cm³${dev}`;
      volEl.className = (res.vol_deviation_pct !== undefined && res.vol_deviation_pct < 3.0) ? 'stat-value success' : 'stat-value highlight';
    } else if (res.brep_vol_cm3) {
      volEl.textContent = `${res.brep_vol_cm3} cm³ (Katı B-Rep)`;
      volEl.className = 'stat-value success';
    } else {
      volEl.textContent = 'Açık Yüzey Kabuğu (Kapalı Hacim Yok)';
      volEl.className = 'stat-value warning';
    }
  }

  document.getElementById('res-faces').textContent = res.faces_count.toLocaleString() + ' B-Rep Yüzey';
  const cylVal = String(res.cylinders_recovered ?? '0');
  document.getElementById('res-cylinders').textContent = cylVal.includes('adet') ? cylVal : (cylVal + ' adet');
  const planeVal = String(res.planes_recovered ?? '0');
  document.getElementById('res-planes').textContent = planeVal.includes('adet') ? planeVal : (planeVal + ' adet');
  document.getElementById('res-duration').textContent = res.elapsed_seconds + ' saniye';
  document.getElementById('res-stepsize').textContent = res.step_size_mb + ' MB';

  // Update DfAM CAD Geometric Fidelity Section
  const dfamFaces = document.getElementById('dfam-brep-faces-val');
  if (dfamFaces) dfamFaces.textContent = `${res.faces_count.toLocaleString()} Yüzey`;

  const dfamRed = document.getElementById('dfam-reduction-val');
  if (dfamRed && res.reduction_pct) dfamRed.textContent = `-%${res.reduction_pct}`;

  const dfamDev = document.getElementById('dfam-vol-dev-val');
  if (dfamDev) {
    if (res.vol_deviation_pct !== undefined && res.vol_deviation_pct !== null) {
      dfamDev.textContent = `%${res.vol_deviation_pct} Hacim Farkı (Mesh vs CAD)`;
      dfamDev.className = res.vol_deviation_pct < 2.0 ? 'stat-value success' : 'stat-value highlight';
    } else {
      dfamDev.textContent = 'Hacim Uyumlu (Doğrulandı)';
      dfamDev.className = 'stat-value success';
    }
  }

  const dfamSolid = document.getElementById('dfam-solid-status-val');
  if (dfamSolid) {
    dfamSolid.textContent = res.watertight ? '✓ %100 Su Geçirmez Manifold Katı' : '⚠️ Açık Kabuk (Shell)';
    dfamSolid.className = res.watertight ? 'stat-value success' : 'stat-value warning';
  }

  // Show CAD export card
  document.getElementById('cad-export-card').style.display = 'flex';

  // Show solid, compare, and split buttons in HUD
  document.getElementById('btn-view-solid').style.display = 'flex';
  document.getElementById('btn-view-compare').style.display = 'flex';
  const btnSplit = document.getElementById('btn-view-split');
  if (btnSplit) btnSplit.style.display = 'flex';

  // Automatically switch to Solid view mode
  setViewMode('solid');
  showToast('Katı CAD modeli (STEP) başarıyla oluşturuldu!', 'success');
}

// Real-time Conversion Progress Callback from Python Backend
window.onConversionProgress = function(pct, statusText) {
  const card = document.getElementById('progress-card');
  const bar = document.getElementById('progress-bar-fill');
  const pctText = document.getElementById('progress-percent');
  const statText = document.getElementById('progress-status-text');

  if (pct > 0) {
    card.style.display = 'flex';
    bar.style.width = pct + '%';
    pctText.textContent = pct + '%';
    statText.textContent = statusText;
  }

  if (pct >= 100) {
    setTimeout(() => {
      card.style.display = 'none';
    }, 2500);
  }
};

// Toast notification helper
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'success') toast.style.borderLeft = '4px solid var(--accent-emerald)';
  if (type === 'error') toast.style.borderLeft = '4px solid var(--accent-red)';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Settings Modal Management
function openSettingsModal() {
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

async function saveSettingsFromModal() {
  const key = document.getElementById('settings-api-key').value;
  const model = document.getElementById('settings-model-select').value;
  const threads = document.getElementById('settings-threads-select').value;

  try {
    const res = await window.pywebview.api.save_settings({
      api_key: key,
      model: model,
      threads: threads
    });
    if (res.success) {
      showToast('Ayarlar başarıyla kaydedildi.', 'success');
      closeSettingsModal();
    } else {
      showToast('Kayıt hatası: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Hata: ' + e, 'error');
  }
}

// History Modal & Persistent Conversion Ledger
async function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.style.display = 'flex';
  await loadHistory();
}

function closeHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.style.display = 'none';
}

// About Modal & Credits
function openAboutModal() {
  const modal = document.getElementById('about-modal');
  if (modal) modal.style.display = 'flex';
}
window.openAboutModal = openAboutModal;

function closeAboutModal() {
  const modal = document.getElementById('about-modal');
  if (modal) modal.style.display = 'none';
}
window.closeAboutModal = closeAboutModal;

async function copyRepoUrl() {
  const repoUrl = 'https://github.com/okanyyurt/Mesh2Step';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(repoUrl);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = repoUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    const msg = typeof currentLanguage !== 'undefined' && currentLanguage === 'en'
      ? '📋 GitHub repository link copied to clipboard!'
      : '📋 GitHub depo adresi panoya kopyalandı!';
    showToast(msg, 'success');
  } catch (err) {
    showToast('Kopyalama hatası: ' + err, 'error');
  }
}
window.copyRepoUrl = copyRepoUrl;

async function openExternalUrl(url) {
  if (!url) return;
  try {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.open_external_url) {
      const res = await window.pywebview.api.open_external_url(url);
      if (res && res.success) return;
    }
  } catch (e) {
    console.warn('API open_external_url failed, falling back to window.open', e);
  }
  window.open(url, '_blank');
}
window.openExternalUrl = openExternalUrl;

// Close when clicking modal backdrop outside the card
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'history-modal') {
    closeHistoryModal();
  } else if (e.target && e.target.id === 'settings-modal') {
    closeSettingsModal();
  } else if (e.target && e.target.id === 'about-modal') {
    closeAboutModal();
  }
});

async function loadHistory() {
  if (!window.pywebview || !window.pywebview.api) return;
  try {
    const res = await window.pywebview.api.get_conversion_history();
    if (res && res.success) {
      currentHistoryData = res.history || [];
      renderHistoryItems(currentHistoryData);
      updateHistorySummaryStats(currentHistoryData);
    }
  } catch (e) {
    console.error('Failed to load conversion history:', e);
  }
}

function updateHistorySummaryStats(items) {
  const total = items.length;
  const successes = items.filter(x => x.status === 'success');
  const successCount = successes.length;

  let avgRed = 0;
  const redItems = successes.filter(x => x.reduction_pct && x.reduction_pct > 0);
  if (redItems.length > 0) {
    const sum = redItems.reduce((acc, x) => acc + x.reduction_pct, 0);
    avgRed = Math.round(sum / redItems.length);
  }

  const elTotal = document.getElementById('hist-total-count');
  const elSuccess = document.getElementById('hist-success-count');
  const elRed = document.getElementById('hist-avg-reduction');

  if (elTotal) elTotal.textContent = total;
  if (elSuccess) elSuccess.textContent = successCount;
  if (elRed) elRed.textContent = `%${avgRed}`;
}

function renderHistoryItems(items) {
  const container = document.getElementById('history-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <div style="font-size: 14px; font-weight: 600; color: #cbd5e1;">Henüz Kayıtlı Dönüştürme Yok</div>
        <div style="font-size: 12px; max-width: 320px; line-height: 1.5;">Bir 3D model (STL, 3MF, OBJ, PLY, GLB) yükleyip STEP katı modeline dönüştürdüğünüzde tüm teknik metrikler burada arşivlenecektir.</div>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const isSuccess = item.status === 'success';
    const badgeStatus = isSuccess 
      ? '<span class="history-badge success">✓ Başarılı Katı</span>' 
      : '<span class="history-badge failed">✕ Başarısız</span>';

    const engineModeShort = item.engine_mode ? item.engine_mode.split('(')[0].trim() : 'B-Rep';
    const reductionDisplay = (item.reduction_pct && item.reduction_pct > 0) 
      ? `-%${item.reduction_pct}` 
      : '0%';

    card.innerHTML = `
      <div class="history-card-header">
        <div class="history-card-title-group">
          ${badgeStatus}
          <div class="history-file-title">${escapeHtml(item.filename || 'Bilinmeyen Model')}</div>
          <span class="history-badge mode">${escapeHtml(engineModeShort)}</span>
        </div>
        <div class="history-timestamp">⏱️ ${escapeHtml(item.timestamp || '')}</div>
      </div>

      <div class="history-grid">
        <div class="history-stat-mini">
          <span class="h-label">Girdi Faset</span>
          <span class="h-val">${(item.orig_triangles || 0).toLocaleString()} üçgen</span>
        </div>
        <div class="history-stat-mini">
          <span class="h-label">B-Rep Yüzey</span>
          <span class="h-val highlight">${(item.brep_faces || 0).toLocaleString()} yüzey</span>
        </div>
        <div class="history-stat-mini">
          <span class="h-label">Sadeleştirme</span>
          <span class="h-val ${item.reduction_pct > 0 ? 'success' : ''}">${reductionDisplay}</span>
        </div>
        <div class="history-stat-mini">
          <span class="h-label">İşlem Süresi</span>
          <span class="h-val">${item.elapsed_seconds || 0} sn</span>
        </div>
        <div class="history-stat-mini">
          <span class="h-label">STEP Boyutu</span>
          <span class="h-val">${item.step_size_mb || 0} MB</span>
        </div>
        <div class="history-stat-mini">
          <span class="h-label">Silindir / Düzlem</span>
          <span class="h-val">${escapeHtml(item.cylinders || '-')} / ${escapeHtml(item.planes || '-')}</span>
        </div>
      </div>

      <div class="history-actions-row">
        <div class="history-path-info" title="${escapeHtml(item.step_path || item.source_path || '')}">
          📁 ${escapeHtml(item.step_path ? item.step_path.split(/[\\\\/]/).pop() : item.source_path ? item.source_path.split(/[\\\\/]/).pop() : '')}
        </div>
        <div class="history-btn-group">
          ${item.step_path ? `
            <button class="btn-fusion-launch" onclick="launchHistoryInFusion('${escapeAttr(item.step_path)}')">
              🚀 Fusion 360'ta Aç
            </button>
            <button class="btn-reveal-small" onclick="revealHistoryPath('${escapeAttr(item.step_path)}')">
              📂 Klasörde Göster
            </button>
          ` : `
            <button class="btn-reveal-small" onclick="revealHistoryPath('${escapeAttr(item.source_path || '')}')">
              📂 Kaynak Klasörü
            </button>
          `}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterHistoryList() {
  const query = (document.getElementById('history-search-input').value || '').toLowerCase().trim();
  if (!query) {
    renderHistoryItems(currentHistoryData);
    return;
  }
  const filtered = currentHistoryData.filter(item => {
    return (item.filename && item.filename.toLowerCase().includes(query)) ||
           (item.engine_mode && item.engine_mode.toLowerCase().includes(query)) ||
           (item.timestamp && item.timestamp.toLowerCase().includes(query)) ||
           (item.source_path && item.source_path.toLowerCase().includes(query));
  });
  renderHistoryItems(filtered);
}

async function clearHistory() {
  if (!confirm('Tüm geçmiş dönüştürme kayıtlarını ve performans arşivini silmek istediğinize emin misiniz?')) {
    return;
  }
  try {
    const res = await window.pywebview.api.clear_conversion_history();
    if (res && res.success) {
      currentHistoryData = [];
      renderHistoryItems([]);
      updateHistorySummaryStats([]);
      showToast('Dönüştürme geçmişi temizlendi.', 'info');
    } else {
      showToast('Geçmiş temizlenemedi: ' + (res ? res.error : 'Hata'), 'error');
    }
  } catch (e) {
    showToast('Hata: ' + e, 'error');
  }
}

async function launchHistoryInFusion(stepPath) {
  showToast("Autodesk Fusion 360 başlatılıyor...", "info");
  try {
    const res = await window.pywebview.api.open_history_in_fusion(stepPath);
    if (res && res.success) {
      showToast(res.message, "success");
    } else {
      showToast("Başlatma hatası: " + (res ? res.error : "Bilinmeyen hata"), "error");
    }
  } catch (e) {
    showToast("Hata: " + e, "error");
  }
}

async function revealHistoryPath(filePath) {
  try {
    const res = await window.pywebview.api.reveal_history_item(filePath);
    if (res && !res.success) {
      showToast("Dosya konumu açılamadı: " + res.error, "error");
    }
  } catch (e) {
    showToast("Hata: " + e, "error");
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// App Initialization & Backend API bindings
window.addEventListener('DOMContentLoaded', async () => {
  initViewer();

  const checkAPI = setInterval(async () => {
    if (window.pywebview && window.pywebview.api) {
      clearInterval(checkAPI);
      onBackendReady();
    }
  }, 100);
});

function applyVersionInfo(ver) {
  if (!ver) return;
  const verText = ver.display_text || (ver.version ? `v${ver.version}` : 'v2.0');
  const dateTimeStr = ver.formatted_datetime || `${ver.release_date || ''} ${ver.release_time || ''}`.trim() || '22.09.2026 09:00';
  const fullTooltip = `${ver.app_name || 'Mesh2Step 3D Studio'} ${verText}\nYayınlanma: ${dateTimeStr}`;

  // Update header version elements
  const headerPill = document.getElementById('header-version-tag');
  if (headerPill) {
    headerPill.textContent = verText;
  }
  const headerWrap = document.getElementById('header-version-wrapper');
  if (headerWrap) {
    headerWrap.title = fullTooltip;
  }

  // Update hover card elements
  const hoverTag = document.getElementById('hover-tag-version');
  if (hoverTag) hoverTag.textContent = verText;

  const hoverDate = document.getElementById('hover-datetime-val');
  if (hoverDate) hoverDate.textContent = dateTimeStr;

  // Update About modal version elements
  const aboutTag = document.getElementById('about-modal-version-tag');
  if (aboutTag) aboutTag.textContent = verText;

  const aboutSpecVer = document.getElementById('about-spec-version-val');
  if (aboutSpecVer) aboutSpecVer.textContent = verText;

  const aboutSpecDate = document.getElementById('about-spec-date-val');
  if (aboutSpecDate) aboutSpecDate.textContent = dateTimeStr;
}

async function onBackendReady() {
  // 1. Fetch system specs & version info
  try {
    const sys = await window.pywebview.api.get_system_info();
    if (sys.has_cuda) {
      document.getElementById('gpu-status-text').textContent = `${sys.gpu_name} • ${sys.cuda_ver}`;
      document.getElementById('settings-gpu-val').textContent = `${sys.gpu_name} (CUDA 13.3)`;
    } else {
      document.getElementById('gpu-status-text').textContent = sys.gpu_name;
    }

    if (sys.version_info) {
      applyVersionInfo(sys.version_info);
    } else if (window.pywebview.api.get_version_info) {
      const ver = await window.pywebview.api.get_version_info();
      applyVersionInfo(ver);
    }
  } catch (e) {
    console.error('System info error:', e);
  }

  // 2. Load existing settings
  try {
    const cfg = await window.pywebview.api.get_settings();
    if (cfg.api_key) document.getElementById('settings-api-key').value = cfg.api_key;
    if (cfg.model) {
      const sel = document.getElementById('settings-model-select');
      let found = false;
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === cfg.model) {
          sel.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        const opt = document.createElement('option');
        opt.value = cfg.model;
        opt.textContent = cfg.model;
        sel.appendChild(opt);
        sel.value = cfg.model;
      }
    }
    if (cfg.threads) document.getElementById('settings-threads-select').value = cfg.threads;
  } catch (e) {
    console.error('Settings load error:', e);
  }

  // Bind Open File Buttons (Header and Dropzone)
  document.getElementById('btn-open-file').addEventListener('click', handleOpenFile);
  document.getElementById('dropzone-clickable').addEventListener('click', handleOpenFile);

  // Bind Settings Modal
  document.getElementById('btn-open-settings').addEventListener('click', openSettingsModal);

  // Bind History Modal
  const btnHistory = document.getElementById('btn-open-history');
  if (btnHistory) btnHistory.addEventListener('click', openHistoryModal);

  const btnClearHist = document.getElementById('btn-clear-history');
  if (btnClearHist) btnClearHist.addEventListener('click', clearHistory);

  // Pre-load history stats
  loadHistory();

  // Bind Cancel Conversion Button
  document.getElementById('btn-cancel-conversion').addEventListener('click', async () => {
    try {
      await window.pywebview.api.cancel_conversion();
      document.getElementById('progress-card').style.display = 'none';
      document.getElementById('btn-convert-ai').disabled = false;
      document.getElementById('btn-convert-expert').disabled = false;
      showToast('Dönüştürme işlemi durduruldu.', 'info');
    } catch (e) {
      showToast('İptal hatası: ' + e, 'error');
    }
  });

  // Bind AI Convert Button
  document.getElementById('btn-convert-ai').addEventListener('click', async () => {
    if (!currentFilePath) return;
    const mode = currentAutoTune ? currentAutoTune.recommended_mode : 'verbatim';
    const unify = currentAutoTune ? currentAutoTune.recommended_unify : true;

    // Calculate unify angle from simple user quality preference:
    let unifyAngle = 2.5;
    if (aiQualityPreference === 'fast') {
      unifyAngle = 0.5;
    } else if (aiQualityPreference === 'balanced') {
      unifyAngle = currentAutoTune && currentAutoTune.recommended_unify_angle ? currentAutoTune.recommended_unify_angle : 2.5;
    } else if (aiQualityPreference === 'high') {
      unifyAngle = 7.0; // High simplification for ultra-clean CAD surfaces
    }

    await executeConversion(mode, unify, null, unifyAngle);
  });

  // Bind Expert Convert Button
  document.getElementById('btn-convert-expert').addEventListener('click', async () => {
    if (!currentFilePath) return;
    const mode = document.getElementById('setting-engine-mode').value;
    const unify = document.getElementById('setting-unify').value === 'true';
    const threadsVal = document.getElementById('setting-threads').value;
    const threads = threadsVal === 'auto' ? null : parseInt(threadsVal);
    const angleEl = document.getElementById('setting-unify-angle');
    const unifyAngle = angleEl ? parseFloat(angleEl.value) : 2.5;
    await executeConversion(mode, unify, threads, unifyAngle);
  });

  // Bind CAD Launch Buttons
  document.getElementById('btn-open-fusion').addEventListener('click', async () => {
    if (!currentStepPath) return;
    showToast('Autodesk Fusion 360 başlatılıyor...', 'info');
    const res = await window.pywebview.api.open_in_fusion(currentStepPath);
    if (res.success) showToast(res.message, 'success');
    else showToast(res.error, 'error');
  });

  document.getElementById('btn-open-freecad').addEventListener('click', async () => {
    if (!currentStepPath) return;
    showToast('FreeCAD başlatılıyor...', 'info');
    const res = await window.pywebview.api.open_in_freecad(currentStepPath);
    if (res.success) showToast(res.message, 'success');
    else showToast(res.error, 'error');
  });

  document.getElementById('btn-save-step').addEventListener('click', async () => {
    if (!currentStepPath) {
      showToast('Kaydedilecek STEP katı modeli bulunamadı. Önce modeli dönüştürmelisiniz.', 'warning');
      return;
    }
    try {
      const res = await window.pywebview.api.save_step_as(currentStepPath);
      if (res && res.success) {
        hasSavedCurrentStep = true;
        showToast('STEP dosyası başarıyla kaydedildi: ' + res.path, 'success');
      } else if (res && res.cancelled) {
        showToast('Kaydetme işlemi iptal edildi.', 'info');
      } else {
        showToast('Kaydetme hatası: ' + (res && res.error ? res.error : 'Bilinmeyen hata'), 'error');
      }
    } catch (e) {
      showToast('Hata: ' + e, 'error');
    }
  });

  document.getElementById('btn-reveal-explorer').addEventListener('click', async () => {
    if (!currentStepPath) {
      showToast('Henüz dönüştürülmüş STEP modeli bulunamadı.', 'warning');
      return;
    }
    try {
      const res = await window.pywebview.api.reveal_in_explorer(currentStepPath);
      if (res && !res.success) {
        showToast('Dosya konumu açılamadı: ' + res.error, 'error');
      }
    } catch (e) {
      showToast('Hata: ' + e, 'error');
    }
  });

  // Drag and Drop support (Window-wide and dropzone)
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleDroppedFile(e.dataTransfer.files[0]);
    }
  });

  // Bind AI Analysis Button
  document.getElementById('btn-run-ai').addEventListener('click', async () => {
    if (!currentFilePath) return;
    const aiOutput = document.getElementById('ai-output-box');
    aiOutput.textContent = '🤖 Gemini AI CAD analizi çalıştırılıyor, lütfen bekleyin...';

    const res = await window.pywebview.api.run_ai_analysis(currentFilePath);
    if (res.success) {
      aiOutput.textContent = res.analysis;
    } else {
      aiOutput.textContent = '❌ ' + res.error;
    }
  });

  // Sidebar Tab Switcher
  function switchToTab(target) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === target);
    });
    document.querySelectorAll('.sidebar-content').forEach(panel => {
      panel.style.display = panel.id === `tab-${target}` ? 'flex' : 'none';
    });

    if (target === 'dfam') {
      refreshDfAMInspection();
    }
  }
  window.switchToTab = switchToTab;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchToTab(btn.dataset.tab);
    });
  });
}

// =============================================================================
// MAKİNA TASARIM MÜHENDİSİ (DfAM) INSPECTION CONTROLLER
// =============================================================================
let currentDfAMData = null;

async function refreshDfAMInspection(bodyId = null) {
  if (!window.pywebview || !window.pywebview.api) return;
  try {
    const badgeEl = document.getElementById('dfam-score-badge');
    if (badgeEl) badgeEl.textContent = 'İnceleniyor...';

    const res = await window.pywebview.api.inspect_dfam(null, bodyId);
    if (res && res.success && res.report) {
      currentDfAMData = res.report;
      renderDfAMReport(res.report);
    }
  } catch (err) {
    console.error('Failed to run DfAM inspection:', err);
  }
}

function renderDfAMReport(rep) {
  if (!rep) return;
  const score = rep.dfam_score || 0;
  const numEl = document.getElementById('dfam-score-num');
  const badgeEl = document.getElementById('dfam-score-badge');
  const nameEl = document.getElementById('dfam-target-name');
  const statusEl = document.getElementById('dfam-status-text');

  if (numEl) numEl.textContent = Math.round(score);
  if (nameEl) nameEl.textContent = rep.body_name || (rep.is_multi_body ? 'Montaj Modeli' : '3D Model');

  if (badgeEl) {
    if (score >= 85) {
      badgeEl.textContent = '✓ Mükemmel (3D Baskıya Hazır)';
      badgeEl.className = 'dfam-score-pill success';
    } else if (score >= 65) {
      badgeEl.textContent = '⚠️ Destek & Tabla İyileştirmesi Önerilir';
      badgeEl.className = 'dfam-score-pill warning';
    } else {
      badgeEl.textContent = '🛑 Kritik İmalat Riskleri Var';
      badgeEl.className = 'dfam-score-pill critical';
    }
  }

  if (statusEl) {
    if (score >= 85) {
      statusEl.textContent = 'Düşük destek sarfiyatı, stabil zemin yapışması ve güvenli et kalınlığı.';
    } else if (score >= 65) {
      statusEl.textContent = 'Overhang alanları veya ilk katman temas yüzeyi optimize edilmelidir.';
    } else {
      statusEl.textContent = 'Yüksek devrilme riski, yetersiz tabla teması veya aşırı destek ihtiyacı.';
    }
  }

  // Parameters
  const ovEl = document.getElementById('dfam-overhang-val');
  if (ovEl) ovEl.textContent = `%${rep.overhang_pct || 0} (${(rep.overhang_area_mm2 || 0).toLocaleString()} mm²)`;

  const critEl = document.getElementById('dfam-critical-val');
  if (critEl) critEl.textContent = `%${rep.critical_overhang_pct || 0} (${(rep.critical_overhang_area_mm2 || 0).toLocaleString()} mm²)`;

  const bedEl = document.getElementById('dfam-bed-contact-val');
  if (bedEl) bedEl.textContent = `${(rep.bed_contact_area_mm2 || 0).toLocaleString()} mm² (%${rep.bed_contact_pct || 0})`;

  const warpEl = document.getElementById('dfam-warping-val');
  if (warpEl) {
    warpEl.textContent = rep.adhesion_status || 'Yeterli';
    warpEl.className = (rep.adhesion_score >= 80) ? 'stat-value success' : ((rep.adhesion_score >= 60) ? 'stat-value highlight' : 'stat-value warning');
  }

  const wallEl = document.getElementById('dfam-thin-wall-val');
  if (wallEl) {
    wallEl.textContent = `${rep.min_feature_size_mm || 1.2} mm ${rep.has_thin_walls ? '(Kritik İnce)' : '(Güvenli)'}`;
    wallEl.className = rep.has_thin_walls ? 'stat-value warning' : 'stat-value success';
  }

  const sagEl = document.getElementById('dfam-sagitta-val');
  if (sagEl) sagEl.textContent = `+${rep.sagitta_hole_shrinkage_mm || 0.12} mm (Tolerans)`;

  // Optimal orientation recommendation box
  const reasonBox = document.getElementById('dfam-reason-box');
  if (reasonBox && rep.optimal_orientation) {
    const opt = rep.optimal_orientation;
    if (opt.is_already_optimal) {
      reasonBox.textContent = '✅ Model şu anda 3D baskı için en ideal pozisyondadır (Minimum destek, maksimum tabla yapışması).';
      reasonBox.style.color = 'var(--accent-emerald)';
    } else {
      reasonBox.textContent = `💡 Öneri: "${opt.optimal_rotation_name}" pozisyonuna alındığında destek alanı %${opt.overhang_reduction_pct} azalır ve tabla yapışması +${opt.adhesion_increase_mm2} mm² artar.`;
      reasonBox.style.color = 'var(--accent-cyan)';
    }
  }

  // Recommendations list
  const listEl = document.getElementById('dfam-recommendations-list');
  if (listEl) {
    listEl.innerHTML = '';
    const recs = [];
    if (rep.needs_support) {
      recs.push(`⚠️ Destek İhtiyacı: Yüzeyin %${rep.overhang_pct}'si sarkan formda. Destek sarfiyatını azaltmak için imalat yönü optimize edilmeli.`);
    }
    if (rep.adhesion_score < 75) {
      recs.push(`⚠️ Tabla Yapışması: İlk katman temas alanı ${rep.bed_contact_area_mm2} mm². Kenar kalkması (warping) önlemek için Brim tavsiye edilir.`);
    }
    if (rep.has_thin_walls) {
      recs.push(`⚠️ İnce Duvar: ${rep.min_feature_size_mm} mm minimum et kalınlığı tespit edildi. 0.4mm nozzle için en az 2 perimetre kalınlık garanti edilmelidir.`);
    }
    if (rep.toppling_risk) {
      recs.push(`⚠️ Devrilme Riski: Yüksek ağırlık merkezi. Baskı sırasında devrilmeyi önlemek için taban temas alanı genişletilmelidir.`);
    }
    if (recs.length === 0) {
      recs.push('✅ Mükemmel DfAM Uyumu: Model eklemeli imalat (3D printer) toleranslarına ve yüzey açılarına tam uygundur.');
    }

    recs.forEach(r => {
      const item = document.createElement('div');
      item.className = 'dfam-rec-item';
      item.textContent = r;
      listEl.appendChild(item);
    });
  }
}

async function applyOptimalDfAMOrientation() {
  if (!currentFilePath) {
    showToast('Önce bir 3D model yüklemelisiniz.', 'info');
    return;
  }
  showToast('3D Baskı için en ideal yön hesaplanıyor ve tabana oturtuluyor...', 'info');
  try {
    const res = await window.pywebview.api.apply_optimal_dfam_orientation();
    if (res && res.success) {
      if (res.matrix_4x4) {
        const m4 = new THREE.Matrix4();
        m4.set(
          res.matrix_4x4[0], res.matrix_4x4[1], res.matrix_4x4[2], res.matrix_4x4[3],
          res.matrix_4x4[4], res.matrix_4x4[5], res.matrix_4x4[6], res.matrix_4x4[7],
          res.matrix_4x4[8], res.matrix_4x4[9], res.matrix_4x4[10], res.matrix_4x4[11],
          0, 0, 0, 1
        );
        meshGroup.traverse(child => {
          if (child.isMesh || child.isLineSegments) {
            if (child.geometry) {
              child.geometry.applyMatrix4(m4);
              if (child.isMesh) child.geometry.computeVertexNormals();
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
              child.geometry.attributes.position.needsUpdate = true;
            }
          }
        });
        solidGroup.traverse(child => {
          if (child.isMesh || child.isLineSegments) {
            if (child.geometry) {
              child.geometry.applyMatrix4(m4);
              if (child.isMesh) child.geometry.computeVertexNormals();
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
              child.geometry.attributes.position.needsUpdate = true;
            }
          }
        });
      }
      currentBounds = res.bounds;
      fitCameraToBounds(currentBounds);
      showToast('Model en ideal 3D baskı açısına oturtuldu!', 'success');
      await refreshDfAMInspection();
    } else {
      showToast('Optimizasyon hatası: ' + (res ? res.error : 'Bilinmeyen hata'), 'error');
    }
  } catch (e) {
    showToast('Hata: ' + e, 'error');
  }
}
window.applyOptimalDfAMOrientation = applyOptimalDfAMOrientation;
window.refreshDfAMInspection = refreshDfAMInspection;

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const b64 = result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

async function handleDroppedFile(f) {
  requestLoadWithGuard(async () => {
    if (f.path) {
      await loadFile(f.path);
      return;
    }
    showToast('Model yükleniyor: ' + f.name, 'info');
    try {
      const b64 = await readFileAsBase64(f);
      const res = await window.pywebview.api.load_mesh_from_bytes(f.name, b64);
      if (res.success) {
        currentFilePath = res.filepath;
        renderMesh(res);
        const btnRevert = document.getElementById('btn-revert-heal');
        if (btnRevert) btnRevert.style.display = 'none';
        const resultBox = document.getElementById('heal-result-box');
        if (resultBox) resultBox.style.display = 'none';
        showToast(`Model yüklendi: ${res.triangle_count.toLocaleString()} üçgen faset`, 'success');
      } else {
        showToast('Yükleme hatası: ' + res.error, 'error');
      }
    } catch (err) {
      showToast('Dosya okunamadı: ' + err, 'error');
    }
  });
}

async function handleOpenFile() {
  try {
    const path = await window.pywebview.api.open_file_dialog();
    if (path) {
      requestLoadWithGuard(async () => {
        await loadFile(path);
      });
    }
  } catch (e) {
    showToast('Dosya seçme hatası: ' + e, 'error');
  }
}

async function executeConversion(mode, unify, threads = null, unifyAngle = 2.5) {
  document.getElementById('btn-convert-ai').disabled = true;
  document.getElementById('btn-convert-expert').disabled = true;

  try {
    const res = await window.pywebview.api.convert_mesh(currentFilePath, mode, unify, threads, unifyAngle, selectedEngineCore);
    if (res.success) {
      currentStepPath = res.step_path;
      hasSavedCurrentStep = false;
      if (res.preview && res.preview.faces_b64) {
        renderSolid(res.preview, true);
        if (res.preview.is_fallback) {
          showToast('Katı model STEP dosyası üretildi! (Önizleme referans geometriyle aktarıldı)', 'info');
        }
      } else {
        createFallbackSolidFromMesh();
        showToast('Katı model STEP dosyası kaydedildi! (CAD önizlemesi aktarıldı)', 'info');
      }
      updateUIWithConversionResult(res);
      await loadHistory();
    } else if (res.cancelled) {
      showToast('Dönüştürme iptal edildi.', 'info');
      await loadHistory();
    } else {
      showToast('Dönüştürme hatası: ' + res.error, 'error');
      await loadHistory();
    }
  } catch (e) {
    showToast('İşlem sırasında hata oluştu: ' + e, 'error');
  } finally {
    document.getElementById('btn-convert-ai').disabled = false;
    document.getElementById('btn-convert-expert').disabled = false;
  }
}

// Load a mesh file into the application
async function loadFile(path) {
  showToast('Model yükleniyor: ' + path.split(/[\\/]/).pop(), 'info');
  try {
    const res = await window.pywebview.api.load_mesh(path);
    if (res.success) {
      currentFilePath = path;
      renderMesh(res);
      const btnRevert = document.getElementById('btn-revert-heal');
      if (btnRevert) btnRevert.style.display = 'none';
      const resultBox = document.getElementById('heal-result-box');
      if (resultBox) resultBox.style.display = 'none';
      showToast(`Model yüklendi: ${res.triangle_count.toLocaleString()} üçgen faset`, 'success');
    } else {
      showToast('Yükleme hatası: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Dosya yüklenirken hata oluştu: ' + e, 'error');
  }
}

// =============================================================================
// 3D SCAN & MESH HEALING ENGINE (KIRI Engine, LiDAR, Photogrammetry, STL, OBJ)
// =============================================================================
let currentHealIntensity = 'balanced';

function setHealIntensity(level) {
  currentHealIntensity = level;
  document.querySelectorAll('#card-heal .quality-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.intensity === level);
  });
  const lbl = document.getElementById('heal-intensity-label');
  if (lbl) {
    if (level === 'light') lbl.textContent = typeof t === 'function' ? t('heal_intensity_light_desc', 'Hafif (6 Döngü)') : 'Hafif (6 Döngü)';
    else if (level === 'strong') lbl.textContent = typeof t === 'function' ? t('heal_intensity_strong_desc', 'Güçlü (28 Döngü)') : 'Güçlü (28 Döngü)';
    else lbl.textContent = typeof t === 'function' ? t('heal_intensity_balanced_desc', 'Dengeli (Önerilen)') : 'Dengeli (Önerilen)';
  }
}
window.setHealIntensity = setHealIntensity;

function toggleFeatureAngleVisibility(checked) {
  const row = document.getElementById('heal-feature-angle-row');
  if (row) row.style.display = checked ? 'flex' : 'none';
}
window.toggleFeatureAngleVisibility = toggleFeatureAngleVisibility;

async function executeMeshHealing() {
  if (!currentFilePath) {
    showToast('Lütfen önce bir 3D model yükleyin.', 'error');
    return;
  }
  const btn = document.getElementById('btn-heal-mesh');
  const btnRevert = document.getElementById('btn-revert-heal');
  const resultBox = document.getElementById('heal-result-box');
  btn.disabled = true;
  btn.textContent = '⏳ İyileştiriliyor...';

  try {
    const removeOutliers = document.getElementById('chk-heal-outliers').checked;
    const fillHoles = document.getElementById('chk-heal-holes').checked;
    const smooth = document.getElementById('chk-heal-smooth').checked;
    const decimate = document.getElementById('chk-heal-decimate').checked;
    const preserveFeatures = document.getElementById('chk-heal-preserve-features')?.checked ?? true;
    const featureAngle = parseFloat(document.getElementById('sel-heal-feature-angle')?.value || '35.0');
    const smoothMethod = document.querySelector('input[name="heal-method"]:checked')?.value || 'taubin';

    showToast('🪄 3D model iyileştiriliyor ve yüzey gürültüsü temizleniyor...', 'info');

    const res = await window.pywebview.api.heal_mesh(
      currentHealIntensity,
      removeOutliers,
      fillHoles,
      smooth,
      decimate,
      0.5,
      preserveFeatures,
      featureAngle,
      smoothMethod
    );

    if (res.success) {
      renderMesh(res);
      showToast(`✨ Model başarıyla iyileştirildi! Yeni faset: ${res.triangle_count.toLocaleString()}`, 'success');

      if (btnRevert) btnRevert.style.display = 'inline-flex';
      if (resultBox) {
        resultBox.style.display = 'block';
        const st = res.stats || {};
        resultBox.innerHTML = `
          <div style="font-weight: 600; color: #c084fc; margin-bottom: 2px;">✨ İyileştirme Tamamlandı:</div>
          <div>• Faset Sayısı: <strong>${(st.before_triangles || 0).toLocaleString()}</strong> ➔ <strong>${(st.after_triangles || 0).toLocaleString()}</strong> ${(st.removed_triangles || 0) > 0 ? '(' + st.removed_triangles.toLocaleString() + ' faset budandı)' : ''}</div>
          ${st.holes_repaired > 0 ? `<div>• ${st.holes_repaired} açık delik ve sınır dikilerek kapatıldı.</div>` : ''}
          ${st.preserve_features ? `<div>• 📐 <strong>${(st.feature_edges_locked || 0).toLocaleString()} adet keskin kenar</strong> kilitlenerek korundu (&gt; ${st.feature_angle_threshold}°).</div>` : ''}
          <div>• ${st.smooth_method === 'bilateral' ? 'Bilateral Yüzey Normalleri' : 'Taubin Hacim Koruyucu'} filtresi (${st.intensity}) uygulandı.</div>
        `;
      }
    } else {
      showToast('İyileştirme hatası: ' + res.error, 'error');
    }
  } catch (err) {
    showToast('İyileştirme hatası: ' + err, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🪄 Modeli İyileştir & Ütüle';
  }
}
window.executeMeshHealing = executeMeshHealing;

async function revertMeshHealing() {
  const btnRevert = document.getElementById('btn-revert-heal');
  const resultBox = document.getElementById('heal-result-box');
  try {
    const res = await window.pywebview.api.revert_healed_mesh();
    if (res.success) {
      renderMesh(res);
      showToast('Orijinal ham model geri yüklendi.', 'info');
      if (btnRevert) btnRevert.style.display = 'none';
      if (resultBox) resultBox.style.display = 'none';
    } else {
      showToast('Geri alma hatası: ' + res.error, 'error');
    }
  } catch (e) {
    showToast('Geri alma hatası: ' + e, 'error');
  }
}
window.revertMeshHealing = revertMeshHealing;
