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

export interface EngineState {
  actualThrottle: number;  // Current engine power (0-1)
  targetThrottle: number;  // Desired throttle setting
  rpm: number;            // Engine RPM
  temperature: number;    // Engine temperature
}

export class FlightDynamics {
  private config: AircraftConfig;
  private airDensity = 1.225; // kg/m³ at sea level
  private gravity = 9.81; // m/s²
  
  // Engine simulation
  private engineState: EngineState = {
    actualThrottle: 0,
    targetThrottle: 0,
    rpm: 800,  // Start at idle RPM
    temperature: 20
  };
  
  // Engine response characteristics
  private throttleResponseRate = 2.5; // How fast throttle responds (per second)
  private rpmResponseRate = 1.8; // How fast RPM changes (per second)
  private idleRpm = 800;
  private maxRpm = 2800;
  
  constructor(config: AircraftConfig) {
    this.config = config;
  }
  
  calculateForces(
    state: AircraftState,
    controls: FlightControls,
    deltaTime: number
  ): FlightForces {
    // Update engine state with throttle response
    this.updateEngineState(controls, deltaTime);
    
    // Calculate individual force components
    const thrust = this.calculateThrust(state, controls);
    const lift = this.calculateLift(state);
    const drag = this.calculateDrag(state);
    const weight = this.calculateWeight(state);
    
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
  
  private updateEngineState(controls: FlightControls, deltaTime: number): void {
    // Update target throttle
    this.engineState.targetThrottle = controls.throttle;
    
    // Engine throttle response with lag
    const throttleDiff = this.engineState.targetThrottle - this.engineState.actualThrottle;
    const throttleChange = Math.sign(throttleDiff) * this.throttleResponseRate * deltaTime;
    
    if (Math.abs(throttleDiff) > Math.abs(throttleChange)) {
      this.engineState.actualThrottle += throttleChange;
    } else {
      this.engineState.actualThrottle = this.engineState.targetThrottle;
    }
    
    // Clamp throttle
    this.engineState.actualThrottle = Math.max(0, Math.min(1, this.engineState.actualThrottle));
    
    // Update RPM based on actual throttle
    const targetRpm = this.idleRpm + (this.maxRpm - this.idleRpm) * this.engineState.actualThrottle;
    const rpmDiff = targetRpm - this.engineState.rpm;
    const maxRpmChangePerSecond = (this.maxRpm - this.idleRpm) * this.rpmResponseRate;
    const rpmChange = Math.sign(rpmDiff) * Math.min(Math.abs(rpmDiff), maxRpmChangePerSecond * deltaTime);
    
    this.engineState.rpm += rpmChange;
    
    // Update engine temperature (simplified)
    const targetTemp = 20 + this.engineState.actualThrottle * 80; // 20-100°C range
    this.engineState.temperature += (targetTemp - this.engineState.temperature) * deltaTime * 0.5;
  }

  private calculateThrust(state: AircraftState, _controls: FlightControls): THREE.Vector3 {
    // Use actual engine throttle instead of input throttle for more realistic response
    let thrustMagnitude = this.engineState.actualThrottle * this.config.maxThrust;
    
    // Altitude affects engine power (simplified)
    const altitudeFactor = Math.max(0.3, 1.0 - state.altitude / 15000);
    thrustMagnitude *= altitudeFactor;
    
    // Engine efficiency curve - not linear
    const throttleEfficiency = this.getThrottleEfficiency(this.engineState.actualThrottle);
    thrustMagnitude *= throttleEfficiency;
    
    // Get forward direction in world space
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyEuler(state.rotation);
    
    return forward.multiplyScalar(thrustMagnitude);
  }
  
  getThrottleEfficiency(throttle: number): number {
    // Engine efficiency curve - not perfectly linear
    // Low throttle is less efficient, peak efficiency around 80%
    if (throttle < 0.1) return 0.3;
    if (throttle < 0.3) return 0.5 + throttle * 1.67; // 0.5 to 1.0
    if (throttle < 0.8) return 0.85 + throttle * 0.1875; // 0.85 to 1.0
    return 1.0 - (throttle - 0.8) * 0.25; // 1.0 to 0.95 (overheating)
  }
  
  private calculateLift(state: AircraftState): THREE.Vector3 {
    const velocity = state.airspeed;
    const velocitySquared = velocity * velocity;
    
    // Simplified lift equation: L = 0.5 * ρ * V² * S * CL
    const dynamicPressure = 0.5 * this.airDensity * velocitySquared;
    
    // Lift coefficient varies with angle of attack
    const cl = this.calculateLiftCoefficient(state.angleOfAttack);
    
    let liftMagnitude = dynamicPressure * this.config.wingArea * cl;
    
    // Apply stall effects with improved modeling
    const stallEffects = this.calculateStallEffects(state);
    liftMagnitude *= stallEffects.liftReduction;
    
    // Lift acts perpendicular to velocity, in the aircraft's up direction
    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(state.rotation);
    
    // Minimum lift only at very low speeds to prevent ground sticking
    const minLift = velocity > 5 ? this.config.mass * this.gravity * 0.2 : 0;
    const finalLift = Math.max(liftMagnitude, minLift);
    
    return up.multiplyScalar(finalLift);
  }
  
  private calculateDrag(state: AircraftState): THREE.Vector3 {
    const velocity = state.airspeed;
    const velocitySquared = velocity * velocity;
    
    // Base drag
    const dynamicPressure = 0.5 * this.airDensity * velocitySquared;
    let parasticDrag = dynamicPressure * this.config.dragCoefficient * this.config.wingArea;
    
    // Induced drag (increases with angle of attack)
    const cl = this.calculateLiftCoefficient(state.angleOfAttack);
    const inducedDragCoeff = Math.pow(cl, 2) / (Math.PI * this.config.aspectRatio * 0.8);
    let inducedDrag = dynamicPressure * inducedDragCoeff * this.config.wingArea;
    
    // Apply stall effects to drag
    const stallEffects = this.calculateStallEffects(state);
    parasticDrag *= stallEffects.dragIncrease;
    inducedDrag *= stallEffects.dragIncrease;
    
    const totalDrag = parasticDrag + inducedDrag;
    
    // Drag opposes velocity
    if (velocity > 0.1) {
      const dragDirection = state.velocity.clone().normalize().multiplyScalar(-1);
      return dragDirection.multiplyScalar(totalDrag);
    }
    
    return new THREE.Vector3(0, 0, 0);
  }
  
  private calculateWeight(state: AircraftState): THREE.Vector3 {
    const weightMagnitude = this.config.mass * this.gravity;
    
    // Weight always acts straight down in world coordinates
    const weight = new THREE.Vector3(0, -weightMagnitude, 0);
    
    // When aircraft is pitched, part of the weight acts along the flight path
    // This simulates the effect of gravity pulling the aircraft forward when diving
    // or backward when climbing
    if (state.velocity.length() > 5) {
      const pitchAngle = state.rotation.x;
      // For a dive (negative pitch), sin is negative, so we get positive forward force
      const forwardComponent = -Math.sin(pitchAngle) * weightMagnitude;
      
      // Get the aircraft's forward direction in world space
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyEuler(state.rotation);
      
      // Add the forward/backward component to the weight
      weight.add(forward.multiplyScalar(forwardComponent));
    }
    
    return weight;
  }
  
  private calculateLiftCoefficient(angleOfAttack: number): number {
    // More realistic lift curve with better stall characteristics
    const alpha = angleOfAttack * 180 / Math.PI; // Convert to degrees for easier calculation
    const alphaStall = 15; // 15 degrees critical AoA
    
    if (Math.abs(alpha) <= alphaStall) {
      // Linear region: approximately 0.1 per degree
      return this.config.liftCoefficient * alpha * 0.1;
    } else {
      // Post-stall region: sharp drop-off but not to zero
      const excessAlpha = Math.abs(alpha) - alphaStall;
      const stallReduction = Math.exp(-excessAlpha / 8); // Exponential decay
      return this.config.liftCoefficient * Math.sign(alpha) * (0.3 + 0.7 * stallReduction);
    }
  }
  
  private calculateStallEffects(state: AircraftState): { liftReduction: number; dragIncrease: number; pitchMoment: number } {
    const alpha = Math.abs(state.angleOfAttack * 180 / Math.PI); // Convert to degrees
    const criticalAOA = 15; // Critical angle of attack in degrees
    const deepStallAOA = 25; // Deep stall begins
    
    if (alpha <= criticalAOA) {
      // No stall
      return { liftReduction: 1.0, dragIncrease: 1.0, pitchMoment: 0 };
    } else if (alpha <= deepStallAOA) {
      // Progressive stall
      const stallProgress = (alpha - criticalAOA) / (deepStallAOA - criticalAOA);
      const liftReduction = 1.0 - stallProgress * 0.6; // Lose up to 60% lift
      const dragIncrease = 1.0 + stallProgress * 2.0; // Drag increases significantly
      const pitchMoment = -stallProgress * 0.5; // Nose-down pitching moment
      
      return { liftReduction, dragIncrease, pitchMoment };
    } else {
      // Deep stall - very difficult to recover
      const deepStallProgress = Math.min(1.0, (alpha - deepStallAOA) / 20);
      const liftReduction = 0.4 - deepStallProgress * 0.2; // 20-40% lift remaining
      const dragIncrease = 3.0 + deepStallProgress * 2.0; // Very high drag
      const pitchMoment = -0.8 - deepStallProgress * 0.4; // Strong nose-down moment
      
      return { liftReduction, dragIncrease, pitchMoment };
    }
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
  
  // Getter methods for engine state
  getEngineState(): EngineState {
    return { ...this.engineState };
  }
  
  getActualThrottle(): number {
    return this.engineState.actualThrottle;
  }
  
  getRPM(): number {
    return this.engineState.rpm;
  }
  
  getEngineTemperature(): number {
    return this.engineState.temperature;
  }
  
  // Helper methods for flight analysis
  isStalled(state: AircraftState): boolean {
    const criticalAOA = 15 * Math.PI / 180;
    const stallEffects = this.calculateStallEffects(state);
    return Math.abs(state.angleOfAttack) > criticalAOA || 
           state.airspeed < this.config.stallSpeed * 0.9 ||
           stallEffects.liftReduction < 0.8;
  }
  
  // Damage system support
  setMaxThrust(thrust: number): void {
    this.config.maxThrust = Math.max(0, thrust);
  }
  
  // Additional methods for physics testing
  getStallSeverity(state: AircraftState): number {
    const criticalAOA = 15 * Math.PI / 180;
    const currentAOA = Math.abs(state.angleOfAttack);
    
    if (currentAOA <= criticalAOA) {
      return 0; // No stall
    }
    
    // Progressive stall (15-35 degrees)
    const progressiveStallMax = 35 * Math.PI / 180;
    if (currentAOA <= progressiveStallMax) {
      return (currentAOA - criticalAOA) / (progressiveStallMax - criticalAOA) * 0.5;
    }
    
    // Deep stall (35+ degrees) - more severe
    const deepStallProgress = Math.min(1.0, (currentAOA - progressiveStallMax) / (20 * Math.PI / 180));
    return 0.5 + deepStallProgress * 0.5; // 0.5 to 1.0
  }
  
  reset(): void {
    // Reset engine state
    this.engineState = {
      actualThrottle: 0,
      targetThrottle: 0,
      rpm: this.idleRpm,
      temperature: 20
    };
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