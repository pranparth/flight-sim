import * as THREE from 'three';
import { AircraftConfig } from './AircraftConfigs';
import { FlightControls } from '@systems/InputManager';
import { AircraftState } from '@entities/Aircraft';

export interface FlightForces {
  thrust: THREE.Vector3;
  lift: THREE.Vector3;
  drag: THREE.Vector3;
  weight: THREE.Vector3;
  total: THREE.Vector3;
  controlEffectiveness: number;
}

export class FlightDynamics {
  private config: AircraftConfig;
  private airDensity = 1.225; // kg/m³ at sea level
  private gravity = 9.81; // m/s²
  
  constructor(config: AircraftConfig) {
    this.config = config;
  }
  
  calculateForces(
    state: AircraftState,
    controls: FlightControls,
    _deltaTime: number
  ): FlightForces {
    // Calculate individual force components
    const thrust = this.calculateThrust(state, controls);
    const lift = this.calculateLift(state);
    const drag = this.calculateDrag(state);
    const weight = this.calculateWeight();
    
    // Calculate control effectiveness based on airspeed
    const controlEffectiveness = this.calculateControlEffectiveness(state);
    
    // Sum all forces
    const total = new THREE.Vector3()
      .add(thrust)
      .add(lift)
      .add(drag)
      .add(weight);
    
    return {
      thrust,
      lift,
      drag,
      weight,
      total,
      controlEffectiveness
    };
  }
  
  private calculateThrust(state: AircraftState, controls: FlightControls): THREE.Vector3 {
    // Thrust acts along the aircraft's forward direction
    const thrustMagnitude = controls.throttle * this.config.maxThrust;
    
    // Get forward direction in world space
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyEuler(state.rotation);
    
    return forward.multiplyScalar(thrustMagnitude);
  }
  
  private calculateLift(state: AircraftState): THREE.Vector3 {
    const velocity = state.airspeed;
    const velocitySquared = velocity * velocity;
    
    // Simplified lift equation: L = 0.5 * ρ * V² * S * CL
    const dynamicPressure = 0.5 * this.airDensity * velocitySquared;
    
    // Lift coefficient varies with angle of attack
    const cl = this.calculateLiftCoefficient(state.angleOfAttack);
    
    const liftMagnitude = dynamicPressure * this.config.wingArea * cl;
    
    // Lift acts perpendicular to velocity, in the aircraft's up direction
    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(state.rotation);
    
    // Apply stall effects
    const stallFactor = this.calculateStallFactor(state);
    
    // Ensure minimum lift to prevent getting stuck
    const minLift = this.config.mass * this.gravity * 0.5; // At least half weight support at low speeds
    const finalLift = Math.max(liftMagnitude * stallFactor, velocity > 20 ? minLift : 0);
    
    return up.multiplyScalar(finalLift);
  }
  
  private calculateDrag(state: AircraftState): THREE.Vector3 {
    const velocity = state.airspeed;
    const velocitySquared = velocity * velocity;
    
    // Base drag
    const dynamicPressure = 0.5 * this.airDensity * velocitySquared;
    const parasticDrag = dynamicPressure * this.config.dragCoefficient * this.config.wingArea;
    
    // Induced drag (increases with angle of attack)
    const inducedDragCoeff = Math.pow(this.calculateLiftCoefficient(state.angleOfAttack), 2) / 
                            (Math.PI * this.config.aspectRatio * 0.8);
    const inducedDrag = dynamicPressure * inducedDragCoeff * this.config.wingArea;
    
    const totalDrag = parasticDrag + inducedDrag;
    
    // Drag opposes velocity
    if (velocity > 0.1) {
      const dragDirection = state.velocity.clone().normalize().multiplyScalar(-1);
      return dragDirection.multiplyScalar(totalDrag);
    }
    
    return new THREE.Vector3(0, 0, 0);
  }
  
  private calculateWeight(): THREE.Vector3 {
    // Weight always acts downward
    return new THREE.Vector3(0, -this.config.mass * this.gravity, 0);
  }
  
  private calculateLiftCoefficient(angleOfAttack: number): number {
    // Simplified lift curve
    const alpha = angleOfAttack;
    const alphaStall = 15 * Math.PI / 180; // 15 degrees
    
    if (Math.abs(alpha) < alphaStall) {
      // Linear region
      return this.config.liftCoefficient * alpha * 5.7; // 5.7 ≈ 180/π * 0.1
    } else {
      // Post-stall
      return this.config.liftCoefficient * Math.sign(alpha) * 0.5;
    }
  }
  
  private calculateStallFactor(state: AircraftState): number {
    const criticalAOA = 15 * Math.PI / 180; // 15 degrees
    const alpha = Math.abs(state.angleOfAttack);
    
    if (alpha < criticalAOA) {
      return 1.0;
    }
    
    // Progressive stall
    const stallProgress = (alpha - criticalAOA) / (10 * Math.PI / 180);
    return Math.max(0.3, 1.0 - stallProgress * 0.7);
  }
  
  private calculateControlEffectiveness(state: AircraftState): number {
    // Control surfaces are less effective at low speeds
    const minSpeed = this.config.stallSpeed * 0.5;
    const normalSpeed = this.config.cruiseSpeed;
    
    if (state.airspeed < minSpeed) {
      return 0.1;
    } else if (state.airspeed < normalSpeed) {
      return 0.1 + (state.airspeed - minSpeed) / (normalSpeed - minSpeed) * 0.9;
    } else {
      return 1.0;
    }
  }
  
  // Helper methods for special maneuvers
  isStalled(state: AircraftState): boolean {
    const criticalAOA = 15 * Math.PI / 180;
    return Math.abs(state.angleOfAttack) > criticalAOA || 
           state.airspeed < this.config.stallSpeed * 0.9;
  }
  
  getOptimalClimbAngle(state: AircraftState): number {
    // Best climb angle varies with speed
    const speedRatio = state.airspeed / this.config.cruiseSpeed;
    
    if (speedRatio < 0.6) {
      return 5 * Math.PI / 180; // 5 degrees
    } else if (speedRatio < 1.2) {
      return 15 * Math.PI / 180; // 15 degrees
    } else {
      return 10 * Math.PI / 180; // 10 degrees
    }
  }
  
  getMaxTurnRate(state: AircraftState): number {
    // Maximum sustainable turn rate based on speed and G-limits
    const gLimit = 6; // 6G limit for WW2 fighters
    const turnRadius = (state.airspeed * state.airspeed) / (this.gravity * gLimit);
    const maxTurnRate = state.airspeed / turnRadius;
    
    return Math.min(maxTurnRate, this.config.rollRate);
  }
}