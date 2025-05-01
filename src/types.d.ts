import * as THREE from 'three';

declare global {
  interface Window {
    galaxyApp: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      material: THREE.ShaderMaterial | null;
    };
  }
}