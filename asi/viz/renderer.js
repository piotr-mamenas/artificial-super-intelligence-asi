// Visualization: Three.js Renderer

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
// ASI Renderer - Three.js 3D visualization
// ============================================================

/**
 * ASIRenderer: manages the Three.js scene for visualizing the ASI agent.
 */
export class ASIRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.nodes = new Map(); // occurrenceId -> mesh
    this.edges = []; // line objects
    this.symmetryEffects = []; // active symmetry fire effects
    
    this._initScene();
    this._initLights();
    this._initControls();
    this._animate();
  }

  _initScene() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);
    
    this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
    this.camera.position.set(0, 5, 15);
    
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Handle resize
    window.addEventListener('resize', () => this._onResize());
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);
    
    const point1 = new THREE.PointLight(0x00d9ff, 1, 50);
    point1.position.set(10, 10, 10);
    this.scene.add(point1);
    
    const point2 = new THREE.PointLight(0xff00ff, 0.5, 50);
    point2.position.set(-10, -5, -10);
    this.scene.add(point2);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
  }

  _onResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    
    // Update controls
    this.controls.update();
    
    // Animate nodes
    const time = Date.now() * 0.001;
    for (const [id, mesh] of this.nodes) {
      mesh.rotation.y = time * 0.5;
      mesh.rotation.x = Math.sin(time + mesh.userData.phase) * 0.1;
    }
    
    // Update symmetry effects
    this._updateSymmetryEffects();
    
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Color mapping for occurrence modes.
   */
  _getModeColor(mode) {
    switch (mode) {
      case 'U': return 0xff6b6b; // Unity - red
      case 'D': return 0x4ecdc4; // Duality - teal
      case 'R': return 0xffe66d; // Relation - yellow
      default: return 0x888888;
    }
  }

  /**
   * Update the visualization from agent snapshot.
   * @param {object} snapshot
   */
  updateFromSnapshot(snapshot) {
    // This is called periodically to sync visualization with agent state
  }

  /**
   * Add an occurrence node to the scene.
   * @param {string} id
   * @param {string} mode
   * @param {object} [position]
   */
  addNode(id, mode = 'U', position = null) {
    if (this.nodes.has(id)) return;
    
    const color = this._getModeColor(mode);
    const geometry = new THREE.IcosahedronGeometry(0.3, 1);
    const material = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position: use provided or calculate from hash
    if (position) {
      mesh.position.set(position.x, position.y, position.z);
    } else {
      const hash = this._hashString(id);
      const theta = (hash % 360) * Math.PI / 180;
      const phi = ((hash / 360) % 180) * Math.PI / 180;
      const r = 3 + (hash % 5);
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    
    mesh.userData = { id, mode, phase: Math.random() * Math.PI * 2 };
    this.nodes.set(id, mesh);
    this.scene.add(mesh);
  }

  /**
   * Add an edge (aboutness relation) between two nodes.
   * @param {string} fromId
   * @param {string} toId
   * @param {number} [strength=1]
   */
  addEdge(fromId, toId, strength = 1) {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return;
    
    const points = [fromNode.position.clone(), toNode.position.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x0f3460,
      opacity: 0.3 + strength * 0.5,
      transparent: true
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData = { fromId, toId, strength };
    this.edges.push(line);
    this.scene.add(line);
  }

  /**
   * Fire a symmetry visualization effect.
   * @param {string} symmetryType
   * @param {string[]} involvedIds
   */
  fireSymmetry(symmetryType, involvedIds) {
    const colors = {
      'swap': 0xff00ff,
      'phase': 0x00ffff,
      'hadamard': 0xffff00,
      'transfer': 0x00ff00,
      'controlled': 0xff8800,
      'default': 0xff00ff
    };
    
    const color = colors[symmetryType] || colors.default;
    
    // Create expanding ring effect at center of involved nodes
    let center = new THREE.Vector3(0, 0, 0);
    let count = 0;
    
    for (const id of involvedIds) {
      const node = this.nodes.get(id);
      if (node) {
        center.add(node.position);
        count++;
        
        // Pulse the node
        this._pulseNode(node, color);
      }
    }
    
    if (count > 0) {
      center.divideScalar(count);
      this._createSymmetryRing(center, color, symmetryType);
    }
  }

  _pulseNode(node, color) {
    const originalEmissive = node.material.emissive.getHex();
    const originalIntensity = node.material.emissiveIntensity;
    
    node.material.emissive.setHex(color);
    node.material.emissiveIntensity = 1;
    
    setTimeout(() => {
      node.material.emissive.setHex(originalEmissive);
      node.material.emissiveIntensity = originalIntensity;
    }, 300);
  }

  _createSymmetryRing(center, color, type) {
    const geometry = new THREE.RingGeometry(0.1, 0.3, 32);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(center);
    ring.lookAt(this.camera.position);
    ring.userData = {
      type,
      startTime: Date.now(),
      duration: 1000,
      maxScale: 5
    };
    
    this.symmetryEffects.push(ring);
    this.scene.add(ring);
  }

  _updateSymmetryEffects() {
    const now = Date.now();
    
    for (let i = this.symmetryEffects.length - 1; i >= 0; i--) {
      const effect = this.symmetryEffects[i];
      const elapsed = now - effect.userData.startTime;
      const progress = elapsed / effect.userData.duration;
      
      if (progress >= 1) {
        this.scene.remove(effect);
        this.symmetryEffects.splice(i, 1);
      } else {
        const scale = 1 + progress * effect.userData.maxScale;
        effect.scale.set(scale, scale, scale);
        effect.material.opacity = 1 - progress;
        effect.lookAt(this.camera.position);
      }
    }
  }

  /**
   * Clear all nodes and edges.
   */
  clear() {
    for (const [id, mesh] of this.nodes) {
      this.scene.remove(mesh);
    }
    this.nodes.clear();
    
    for (const line of this.edges) {
      this.scene.remove(line);
    }
    this.edges = [];
    
    for (const effect of this.symmetryEffects) {
      this.scene.remove(effect);
    }
    this.symmetryEffects = [];
  }

  /**
   * Simple string hash for positioning.
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
