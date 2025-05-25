import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
// import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Cartoon-style render settings
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 10, -20);
    
    // Setup post-processing
    this.setupPostProcessing();
  }
  
  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.composer.addPass(renderPass);
    
    // FXAA for smooth edges
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(
      1 / this.container.clientWidth,
      1 / this.container.clientHeight
    );
    this.composer.addPass(fxaaPass);
  }
  
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    // Update render pass with current scene/camera
    const renderPass = this.composer.passes[0] as RenderPass;
    renderPass.scene = scene;
    renderPass.camera = camera;
    
    // Render with post-processing
    this.composer.render();
  }
  
  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    
    // Update FXAA resolution
    const fxaaPass = this.composer.passes[1] as ShaderPass;
    if (fxaaPass && fxaaPass.uniforms['resolution']) {
      fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
    }
  }
  
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }
  }
}