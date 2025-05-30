import * as THREE from 'three';
import { FlightControls } from '@systems/InputManager';
import { AircraftConfig, getAircraftConfig } from '@core/AircraftConfigs';
import { FlightDynamics } from '@core/FlightDynamics';
import { createAircraftMesh } from '@utils/MeshFactory';

export interface AircraftState {
  // Position and orientation
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  
  // Flight parameters
  airspeed: number;
  altitude: number;
  heading: number;
  angleOfAttack: number;
  slipAngle: number;
  throttle: number;
  
  // Health and status
  health: number;
  fuel: number;
  ammunition: number;
}

export interface AircraftOptions {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  type: 'spitfire' | 'bf109' | 'p51mustang' | 'zero';
  id?: string;
}

export class Aircraft {
  private id: string;
  private mesh: THREE.Group;
  private config: AircraftConfig;
  private dynamics: FlightDynamics;
  private state: AircraftState;
  private controls: FlightControls;
  
  // Visual components
  private propeller?: THREE.Mesh;
  private controlSurfaces: {
    elevator?: THREE.Mesh;
    rudder?: THREE.Mesh;
    aileronLeft?: THREE.Mesh;
    aileronRight?: THREE.Mesh;
  } = {};
  
  // Reset timer management
  private resetTimer: number | null = null;
  
  // Damage system properties
  private engineDamage: number = 0; // 0-1, 0 = no damage, 1 = destroyed
  private controlDamage: { roll: number; pitch: number; yaw: number } = { roll: 0, pitch: 0, yaw: 0 };
  private fuelLeakRate: number = 1.0; // Multiplier for fuel consumption
  private isOnFire: boolean = false;
  private isSpinning: boolean = false;
  private spinDirection: 'left' | 'right' | null = null;
  private isDestroyed: boolean = false;
  
  constructor(options: AircraftOptions) {
    // Set aircraft ID
    this.id = options.id || `aircraft_${Date.now()}`;
    
    // Get aircraft configuration
    this.config = getAircraftConfig(options.type);
    
    // Initialize state
    this.state = {
      position: options.position || new THREE.Vector3(0, 100, 0),
      rotation: options.rotation || new THREE.Euler(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, this.config.cruiseSpeed), // Start with cruise speed
      angularVelocity: new THREE.Vector3(0, 0, 0),
      airspeed: this.config.cruiseSpeed,
      altitude: options.position?.y || 100,
      heading: 0,
      angleOfAttack: 0,
      slipAngle: 0,
      throttle: 0.7, // Start with higher throttle for stable flight
      health: 100,
      fuel: 100,
      ammunition: this.config.maxAmmunition,
    };
    
    // Create visual mesh
    this.mesh = createAircraftMesh(options.type);
    this.mesh.position.copy(this.state.position);
    this.mesh.rotation.copy(this.state.rotation);
    
    // Store aircraft ID in mesh userData for hit detection
    this.mesh.userData.aircraftId = this.id;
    
    // Find control surfaces and propeller
    this.findComponents();
    
    // Initialize flight dynamics
    this.dynamics = new FlightDynamics(this.config);
    
    // Default controls
    this.controls = {
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0.5,
      brake: false,
      boost: false,
      fire: false,
      lookBack: false,
      pause: false,
    };
  }
  
  private findComponents(): void {
    // Find propeller for animation
    this.propeller = this.mesh.getObjectByName('propeller') as THREE.Mesh;
    
    // Find control surfaces
    this.controlSurfaces.elevator = this.mesh.getObjectByName('elevator') as THREE.Mesh;
    this.controlSurfaces.rudder = this.mesh.getObjectByName('rudder') as THREE.Mesh;
    this.controlSurfaces.aileronLeft = this.mesh.getObjectByName('aileron_left') as THREE.Mesh;
    this.controlSurfaces.aileronRight = this.mesh.getObjectByName('aileron_right') as THREE.Mesh;
  }
  
  updateControls(controls: FlightControls): void {
    this.controls = { ...controls };
    this.state.throttle = controls.throttle;
  }
  
  update(deltaTime: number): void {
    // Update flight dynamics
    const forces = this.dynamics.calculateForces(
      this.state,
      this.controls,
      deltaTime
    );
    
    // Apply forces to update velocity and position
    this.applyForces(forces, deltaTime);
    
    // Update visual elements
    this.updateVisuals(deltaTime);
    
    // Update derived values
    this.updateFlightParameters();
    
    // Check for ground collision
    this.checkGroundCollision();
    
    // Update fuel consumption
    this.updateFuel(deltaTime);
  }
  
  private applyForces(forces: any, deltaTime: number): void {
    // Linear acceleration
    const acceleration = new THREE.Vector3(
      forces.total.x / this.config.mass,
      forces.total.y / this.config.mass,
      forces.total.z / this.config.mass
    );
    
    // Update velocity
    this.state.velocity.add(acceleration.clone().multiplyScalar(deltaTime));
    
    // Update position
    this.state.position.add(this.state.velocity.clone().multiplyScalar(deltaTime));
    
    // Angular acceleration from control inputs (affected by damage)
    const pitchRate = this.controls.pitch * this.config.pitchRate * forces.controlEffectiveness * (1 - Math.abs(this.controlDamage.pitch));
    const rollRate = this.controls.roll * this.config.rollRate * forces.controlEffectiveness * (1 - Math.abs(this.controlDamage.roll));
    const yawRate = this.controls.yaw * this.config.yawRate * forces.controlEffectiveness * (1 - Math.abs(this.controlDamage.yaw));
    
    // Add uncontrollable spin if wing is destroyed
    if (this.isSpinning && this.spinDirection) {
      const spinForce = this.spinDirection === 'left' ? -5 : 5;
      this.state.angularVelocity.z += spinForce * deltaTime;
      this.state.angularVelocity.x -= 2 * deltaTime; // Nose down
    }
    
    // Update angular velocity
    this.state.angularVelocity.x += pitchRate * deltaTime;
    this.state.angularVelocity.z += rollRate * deltaTime;
    this.state.angularVelocity.y += yawRate * deltaTime;
    
    // Apply damping
    this.state.angularVelocity.multiplyScalar(0.92); // Slightly less damping for better responsiveness
    
    // Update rotation
    const rotationDelta = new THREE.Euler(
      this.state.angularVelocity.x * deltaTime,
      this.state.angularVelocity.y * deltaTime,
      this.state.angularVelocity.z * deltaTime
    );
    
    // Apply rotation
    const quaternion = new THREE.Quaternion().setFromEuler(this.state.rotation);
    const deltaQuaternion = new THREE.Quaternion().setFromEuler(rotationDelta);
    quaternion.multiply(deltaQuaternion);
    this.state.rotation.setFromQuaternion(quaternion);
    
    // Update mesh transform
    this.mesh.position.copy(this.state.position);
    this.mesh.rotation.copy(this.state.rotation);
  }
  
  private updateVisuals(deltaTime: number): void {
    // Animate propeller
    if (this.propeller) {
      const propSpeed = this.state.throttle * 50; // Radians per second
      this.propeller.rotation.z += propSpeed * deltaTime;
    }
    
    // Animate control surfaces
    if (this.controlSurfaces.elevator) {
      this.controlSurfaces.elevator.rotation.x = this.controls.pitch * 0.3;
    }
    
    if (this.controlSurfaces.rudder) {
      this.controlSurfaces.rudder.rotation.y = this.controls.yaw * 0.3;
    }
    
    if (this.controlSurfaces.aileronLeft) {
      this.controlSurfaces.aileronLeft.rotation.x = -this.controls.roll * 0.3;
    }
    
    if (this.controlSurfaces.aileronRight) {
      this.controlSurfaces.aileronRight.rotation.x = this.controls.roll * 0.3;
    }
  }
  
  private updateFlightParameters(): void {
    // Calculate airspeed
    this.state.airspeed = this.state.velocity.length();
    
    // Update altitude
    this.state.altitude = this.state.position.y;
    
    // Calculate heading from rotation
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyEuler(this.state.rotation);
    this.state.heading = Math.atan2(forward.x, forward.z);
    
    // Calculate angle of attack
    const localVelocity = this.state.velocity.clone();
    const inverseRotation = new THREE.Matrix4().makeRotationFromEuler(this.state.rotation).invert();
    localVelocity.applyMatrix4(inverseRotation);
    
    if (localVelocity.z !== 0) {
      this.state.angleOfAttack = Math.atan2(-localVelocity.y, localVelocity.z);
    }
    
    // Calculate slip angle
    if (localVelocity.z !== 0) {
      this.state.slipAngle = Math.atan2(localVelocity.x, localVelocity.z);
    }
  }
  
  private checkGroundCollision(): void {
    const groundLevel = 0; // Sea level
    const resetDelay = 2000; // 2 seconds before auto-reset
    
    // Check for crash
    if (this.state.position.y <= groundLevel && this.state.health > 0) {
      // Just crashed!
      this.state.position.y = groundLevel;
      this.state.velocity.multiplyScalar(0);
      this.state.angularVelocity.multiplyScalar(0);
      this.state.health = 0;
      // Aircraft crashed
      
      console.warn('Aircraft crashed - auto-reset in 2 seconds');
      
      // Clear any existing timer
      if (this.resetTimer !== null) {
        clearTimeout(this.resetTimer);
      }
      
      // Schedule auto-reset after delay
      this.resetTimer = window.setTimeout(() => {
        if (this.state.health === 0) {
          console.log('Auto-resetting after crash');
          this.reset();
        }
        this.resetTimer = null;
      }, resetDelay);
    }
    
    // Reset if aircraft gets stuck (very low speed at low altitude, but not crashed)
    if (this.state.health > 0 && 
        this.state.airspeed < 10 && 
        this.state.altitude < 30 && 
        this.state.altitude > groundLevel + 0.5) {
      console.warn('Aircraft stuck - resetting position');
      this.reset();
    }
    
    // Bounds checking - keep aircraft in playable area (expanded for larger map)
    const maxDistance = 14000; // Increased from 5000 to match larger environment
    const horizontalDistance = Math.sqrt(
      this.state.position.x * this.state.position.x + 
      this.state.position.z * this.state.position.z
    );
    
    if (horizontalDistance > maxDistance) {
      // If out of bounds and low speed, reset instead of just turning
      if (this.state.airspeed < 50) {
        console.warn('Aircraft out of bounds and slow - resetting');
        this.reset();
      } else {
        // Turn aircraft back towards center
        const angleToCenter = Math.atan2(-this.state.position.x, -this.state.position.z);
        this.state.rotation.y = angleToCenter;
        console.warn('Aircraft out of bounds - turning back');
      }
    }
  }
  
  private updateFuel(deltaTime: number): void {
    // Fuel consumption based on throttle (affected by damage/leaks)
    const fuelConsumption = this.state.throttle * this.config.fuelConsumptionRate * deltaTime * this.fuelLeakRate;
    this.state.fuel = Math.max(0, this.state.fuel - fuelConsumption);
    
    // If out of fuel, reduce throttle
    if (this.state.fuel <= 0) {
      this.state.throttle = 0;
      this.controls.throttle = 0;
    }
  }
  
  // Public methods
  getMesh(): THREE.Group {
    return this.mesh;
  }
  
  getId(): string {
    return this.id;
  }
  
  getPosition(): THREE.Vector3 {
    return this.state.position.clone();
  }
  
  getRotation(): THREE.Euler {
    return this.state.rotation.clone();
  }
  
  getVelocity(): THREE.Vector3 {
    return this.state.velocity.clone();
  }
  
  getState(): Readonly<AircraftState> {
    return { ...this.state };
  }
  
  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
    
    if (this.state.health <= 0) {
      // Aircraft destroyed
      // TODO: Trigger destruction effects
    }
  }
  
  repair(amount: number): void {
    this.state.health = Math.min(100, this.state.health + amount);
  }
  
  refuel(amount: number): void {
    this.state.fuel = Math.min(100, this.state.fuel + amount);
  }
  
  rearm(): void {
    this.state.ammunition = this.config.maxAmmunition;
  }
  
  reset(): void {
    // Clear any pending reset timer
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    
    // Reset position and orientation
    this.state.position.set(0, 500, 0);
    this.state.rotation.set(0, 0, 0);
    
    // Reset velocity to cruise speed
    this.state.velocity.set(0, 0, this.config.cruiseSpeed);
    this.state.angularVelocity.set(0, 0, 0);
    
    // Reset flight parameters
    this.state.airspeed = this.config.cruiseSpeed;
    this.state.altitude = 500;
    this.state.heading = 0;
    this.state.angleOfAttack = 0;
    this.state.slipAngle = 0;
    this.state.throttle = 0.7;
    
    // Reset health and fuel
    this.state.health = 100;
    this.state.fuel = 100;
    
    // Reset flight dynamics engine state
    this.dynamics.reset();
    
    // Reset damage state
    this.engineDamage = 0;
    this.controlDamage = { roll: 0, pitch: 0, yaw: 0 };
    this.fuelLeakRate = 1.0;
    this.isOnFire = false;
    this.isSpinning = false;
    this.spinDirection = null;
    this.isDestroyed = false;
    
    // Update mesh position
    this.mesh.position.copy(this.state.position);
    this.mesh.rotation.copy(this.state.rotation);
    
    // Clear crash time
    // Reset complete
  }
  
  // Test helper methods (only use for testing)
  _testSetState(updates: Partial<AircraftState>): void {
    // Handle rotation specially to preserve THREE.Euler object
    if (updates.rotation) {
      if (updates.rotation instanceof THREE.Euler) {
        this.state.rotation.copy(updates.rotation);
      } else {
        // Handle plain object with x, y, z properties
        this.state.rotation.set(
          (updates.rotation as any).x || this.state.rotation.x,
          (updates.rotation as any).y || this.state.rotation.y,
          (updates.rotation as any).z || this.state.rotation.z
        );
      }
      this.mesh.rotation.copy(this.state.rotation);
      delete (updates as any).rotation; // Remove so Object.assign doesn't overwrite
    }
    
    // Handle position specially to preserve THREE.Vector3 object
    if (updates.position) {
      if (updates.position instanceof THREE.Vector3) {
        this.state.position.copy(updates.position);
      } else {
        this.state.position.set(
          (updates.position as any).x || this.state.position.x,
          (updates.position as any).y || this.state.position.y,
          (updates.position as any).z || this.state.position.z
        );
      }
      this.mesh.position.copy(this.state.position);
      delete (updates as any).position; // Remove so Object.assign doesn't overwrite
    }
    
    // Handle velocity specially to preserve THREE.Vector3 object
    if (updates.velocity) {
      if (updates.velocity instanceof THREE.Vector3) {
        this.state.velocity.copy(updates.velocity);
      } else {
        this.state.velocity.set(
          (updates.velocity as any).x || this.state.velocity.x,
          (updates.velocity as any).y || this.state.velocity.y,
          (updates.velocity as any).z || this.state.velocity.z
        );
      }
      delete (updates as any).velocity;
    }
    
    // Handle remaining scalar properties
    Object.assign(this.state, updates);
  }
  
  _testCheckCollisions(): void {
    this.checkGroundCollision();
  }
  
  // Damage system methods
  setEngineDamage(damage: number): void {
    this.engineDamage = Math.max(0, Math.min(1, damage));
    // Update max thrust based on damage
    const damageMultiplier = 1 - this.engineDamage;
    this.dynamics.setMaxThrust(this.config.maxThrust * damageMultiplier);
  }
  
  setControlDamage(control: 'roll' | 'pitch' | 'yaw' | 'all', damage: number): void {
    if (control === 'all') {
      this.controlDamage.roll = damage;
      this.controlDamage.pitch = damage;
      this.controlDamage.yaw = damage;
    } else {
      this.controlDamage[control] = damage;
    }
  }
  
  setFuelLeakRate(rate: number): void {
    this.fuelLeakRate = Math.max(1, rate);
  }
  
  setOnFire(onFire: boolean): void {
    this.isOnFire = onFire;
    // Fire causes continuous damage over time
    if (onFire) {
      this.state.health -= 5; // Immediate damage
    }
  }
  
  setUncontrollableSpin(direction: 'left' | 'right'): void {
    this.isSpinning = true;
    this.spinDirection = direction;
  }
  
  setDestroyed(): void {
    this.isDestroyed = true;
    this.state.health = 0;
    // Aircraft is destroyed - will trigger destruction effects
  }
  
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }
  
  getIsOnFire(): boolean {
    return this.isOnFire;
  }
  
  setHealth(health: number): void {
    this.state.health = Math.max(0, Math.min(100, health));
  }
  
  // Testing helper - expose dynamics for physics tests
  getFlightDynamics(): FlightDynamics {
    return this.dynamics;
  }
}