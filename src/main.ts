import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import vertexShader from './vertex.glsl';
import fragmentShader from './fragment.glsl';
import { BirthdayMessage } from './birthdayMessage';

interface GalaxyParameters {
  count: number;
  size: number;
  radius: number;
  branches: number;
  spin: number;
  randomness: number;
  randomnessPower: number;
  Colour1: string;
  Colour2: string;
}

class GalaxyVisualization {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private birthdayMessage: BirthdayMessage | null = null;

  private brightStar: THREE.Points | null = null;
  private brightStarMaterial: THREE.ShaderMaterial | null = null;
  private brightStarPosition: THREE.Vector3 = new THREE.Vector3();
  private brightStarSpeed: THREE.Vector3 = new THREE.Vector3();

  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private points: THREE.Points | null = null;
  
  private musicFiles: string[] = [
    './assets/once_in_a_while.mp3',
    './assets/luvsic2.mp3',
    './assets/for_the_first_time.mp3',
    './assets/downstream.mp3',
    './assets/in_the_back_of_my_mind.mp3',
    './assets/can_i_call_you_tonight.mp3',
    './assets/cariño.mp3'

  ];

  private currentTrackIndex: number = 0;
  private audioElement: HTMLAudioElement | null = null;
  private isShuffleMode: boolean = false;
  private isLoopMode: boolean = false;


  private parameters: GalaxyParameters = {
    count: 35000,
    size: 0.007,
    radius: 100,
    branches: 15,
    spin: 1,
    randomness: 1.4,
    randomnessPower: 7.013,
    Colour1: '#fa8500',
    Colour2: '#05acff',
  };


  private lastCameraDistance: number = 5;

  private setupBrightStar(): void {
    const geometry = new THREE.BufferGeometry();
    
    this.brightStarPosition.set(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200
    );
    
    this.brightStarSpeed.set(
      (Math.random() - 0.5) * 0.7,
      (Math.random() - 0.5) * 0.7,
      (Math.random() - 0.5) * 0.7
    );

    const positions = new Float32Array(3);
    positions[0] = this.brightStarPosition.x;
    positions[1] = this.brightStarPosition.y;
    positions[2] = this.brightStarPosition.z;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
   
    const colors = new Float32Array(3);
    colors[0] = 1.0; 
    colors[1] = 1.0; 
    colors[2] = 1.0;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    

    const sizes = new Float32Array(1);
    sizes[0] = 40.0; 
    geometry.setAttribute('aScale', new THREE.BufferAttribute(sizes, 1));

    this.brightStarMaterial = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader: vertexShader, 
      fragmentShader: fragmentShader, 
      transparent: true,
      uniforms: {
        uSize: { value: 200 * this.renderer.getPixelRatio() },
        uTime: { value: 0 }
      }
    });

    this.brightStar = new THREE.Points(geometry, this.brightStarMaterial);
    this.scene.add(this.brightStar);
  }

  private updateBrightStar(elapsedTime: number): void {
    if (!this.brightStar) return;
    

    this.brightStarPosition.add(this.brightStarSpeed);
    

    const limit = 100;
    if (Math.abs(this.brightStarPosition.x) > limit ||
        Math.abs(this.brightStarPosition.y) > limit ||
        Math.abs(this.brightStarPosition.z) > limit) {

        const radius = 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * Math.random());
      
        this.brightStarPosition.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );

      

      this.brightStarSpeed.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
    }
    

    const positions = this.brightStar.geometry.attributes.position.array as Float32Array;
    positions[0] = this.brightStarPosition.x;
    positions[1] = this.brightStarPosition.y;
    positions[2] = this.brightStarPosition.z;
    

    this.brightStar.geometry.attributes.position.needsUpdate = true;

  
    if (this.brightStarMaterial) {
      const sizePulse = 1.0 + 0.2 * Math.sin(elapsedTime * 2.0);
      this.brightStarMaterial.uniforms.uSize.value = 300 * this.renderer.getPixelRatio() * sizePulse;
    }
    this.brightStar.lookAt(this.camera.position);
  }

  constructor(private container: HTMLElement | null) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.0001, 1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.setupScene();
    this.setupRenderer();
    this.setupControls();
    this.setupGUI();
    this.generateGalaxy();
    this.setupBirthdayMessage(); 
    this.setupBrightStar();
    this.startAnimation();
    this.initAudio();
  }

  private setupScene(): void {
    this.camera.position.set(0, 0, 5);
    this.lastCameraDistance = 5; 
  }

  private setupRenderer(): void {
    if (!this.container) throw new Error('Container element is required.');
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.8;
    this.controls.panSpeed = 0.8; 
    this.controls.zoomSpeed = 2.0;
    this.controls.minDistance = 0.001;
    this.controls.maxDistance = 50;
    this.controls.enablePan = true;


    this.controls.addEventListener('change', this.handleControlsChange.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }


  private setupBirthdayMessage(): void {
    if (!this.container) return;
    

    this.birthdayMessage = new BirthdayMessage(this.container);
    

    this.birthdayMessage.setZoomThreshold(2.5);
    

    const initialZoom = this.getNormalizedZoomLevel();
    this.birthdayMessage.updateZoom(initialZoom);
  }


  private handleControlsChange(): void {
    if (!this.birthdayMessage) return;
    
    const normalizedZoom = this.getNormalizedZoomLevel();
    
    this.birthdayMessage.updateZoom(normalizedZoom);
  }


  private getNormalizedZoomLevel(): number {

    this.lastCameraDistance = this.camera.position.length();
    const normalizedZoom = 5.0 / Math.max(this.lastCameraDistance, 0.1);
    
    return normalizedZoom;
  }

  //controller gui
  private setupGUI(): void {
    const gui = new GUI({ 
      width: 180,
      title: ''
    });
    
    document.body.appendChild(gui.domElement);
  
    const toggleButton = document.createElement('button');
    toggleButton.id = 'gui-toggle';
    toggleButton.innerHTML = '⚙️';
    document.body.appendChild(toggleButton);
    
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '3rem';
    gui.domElement.style.right = '1rem';
    
    gui.domElement.classList.add('gui-hidden');
    
    toggleButton.addEventListener('click', () => {
      const isHidden = gui.domElement.classList.contains('gui-hidden');
      
      if (isHidden) {
        gui.domElement.classList.remove('gui-hidden');
        gui.domElement.classList.add('gui-visible');
      } else {
        gui.domElement.classList.remove('gui-visible');
        gui.domElement.classList.add('gui-hidden');
      }
    });
  
    //Add controllers to the visual folder
    gui.add(this.parameters, 'count', 20000, 100000, 1000)
      .name('Star Count')
      .onChange(() => this.generateGalaxy());
  
    gui.addColor(this.parameters, 'Colour1')
      .name('Color 1')
      .onChange(() => this.generateGalaxy());
      
    gui.addColor(this.parameters, 'Colour2')
      .name('Color 2')
      .onChange(() => this.generateGalaxy());
    

    const musicFolder = gui.addFolder('Music Player');
  
    const musicControls = {
      currentTrack: 'Loading...', 
      volume: 1.0
    };
  
    musicFolder.add(musicControls, 'currentTrack')
      .name('Now Playing....')
      .listen() //update if the value changes
      .disable(); //read-only
      
    const trackController = musicFolder.controllers.find(
      controller => controller.property === 'currentTrack'
    );
    
    if (trackController && trackController.domElement) {
      trackController.domElement.classList.add('track-display');
      
      const valueElement = trackController.domElement.querySelector('.value');
      if (valueElement) {
        valueElement.classList.add('track-name');
      }
    }
    this.setupAudioTrackDisplay(musicControls);
  
    //Volume control
    musicFolder.add(musicControls, 'volume', 0, 1, 0.01)
      .name('Volume')
      .onChange((value: number) => {
        const audio = document.getElementById('background-music') as HTMLAudioElement;
        if (audio) {
          audio.volume = value;
        }
      });

    // Create Bootstrap controls for the music player
    const customControlsContainer = document.createElement('div');
    customControlsContainer.className = 'bootstrap-music-controls';

    customControlsContainer.innerHTML = `
    <div class="btn-group w-100 mb-2 fs-1">
      <button id="prev-button" class="btn btn-sm btn-outline">
        <i class="bi bi-skip-backward"></i>
      </button>
      <button id="next-button" class="btn btn-sm btn-outline">
        <i class="bi bi-skip-forward"></i>
      </button>
      <button id="shuffle-button" class="btn btn-sm btn-outline">
        <i class="bi bi-shuffle"></i>
      </button>
      <button id="loop-button" class="btn btn-sm btn-outline">
      <i class="bi bi-arrow-repeat"></i>
      </button>
      <button id="mute-button" class="btn btn-sm btn-outline">
        <i class="bi bi-volume-up"></i>
      </button>
    </div>
  `;

    //play safe bootstrap stuff
  if (!document.querySelector('link[href*="bootstrap-icons"]')) {
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
    document.head.appendChild(iconLink);
  }

  // Find the music folder's children container
    const folderElement = musicFolder.domElement;
    const childrenContainer = folderElement.querySelector('.children');

    if (childrenContainer) {
      childrenContainer.appendChild(customControlsContainer);
      // Add event listeners to the buttons
      const prevButton = document.getElementById('prev-button');
      const nextButton = document.getElementById('next-button');
      const shuffleButton = document.getElementById('shuffle-button');
      const loopButton = document.getElementById('loop-button');
      const muteButton = document.getElementById('mute-button');
  
  // Previous button
      if (prevButton) {
        prevButton.addEventListener('click', () => this.playPreviousTrack());
        prevButton.setAttribute('title', 'Previous Track');
      }
      // Next button
      if (nextButton) {
        nextButton.addEventListener('click', () => this.playNextTrack());
        nextButton.setAttribute('title', 'Next Track');
      }
      if (shuffleButton) {
        shuffleButton.addEventListener('click', () => {
          this.playRandomTrack();
          // Toggle active state for shuffle button
          shuffleButton.classList.toggle('active');
          if (shuffleButton.classList.contains('active')) {
            shuffleButton.classList.remove('btn-outline-light');
            shuffleButton.classList.add('btn-light');
          } else {
            shuffleButton.classList.remove('btn-light');
            shuffleButton.classList.add('btn-outline-light');
          }
        });
        shuffleButton.setAttribute('title', 'Shuffle Tracks');
      }

      //loopbutton
      if (loopButton){
        loopButton.addEventListener('click', () => {
          this.toggleLoopMode();
          // Toggle active state for loop button
          loopButton.classList.toggle('active');
          
          if (loopButton.classList.contains('active')) {
            loopButton.classList.remove('btn-outline-light');
            loopButton.classList.add('btn-light');
            loopButton.setAttribute('title', 'Loop: On');
          } else {
            loopButton.classList.remove('btn-light');
            loopButton.classList.add('btn-outline-light');
            loopButton.setAttribute('title', 'Loop: Off');
          }
        });
        loopButton.setAttribute('title', 'Loop Track');
      }

      

      // Mute button
      if (muteButton) {
        muteButton.addEventListener('click', () => {
          const audio = document.getElementById('background-music') as HTMLAudioElement;
          if (audio) {
            audio.muted = !audio.muted;
            
            // Update button icon based on mute state
            const icon = muteButton.querySelector('i');
            if (icon) {
              if (audio.muted) {
                icon.className = 'bi bi-volume-mute-fill';
              } else {
                icon.className = 'bi bi-volume-up-fill';
              }
            }
          }
        });
        muteButton.setAttribute('title', 'Mute/Unmute');
      }
    }
    
    //Open the music folder
    musicFolder.open();
  
    //Reset
    const resetDefaults = {
      reset: () => {
        const defaults = {
          count: 25000,
          size: 0.007,
          radius: 100,
          branches: 15,
          spin: 1,
          randomness: 1.4,
          randomnessPower: 7.013,
          Colour1: '#fa8500',
          Colour2: '#05acff'
        };
        
        for (const key in defaults) {
          if (Object.prototype.hasOwnProperty.call(defaults, key)) {
            // @ts-ignore - we know these properties exist
            this.parameters[key] = defaults[key];
          }
        }
        
        for (const controller of gui.controllers) {
          controller.updateDisplay();
        }
        
        this.generateGalaxy();
      }
    };
    
    gui.add(resetDefaults, 'reset').name('Reset to Defaults');
  }


  private setupAudioTrackDisplay(audioControls: any): void {
    const audio = document.getElementById('background-music') as HTMLAudioElement;
    if (!audio) return;

    const updateTrackName = () => {
      const src = audio.src;
      let trackName = src.split('/').pop() || 'Unknown Track';
      
      trackName = decodeURIComponent(trackName.split('?')[0]);
      trackName = trackName.replace(/\.(mp3|wav|flac)$/i, '');
      
      //Replace underscores/hyphens with spaces
      trackName = trackName.replace(/[_-]/g, ' ');
      
      trackName = trackName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
        
      audioControls.currentTrack = trackName;
    };
    
    updateTrackName();
    audio.addEventListener('loadeddata', updateTrackName);}

  // initialize music player
  private initMusicPlayer(): void {
  this.audioElement = document.getElementById('background-music') as HTMLAudioElement;
  if (!this.audioElement) return;

  this.audioElement.addEventListener('ended', () => {
    this.playNextTrack();
  });
  this.loadCurrentTrack();
  }

  //load and pplay current track
   private loadCurrentTrack(): void {
    if (!this.audioElement || this.musicFiles.length === 0) return;
    
    // Make sure the index is valid
    this.currentTrackIndex = Math.max(0, Math.min(this.currentTrackIndex, this.musicFiles.length - 1));
    
    // Set the source
    this.audioElement.src = this.musicFiles[this.currentTrackIndex];
    this.audioElement.load();
    
    // Play the track
    this.audioElement.play()
      .catch(err => console.error('Failed to play audio:', err));
  }

  //play prev track
  private playPreviousTrack(): void {
    if (this.musicFiles.length <= 1) return;

    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.musicFiles.length) % this.musicFiles.length;
    this.loadCurrentTrack();
    
  }

  //play next track
  private playNextTrack(): void {
    if (this.musicFiles.length <= 1) return;

    if (this.isLoopMode) {
      this.loadCurrentTrack();
      return;
    }

    
    if (this.isShuffleMode) {
      let newIndex: number;
      do {
        newIndex = Math.floor(Math.random() * this.musicFiles.length);
      } while (newIndex === this.currentTrackIndex && this.musicFiles.length > 1);

      this.currentTrackIndex = newIndex;
    }else{
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicFiles.length;
    }
    this.loadCurrentTrack();
      }


  //shuffle
  private playRandomTrack(): void {
    if (this.musicFiles.length <= 1) return;
    this.isShuffleMode = true;
    let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * this.musicFiles.length);
  } while (newIndex === this.currentTrackIndex && this.musicFiles.length > 1);
  
  this.currentTrackIndex = newIndex;
  this.loadCurrentTrack();
  }

  private selectRandomStartTrack(): void {
    this.currentTrackIndex = Math.floor(Math.random() * this.musicFiles.length);
    this.isShuffleMode = true; 
  }

  private toggleLoopMode(): void{
    this.isLoopMode = !this.isLoopMode;

    if(this.audioElement){
      this.audioElement.loop = this.isLoopMode;
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private initAudio(): void {
    this.audioElement = document.getElementById('background-music') as HTMLAudioElement;
    
    if (!this.audioElement) {
      console.error('Audio element not found');
      return;
    }
    
    this.audioElement.addEventListener('ended', () => {
      this.playNextTrack();
    });

    this.selectRandomStartTrack();
    
    // Load the first track
    this.loadCurrentTrack();

    document.addEventListener('click', () => {
      if (this.audioElement) {
        this.audioElement.play()
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch(err => {
            console.error('Failed to play audio:', err);
          });
      }
    }, { once: true });
  }

  private generateGalaxy(): void {
    if (this.points) {
      this.geometry?.dispose();
      this.material?.dispose();
      this.scene.remove(this.points);
    }


    const positions = new Float32Array(this.parameters.count * 3);
    const colors = new Float32Array(this.parameters.count * 3);
    const scales = new Float32Array(this.parameters.count);
    const randomness = new Float32Array(this.parameters.count * 3);

    const Colour1 = new THREE.Color(this.parameters.Colour1);
    const Colour2 = new THREE.Color(this.parameters.Colour2);

    for (let i = 0; i < this.parameters.count; i++) {
      const i3 = i * 3;

      const radius = Math.pow(Math.random(), 0.5) * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta) * (window.innerWidth / window.innerHeight);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) * 0.5;

      randomness[i3] = (Math.random() - 0.5) * 0.5;
      randomness[i3 + 1] = (Math.random() - 0.5) * 0.5;
      randomness[i3 + 2] = (Math.random() - 0.5) * 0.5;

      const complexNoise =
        Math.sin(positions[i3] * 0.2) *
        Math.cos(positions[i3 + 1] * 0.3) *
        Math.tan(positions[i3 + 2] * 0.1);

      const colorRatio = Math.abs(complexNoise);
      const mixedColor = Colour1.clone().lerp(Colour2, colorRatio);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      scales[i] = Math.pow(Math.random(), 3) * 4;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 3));

    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uSize: { value: 90 * this.renderer.getPixelRatio() },
        uTime: { value: 0 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public startAnimation(): void {
    const clock = new THREE.Clock();
  
    const animate = (): void => {
      const elapsedTime = clock.getElapsedTime();
      if (this.material) {
        this.material.uniforms.uTime.value = elapsedTime;
      }
      this.updateBrightStar(elapsedTime);

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(animate);
    };
  
    animate();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.controls.removeEventListener('change', this.handleControlsChange);
    this.geometry?.dispose();
    this.material?.dispose();
    this.renderer.dispose();
    if (this.brightStar) {
      this.scene.remove(this.brightStar);
      this.brightStar.geometry.dispose();
      if (this.brightStarMaterial) {
        this.brightStarMaterial.dispose();
      }
    }
    const toggleButton = document.getElementById('gui-toggle');
    if (toggleButton && toggleButton.parentNode) {
      toggleButton.parentNode.removeChild(toggleButton);}
  }
}


const init = () => {
  const container = document.getElementById('app');
  if (!container) throw new Error('Container element not found.');

  const galaxy = new GalaxyVisualization(container);
  galaxy.startAnimation();

  window.galaxyApp = {
    scene: galaxy['scene'],
    camera: galaxy['camera'],
    material: galaxy['material'],
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


declare global {
  interface Window {
    galaxyApp: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      material: THREE.ShaderMaterial | null;
    };
  }
}