/**
 * Three.js rendering configuration.
 */

import * as THREE from 'three';

export const RENDER_CONFIG = {
  // Camera
  camera: {
    fov: 60,
    near: 0.1,
    far: 1000,
    position: new THREE.Vector3(0, 0, 10),
  },
  
  // Colors
  colors: {
    background: 0x0a0a0f,
    pentagramEdge: 0x4444aa,
    pentagramVertex: 0x6666ff,
    pentagramStar: 0xaa44aa,
    activeContext: 0x44ff44,
    wavePositive: 0x4488ff,
    waveNegative: 0xff4488,
    hadronR: 0xff4444,
    hadronU: 0x44ff44,
    hadronC: 0x4444ff,
    blackHole: 0x220022,
    nestedReality: 0x442244,
    grid: 0x222244,
  },
  
  // Sizes
  sizes: {
    pentagramRadius: 3,
    vertexSize: 0.15,
    edgeWidth: 2,
    waveParticleSize: 0.05,
    hadronSize: 0.3,
  },
  
  // Animation
  animation: {
    rotationSpeed: 0.001,
    waveOscillationSpeed: 0.02,
    transitionDuration: 500,
  },
  
  // Post-processing
  postProcessing: {
    bloomStrength: 0.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.8,
  },
};

export const LAYER_CONFIG = {
  PENTAGRAM: 0,
  WAVES: 1,
  HADRONS: 2,
  REALITIES: 3,
  UI_3D: 4,
};
