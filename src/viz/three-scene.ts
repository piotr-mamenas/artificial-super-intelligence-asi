/**
 * Three.js Scene Setup and Management
 */

import * as THREE from 'three';
import { RENDER_CONFIG } from '../config/render-config';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;
  animationId: number | null;
}

/**
 * Create and initialize a Three.js scene context.
 */
export function createSceneContext(canvas: HTMLCanvasElement): SceneContext {
  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(RENDER_CONFIG.colors.background, 1);
  
  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(RENDER_CONFIG.colors.background, 0.02);
  
  // Camera
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const camera = new THREE.PerspectiveCamera(
    RENDER_CONFIG.camera.fov,
    aspect,
    RENDER_CONFIG.camera.near,
    RENDER_CONFIG.camera.far
  );
  camera.position.copy(RENDER_CONFIG.camera.position);
  camera.lookAt(0, 0, 0);
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);
  
  // Grid helper
  const gridHelper = new THREE.GridHelper(20, 20, RENDER_CONFIG.colors.grid, RENDER_CONFIG.colors.grid);
  gridHelper.position.y = -3;
  scene.add(gridHelper);
  
  // Clock
  const clock = new THREE.Clock();
  
  return {
    renderer,
    scene,
    camera,
    clock,
    animationId: null
  };
}

/**
 * Handle window resize.
 */
export function handleResize(ctx: SceneContext, width: number, height: number): void {
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(width, height);
}

/**
 * Start the render loop.
 */
export function startRenderLoop(
  ctx: SceneContext,
  onFrame?: (delta: number) => void
): void {
  const animate = () => {
    ctx.animationId = requestAnimationFrame(animate);
    
    const delta = ctx.clock.getDelta();
    
    if (onFrame) {
      onFrame(delta);
    }
    
    ctx.renderer.render(ctx.scene, ctx.camera);
  };
  
  animate();
}

/**
 * Stop the render loop.
 */
export function stopRenderLoop(ctx: SceneContext): void {
  if (ctx.animationId !== null) {
    cancelAnimationFrame(ctx.animationId);
    ctx.animationId = null;
  }
}

/**
 * Create orbit-like camera controls (simplified version).
 */
export function createCameraControls(ctx: SceneContext, domElement: HTMLElement): {
  update: () => void;
  dispose: () => void;
} {
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let spherical = { theta: 0, phi: Math.PI / 4, radius: 10 };
  
  const updateCamera = () => {
    ctx.camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    ctx.camera.position.y = spherical.radius * Math.cos(spherical.phi);
    ctx.camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    ctx.camera.lookAt(0, 0, 0);
  };
  
  const onMouseDown = (e: MouseEvent) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  };
  
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;
    
    spherical.theta += deltaX * 0.01;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.01));
    
    updateCamera();
    previousMousePosition = { x: e.clientX, y: e.clientY };
  };
  
  const onMouseUp = () => {
    isDragging = false;
  };
  
  const onWheel = (e: WheelEvent) => {
    spherical.radius = Math.max(2, Math.min(50, spherical.radius + e.deltaY * 0.01));
    updateCamera();
  };
  
  domElement.addEventListener('mousedown', onMouseDown);
  domElement.addEventListener('mousemove', onMouseMove);
  domElement.addEventListener('mouseup', onMouseUp);
  domElement.addEventListener('mouseleave', onMouseUp);
  domElement.addEventListener('wheel', onWheel);
  
  updateCamera();
  
  return {
    update: updateCamera,
    dispose: () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('mouseleave', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
    }
  };
}

/**
 * Clear all objects from scene except lights and helpers.
 */
export function clearSceneObjects(ctx: SceneContext): void {
  const toRemove: THREE.Object3D[] = [];
  
  ctx.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      toRemove.push(obj);
    }
  });
  
  for (const obj of toRemove) {
    ctx.scene.remove(obj);
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    }
  }
}
