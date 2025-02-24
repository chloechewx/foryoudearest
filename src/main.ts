import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

class GalaxyVisualization {
  // Scene and rendering components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  // Galaxy rendering components
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private points: THREE.Points | null = null;

  // Zoom and interaction state
  private isZooming = false;
  private zoomSpeed = 0;
  private zoomTimeout: ReturnType<typeof setTimeout> | null = null;

  // Shader code
  private static vertexShader = `
    uniform float uTime;
    uniform float uSize;
    attribute float aScale;
    attribute vec3 aRandom;
    varying vec3 vColor;

    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);

      // Subtle parallax movement
      float floatSpeed = 0.5;
      float parallaxFactor = 0.5 + modelPosition.z * 0.01;
      float xOffset = (uTime * floatSpeed * 0.7) * parallaxFactor;
      float yOffset = (uTime * floatSpeed * 0.5) * parallaxFactor;
      
      modelPosition.x += xOffset;
      modelPosition.y += yOffset;
      modelPosition.xyz += aRandom;

      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectedPosition = projectionMatrix * viewPosition;
      gl_Position = projectedPosition;

      // Dynamic star sizing
      float sizeModifier = 1.0 - (modelPosition.z / 100.0);
      gl_PointSize = uSize * aScale * max(sizeModifier, 0.2);
      gl_PointSize *= (1.0 / - viewPosition.z);

      vColor = color;
    }
  `;

  private static fragmentShader = `
    varying vec3 vColor;

    void main() {
      float strength = distance(gl_PointCoord, vec2(0.5));
      strength = 1.0 - strength;
      
      float sharpness = 6.0;
      strength = pow(strength, sharpness);
      
      if (strength < 0.05) discard;
      
      vec3 color = mix(vec3(0.0), vColor, vec3(strength));
      gl_FragColor = vec4(color, strength);
    }
  `;

  // Galaxy parameters
  private parameters = {
    count: 313400,
    size: 0.005,
    radius: 100,
    branches: 15,
    spin: 1,
    randomness: 1.4,
    randomnessPower: 7.013,
    insideColor: '#fa8500',
    outsideColor: '#05acff',
  };

  constructor(container: HTMLElement | null) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);

    // Append renderer to container
    if (container) {
      container.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    // Orbit controls with zoom constraints
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.zoomSpeed = 1.0;
    
    // Set zoom limits
    this.controls.minDistance = 0.1; // Minimum zoom in
    this.controls.maxDistance = 30; // Maximum zoom out

    // Set up event listeners
    this.setupEventListeners();
    this.setupGUI();
    this.generateGalaxy();
  }

  private setupEventListeners(): void {
    // Zoom handler with more sophisticated constraints
    const fastScrollZoom = (event: WheelEvent) => {
      event.preventDefault();
      
      const zoomDirection = Math.sign(event.deltaY);
      const zoomFactor = 1.2;
      
      // Calculate new camera distance
      const currentDistance = this.camera.position.length();
      let newDistance;
      
      if (zoomDirection > 0) {
        // Zoom out
        newDistance = Math.min(currentDistance * zoomFactor, 30);
        this.zoomSpeed = 1;
      } else {
        // Zoom in
        newDistance = Math.max(currentDistance / zoomFactor, 0.1);
        this.zoomSpeed = -1.2;
      }
      
      // Normalize camera position while maintaining direction
      const normalizedPosition = this.camera.position.clone().normalize();
      this.camera.position.copy(normalizedPosition.multiplyScalar(newDistance));
      
      this.isZooming = true;
      
      if (this.zoomTimeout !== null) {
        clearTimeout(this.zoomTimeout);
      }
      
      this.zoomTimeout = setTimeout(() => {
        this.isZooming = false;
        this.zoomSpeed = 0;
      }, 300);
    };

    this.renderer.domElement.addEventListener('wheel', fastScrollZoom, { passive: false });

    // Resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private setupGUI(): void {
    const gui = new GUI();
    gui.add(this.parameters, 'count', 113400, 1000000, 100).onChange(() => this.generateGalaxy());
    gui.add(this.parameters, 'radius', 16.56, 20, 0.01).onChange(() => this.generateGalaxy());
    gui.add(this.parameters, 'branches', 15, 20, 1).onChange(() => this.generateGalaxy());
    gui.add(this.parameters, 'randomness', 1.4, 2, 0.001).onChange(() => this.generateGalaxy());
    gui.add(this.parameters, 'randomnessPower', 7.013, 10, 0.001).onChange(() => this.generateGalaxy());
    gui.addColor(this.parameters, 'insideColor').onChange(() => this.generateGalaxy());
    gui.addColor(this.parameters, 'outsideColor').onChange(() => this.generateGalaxy());
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private generateGalaxy(): void {
    // Clean up old galaxy
    if (this.points !== null) {
      this.geometry?.dispose();
      this.material?.dispose();
      this.scene.remove(this.points);
    }

    // Create new geometry
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.parameters.count * 3);
    const colors = new Float32Array(this.parameters.count * 3);
    const scales = new Float32Array(this.parameters.count);
    const randomness = new Float32Array(this.parameters.count * 3);

    const insideColor = new THREE.Color(this.parameters.insideColor);
    const outsideColor = new THREE.Color(this.parameters.outsideColor);

    for (let i = 0; i < this.parameters.count; i++) {
      const i3 = i * 3;

      // Use spherical coordinate system for more natural distribution
      const radius = Math.pow(Math.random(), 0.5) * 200; // Non-uniform radius distribution
      const theta = Math.random() * Math.PI * 2; // Azimuthal angle
      const phi = Math.acos(1 - 2 * Math.random()); // Polar angle

      // Convert spherical to Cartesian coordinates
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Enhanced randomness with more variation
      randomness[i3] = (Math.random() - 0.5) * 0.5;
      randomness[i3 + 1] = (Math.random() - 0.5) * 0.5;
      randomness[i3 + 2] = (Math.random() - 0.5) * 0.5;

      // More complex color mixing
      const complexNoise = 
        Math.sin(positions[i3] * 0.2) * 
        Math.cos(positions[i3 + 1] * 0.3) * 
        Math.tan(positions[i3 + 2] * 0.1);
      
      const colorRatio = Math.abs(complexNoise);
      
      const mixedColor = insideColor.clone();
      mixedColor.lerp(outsideColor, colorRatio);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      // More varied scales with a different distribution
      scales[i] = Math.pow(Math.random(), 3) * 3;
    }

    // Set attributes
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 3));

    // Create material with custom shaders
    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader: GalaxyVisualization.vertexShader,
      fragmentShader: GalaxyVisualization.fragmentShader,
      transparent: true,
      uniforms: {
        uSize: { value: 80 * this.renderer.getPixelRatio() },
        uTime: { value: 0 },
      },
    });

    // Create points and add to scene
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public startAnimation(): void {
    const clock = new THREE.Clock();
    const animate = (): void => {
      const elapsedTime = clock.getElapsedTime();

      if (this.material) {
        this.material.uniforms.uTime.value = elapsedTime;

        if (this.isZooming) {
          // Increase star size during zooming
          this.material.uniforms.uSize.value = 
            (80 + this.zoomSpeed * 20) * this.renderer.getPixelRatio();
        } else {
          // Return to normal size
          this.material.uniforms.uSize.value = 
            80 * this.renderer.getPixelRatio();
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(animate);
    };

    animate();
  }

  // Optional: Cleanup method
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('wheel', () => {});

    // Dispose of Three.js resources
    this.geometry?.dispose();
    this.material?.dispose();
    this.renderer.dispose();
  }
}

// Usage example
const init = () => {
  const container = document.getElementById('app');
  const galaxy = new GalaxyVisualization(container);
  galaxy.startAnimation();
};

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

