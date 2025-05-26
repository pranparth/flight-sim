import * as THREE from 'three';
import { Aircraft } from '@entities/Aircraft';

export enum CameraMode {
  THIRD_PERSON,
  COCKPIT,
  CHASE,
  CINEMATIC,
  FREE
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: Aircraft;
  private mode: CameraMode = CameraMode.CHASE;
  
  // Camera positioning
  private offset = new THREE.Vector3(0, 5, -15);
  private lookOffset = new THREE.Vector3(0, 2, 10);
  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private smoothedOffset = new THREE.Vector3();
  private smoothedLookOffset = new THREE.Vector3();
  
  // Zoom control
  private zoomLevel = 1.0;
  private targetZoomLevel = 1.0;
  private minZoom = 0.5;
  private maxZoom = 2.0;
  private zoomSpeed = 0.1;
  private zoomLerp = 0.15;
  
  // Reset animation
  private isResetting = false;
  private resetDuration = 0.5;
  private resetTimer = 0;
  
  // Smoothing
  private positionLerp = 0.1;
  private rotationLerp = 0.1;
  private shakeMagnitude = 0;
  private shakeDecay = 0.95;
  
  // Camera modes configuration
  private modeConfigs = {
    [CameraMode.THIRD_PERSON]: {
      offset: new THREE.Vector3(0, 5, -15),
      lookOffset: new THREE.Vector3(0, 0, 20),
      fov: 60,
      positionLerp: 0.1,
      rotationLerp: 0.1,
    },
    [CameraMode.COCKPIT]: {
      offset: new THREE.Vector3(0, 1.5, 2),
      lookOffset: new THREE.Vector3(0, 0, 20),
      fov: 75,
      positionLerp: 1,
      rotationLerp: 1,
    },
    [CameraMode.CHASE]: {
      offset: new THREE.Vector3(0, 8, -20),
      lookOffset: new THREE.Vector3(0, 0, 30),
      fov: 65,
      positionLerp: 0.08,
      rotationLerp: 0.15,
    },
    [CameraMode.CINEMATIC]: {
      offset: new THREE.Vector3(10, 10, -25),
      lookOffset: new THREE.Vector3(0, 0, 0),
      fov: 50,
      positionLerp: 0.05,
      rotationLerp: 0.05,
    },
    [CameraMode.FREE]: {
      offset: new THREE.Vector3(0, 50, -100),
      lookOffset: new THREE.Vector3(0, 0, 0),
      fov: 60,
      positionLerp: 0.1,
      rotationLerp: 0.1,
    },
  };
  
  constructor(camera: THREE.PerspectiveCamera, target: Aircraft) {
    this.camera = camera;
    this.target = target;
    
    // Initialize camera position
    this.applyMode(this.mode);
    
    // Initialize smoothed offsets to current mode's offsets
    const config = this.modeConfigs[this.mode];
    this.smoothedOffset.copy(config.offset);
    this.smoothedLookOffset.copy(config.lookOffset);
    
    // Set up camera switching and controls
    window.addEventListener('keydown', (e) => this.handleKeyInput(e));
    window.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }
  
  private handleKeyInput(event: KeyboardEvent): void {
    switch (event.key) {
      case '1':
        this.setMode(CameraMode.THIRD_PERSON);
        break;
      case '2':
        this.setMode(CameraMode.COCKPIT);
        break;
      case '3':
        this.setMode(CameraMode.CHASE);
        break;
      case '4':
        this.setMode(CameraMode.CINEMATIC);
        break;
      case '5':
        this.setMode(CameraMode.FREE);
        break;
      case 'c':
      case 'C':
        this.resetCamera();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
      case '=':
      case '+':
        this.zoomIn();
        break;
    }
  }
  
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Adjust zoom based on wheel direction
    const zoomDelta = event.deltaY > 0 ? 0.1 : -0.1;
    this.targetZoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoomLevel + zoomDelta));
  }
  
  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.applyMode(mode);
  }
  
  private applyMode(mode: CameraMode): void {
    const config = this.modeConfigs[mode];
    
    this.offset.copy(config.offset);
    this.lookOffset.copy(config.lookOffset);
    this.camera.fov = config.fov;
    this.camera.updateProjectionMatrix();
    
    this.positionLerp = config.positionLerp;
    this.rotationLerp = config.rotationLerp;
  }
  
  update(deltaTime: number): void {
    const targetPosition = this.target.getPosition();
    const targetRotation = this.target.getRotation();
    
    // Update zoom level
    this.zoomLevel = THREE.MathUtils.lerp(this.zoomLevel, this.targetZoomLevel, this.zoomLerp);
    
    // Handle reset animation
    if (this.isResetting) {
      this.resetTimer += deltaTime;
      const resetProgress = Math.min(this.resetTimer / this.resetDuration, 1);
      const easedProgress = this.easeOutCubic(resetProgress);
      
      // Force the smoothed offsets to move quickly to the correct position
      this.smoothedOffset.lerp(this.offset, easedProgress);
      this.smoothedLookOffset.lerp(this.lookOffset, easedProgress);
      
      if (resetProgress >= 1) {
        this.isResetting = false;
        // Ensure we're exactly at the right offset
        this.smoothedOffset.copy(this.offset);
        this.smoothedLookOffset.copy(this.lookOffset);
      }
    } else {
      // Normal smooth following
      this.smoothedOffset.lerp(this.offset, this.positionLerp);
      this.smoothedLookOffset.lerp(this.lookOffset, this.rotationLerp);
    }
    
    // Calculate camera position by applying smoothed offset to aircraft
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(targetRotation);
    
    // Apply zoom to offset
    const zoomedOffset = this.smoothedOffset.clone().multiplyScalar(this.zoomLevel);
    const rotatedOffset = zoomedOffset.clone().applyMatrix4(rotationMatrix);
    this.currentPosition.copy(targetPosition).add(rotatedOffset);
    
    // Calculate look-at position
    const rotatedLookOffset = this.smoothedLookOffset.clone().applyMatrix4(rotationMatrix);
    this.currentLookAt.copy(targetPosition).add(rotatedLookOffset);
    
    // Prevent camera from going below ground
    const minHeight = 2;
    this.currentPosition.y = Math.max(this.currentPosition.y, minHeight);
    
    // Apply camera shake if any
    if (this.shakeMagnitude > 0.01) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeMagnitude,
        (Math.random() - 0.5) * this.shakeMagnitude,
        (Math.random() - 0.5) * this.shakeMagnitude
      );
      this.currentPosition.add(shakeOffset);
      this.shakeMagnitude *= this.shakeDecay;
    }
    
    // Set camera position and look at target
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
    
    // Special handling for specific modes
    if (this.mode === CameraMode.COCKPIT) {
      // Align camera with aircraft rotation more closely
      const aircraftQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
      this.camera.quaternion.slerp(aircraftQuaternion, 0.5);
    }
  }
  
  
  shake(magnitude: number): void {
    this.shakeMagnitude = magnitude;
  }
  
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  getMode(): CameraMode {
    return this.mode;
  }
  
  handleResize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
  
  // Cinematic camera movements
  startCinematicSequence(_type: 'flyby' | 'orbit' | 'dramatic'): void {
    if (this.mode !== CameraMode.CINEMATIC) {
      this.setMode(CameraMode.CINEMATIC);
    }
    
    // TODO: Implement cinematic sequences
    // This would involve creating predefined camera paths and animations
  }
  
  // New methods for zoom and reset functionality
  resetCamera(): void {
    // Switch to chase mode if not already
    if (this.mode !== CameraMode.CHASE) {
      this.setMode(CameraMode.CHASE);
    }
    
    // Reset zoom to default
    this.targetZoomLevel = 1.0;
    this.zoomLevel = 1.0;
    
    // Reset the smoothed offsets to the default chase mode offsets
    const config = this.modeConfigs[CameraMode.CHASE];
    this.smoothedOffset.copy(config.offset);
    this.smoothedLookOffset.copy(config.lookOffset);
    
    // Start reset animation for smooth transition
    this.isResetting = true;
    this.resetTimer = 0;
  }
  
  getZoomLevel(): number {
    return this.zoomLevel;
  }
  
  setZoomLevel(level: number): void {
    this.targetZoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
  }
  
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  zoomIn(): void {
    this.targetZoomLevel = Math.max(this.minZoom, this.targetZoomLevel - this.zoomSpeed);
  }
  
  zoomOut(): void {
    this.targetZoomLevel = Math.min(this.maxZoom, this.targetZoomLevel + this.zoomSpeed);
  }
}