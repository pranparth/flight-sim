import * as THREE from 'three';
// import { FlightDynamics } from '@core/FlightDynamics';

export interface PhysicsBody {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  mass: number;
  forces: THREE.Vector3;
  torques: THREE.Vector3;
  isDynamic: boolean;
}

export class PhysicsEngine {
  private bodies: Map<string, PhysicsBody> = new Map();
  private gravity = new THREE.Vector3(0, -9.81, 0);
  private fixedTimeStep = 1 / 60; // 60 Hz
  private accumulator = 0;
  private maxSubSteps = 3;
  
  constructor() {
    // Physics engine initialization
  }
  
  addBody(body: PhysicsBody): void {
    this.bodies.set(body.id, body);
  }
  
  removeBody(id: string): void {
    this.bodies.delete(id);
  }
  
  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }
  
  update(deltaTime: number): void {
    // Fixed timestep with interpolation
    this.accumulator += deltaTime;
    
    let subSteps = 0;
    while (this.accumulator >= this.fixedTimeStep && subSteps < this.maxSubSteps) {
      this.fixedUpdate(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      subSteps++;
    }
    
    // Interpolate positions for smooth rendering
    const alpha = this.accumulator / this.fixedTimeStep;
    this.interpolate(alpha);
  }
  
  private fixedUpdate(dt: number): void {
    // Update each physics body
    this.bodies.forEach(body => {
      if (!body.isDynamic) return;
      
      // Apply forces
      this.applyForces(body);
      
      // Integrate velocity
      const acceleration = body.forces.clone().divideScalar(body.mass);
      body.velocity.add(acceleration.multiplyScalar(dt));
      
      // Integrate position
      body.position.add(body.velocity.clone().multiplyScalar(dt));
      
      // Apply torques and update rotation
      const angularAcceleration = body.torques.clone().divideScalar(body.mass * 0.1); // Simplified moment of inertia
      body.angularVelocity.add(angularAcceleration.multiplyScalar(dt));
      
      // Apply angular velocity to rotation
      const rotationDelta = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          body.angularVelocity.x * dt,
          body.angularVelocity.y * dt,
          body.angularVelocity.z * dt
        )
      );
      body.rotation.multiply(rotationDelta);
      
      // Apply damping
      body.velocity.multiplyScalar(0.999);
      body.angularVelocity.multiplyScalar(0.98);
      
      // Reset forces for next frame
      body.forces.set(0, 0, 0);
      body.torques.set(0, 0, 0);
    });
  }
  
  private applyForces(body: PhysicsBody): void {
    // Apply gravity (if not an aircraft - aircraft handle their own lift/weight)
    if (!body.id.includes('aircraft')) {
      const weight = this.gravity.clone().multiplyScalar(body.mass);
      body.forces.add(weight);
    }
  }
  
  private interpolate(_alpha: number): void {
    // Interpolation for smooth rendering between physics steps
    // This would store previous states and blend between them
    // For now, we'll skip interpolation as it adds complexity
  }
  
  // Raycast for projectiles and collision detection
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    excludeIds: string[] = []
  ): { body: PhysicsBody; point: THREE.Vector3; distance: number } | null {
    let closest: { body: PhysicsBody; point: THREE.Vector3; distance: number } | null = null;
    let minDistance = maxDistance;
    
    this.bodies.forEach(body => {
      if (excludeIds.includes(body.id)) return;
      
      // Simple sphere collision for now
      // In a real implementation, we'd use proper mesh colliders
      const toBody = body.position.clone().sub(origin);
      const projectedDistance = toBody.dot(direction);
      
      if (projectedDistance < 0 || projectedDistance > minDistance) return;
      
      const closestPoint = origin.clone().add(direction.clone().multiplyScalar(projectedDistance));
      const distanceToBody = closestPoint.distanceTo(body.position);
      
      // Assume 5 meter radius for aircraft
      const radius = 5;
      if (distanceToBody < radius) {
        const hitPoint = closestPoint;
        const distance = projectedDistance;
        
        if (distance < minDistance) {
          minDistance = distance;
          closest = { body, point: hitPoint, distance };
        }
      }
    });
    
    return closest;
  }
  
  // Apply impulse for explosions and collisions
  applyImpulse(bodyId: string, impulse: THREE.Vector3, point?: THREE.Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || !body.isDynamic) return;
    
    // Linear impulse
    body.velocity.add(impulse.clone().divideScalar(body.mass));
    
    // Angular impulse if point is provided
    if (point) {
      const r = point.clone().sub(body.position);
      const torque = new THREE.Vector3().crossVectors(r, impulse);
      body.angularVelocity.add(torque.divideScalar(body.mass * 0.1));
    }
  }
  
  // Check ground collision
  checkGroundCollision(bodyId: string): boolean {
    const body = this.bodies.get(bodyId);
    if (!body) return false;
    
    // Simple ground plane at y = 0 (sea level)
    return body.position.y <= 0;
  }
  
  // Get physics stats for debugging
  getStats(): { bodyCount: number; avgVelocity: number } {
    let totalVelocity = 0;
    let dynamicBodies = 0;
    
    this.bodies.forEach(body => {
      if (body.isDynamic) {
        totalVelocity += body.velocity.length();
        dynamicBodies++;
      }
    });
    
    return {
      bodyCount: this.bodies.size,
      avgVelocity: dynamicBodies > 0 ? totalVelocity / dynamicBodies : 0
    };
  }
}