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
  private currentOffset = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  
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
    
    // Set up camera switching
    window.addEventListener('keydown', (e) => this.handleCameraSwitch(e));
  }
  
  private handleCameraSwitch(event: KeyboardEvent): void {
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
    }
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
  
  update(_deltaTime: number): void {
    const targetPosition = this.target.getPosition();
    const targetRotation = this.target.getRotation();
    
    // Calculate desired camera position based on mode
    const desiredPosition = this.calculateDesiredPosition(targetPosition, targetRotation);
    const desiredLookAt = this.calculateDesiredLookAt(targetPosition, targetRotation);
    
    // Smooth camera movement
    this.currentOffset.lerp(desiredPosition, this.positionLerp);
    this.currentLookAt.lerp(desiredLookAt, this.rotationLerp);
    
    // Apply camera shake if any
    if (this.shakeMagnitude > 0.01) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeMagnitude,
        (Math.random() - 0.5) * this.shakeMagnitude,
        (Math.random() - 0.5) * this.shakeMagnitude
      );
      this.currentOffset.add(shakeOffset);
      this.shakeMagnitude *= this.shakeDecay;
    }
    
    // Set camera position and look at target
    this.camera.position.copy(this.currentOffset);
    this.camera.lookAt(this.currentLookAt);
    
    // Special handling for specific modes
    if (this.mode === CameraMode.COCKPIT) {
      // Align camera with aircraft rotation more closely
      const aircraftQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
      this.camera.quaternion.slerp(aircraftQuaternion, 0.5);
    }
  }
  
  private calculateDesiredPosition(
    targetPos: THREE.Vector3,
    targetRot: THREE.Euler
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (this.mode === CameraMode.FREE) {
      // Free camera doesn't follow the aircraft closely
      return this.camera.position.clone();
    }
    
    // Transform offset by aircraft rotation
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(targetRot);
    const rotatedOffset = this.offset.clone().applyMatrix4(rotationMatrix);
    
    // Add to target position
    position.copy(targetPos).add(rotatedOffset);
    
    // Prevent camera from going below ground/water
    const minHeight = 2;
    position.y = Math.max(position.y, minHeight);
    
    return position;
  }
  
  private calculateDesiredLookAt(
    targetPos: THREE.Vector3,
    targetRot: THREE.Euler
  ): THREE.Vector3 {
    if (this.mode === CameraMode.FREE) {
      // Free camera looks at the aircraft
      return targetPos.clone();
    }
    
    // Calculate look-at point based on aircraft orientation
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(targetRot);
    const rotatedLookOffset = this.lookOffset.clone().applyMatrix4(rotationMatrix);
    
    return targetPos.clone().add(rotatedLookOffset);
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
}