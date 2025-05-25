import * as THREE from 'three';
import { Entity } from './Entity';
import { createBarrageBalloonMesh } from '../utils/MeshFactory';

export interface BarrageBalloonState {
  position: THREE.Vector3;
  health: number;
  isDestroyed: boolean;
  altitude: number;
  swayPhase: number;
}

export class BarrageBalloon implements Entity {
  private mesh: THREE.Mesh;
  private group: THREE.Group;
  private state: BarrageBalloonState;
  private readonly maxHealth: number = 50;
  private readonly swayAmplitude: number = 5;
  private readonly swayFrequency: number = 0.5;
  private explosionParticles?: THREE.Points;
  private destructionTime?: number;

  constructor(position: THREE.Vector3, altitude: number = 500) {
    this.group = new THREE.Group();
    
    // Initialize state
    this.state = {
      position: position.clone(),
      health: this.maxHealth,
      isDestroyed: false,
      altitude: altitude,
      swayPhase: Math.random() * Math.PI * 2
    };

    // Create balloon mesh
    this.mesh = createBarrageBalloonMesh();
    this.group.add(this.mesh);
    
    // Set initial position
    this.group.position.copy(position);
    this.group.position.y = altitude;
  }

  public setMesh(mesh: THREE.Mesh): void {
    if (this.mesh.parent) {
      this.group.remove(this.mesh);
    }
    this.mesh = mesh;
    this.group.add(this.mesh);
  }

  public update(deltaTime: number): void {
    if (this.state.isDestroyed) {
      this.updateDestruction(deltaTime);
      return;
    }

    // Gentle swaying motion
    this.state.swayPhase += deltaTime * this.swayFrequency;
    const swayX = Math.sin(this.state.swayPhase) * this.swayAmplitude;
    const swayZ = Math.cos(this.state.swayPhase * 0.7) * this.swayAmplitude * 0.5;
    
    this.group.position.x = this.state.position.x + swayX;
    this.group.position.z = this.state.position.z + swayZ;
    
    // Slight rotation for realism
    this.mesh.rotation.y = Math.sin(this.state.swayPhase * 0.3) * 0.1;
    this.mesh.rotation.z = Math.sin(this.state.swayPhase * 0.5) * 0.05;
  }

  private updateDestruction(deltaTime: number): void {
    if (!this.destructionTime) {
      this.destructionTime = 0;
      this.createExplosionEffect();
    }

    this.destructionTime += deltaTime;

    // Animate destruction
    if (this.explosionParticles) {
      const positions = this.explosionParticles.geometry.attributes.position.array as Float32Array;
      const velocities = (this.explosionParticles.geometry as any).velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * deltaTime * 50;
        positions[i + 1] += velocities[i + 1] * deltaTime * 50 - 9.8 * deltaTime * this.destructionTime;
        positions[i + 2] += velocities[i + 2] * deltaTime * 50;
      }
      
      this.explosionParticles.geometry.attributes.position.needsUpdate = true;
      if (this.explosionParticles.material instanceof THREE.PointsMaterial) {
        this.explosionParticles.material.opacity = Math.max(0, 1 - this.destructionTime / 2);
      }
    }

    // Balloon deflation and falling
    this.mesh.scale.multiplyScalar(0.95);
    this.group.position.y -= deltaTime * 100 * this.destructionTime;
    this.mesh.rotation.x += deltaTime * 2;
    this.mesh.rotation.z += deltaTime * 3;
  }

  private createExplosionEffect(): void {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 10;
      
      velocities[i] = (Math.random() - 0.5) * 2;
      velocities[i + 1] = Math.random() * 2;
      velocities[i + 2] = (Math.random() - 0.5) * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (geometry as any).velocities = velocities;
    
    const material = new THREE.PointsMaterial({
      color: 0xff6b00,
      size: 3,
      transparent: true,
      opacity: 1
    });
    
    this.explosionParticles = new THREE.Points(geometry, material);
    this.group.add(this.explosionParticles);
  }

  public takeDamage(damage: number): void {
    if (this.state.isDestroyed) return;
    
    this.state.health -= damage;
    
    if (this.state.health <= 0) {
      this.state.isDestroyed = true;
      this.state.health = 0;
    }
  }

  public getObject3D(): THREE.Object3D {
    return this.group;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.mesh);
    return box;
  }

  public getState(): BarrageBalloonState {
    return { ...this.state };
  }

  public isDestroyed(): boolean {
    return this.state.isDestroyed;
  }

  public shouldRemove(): boolean {
    return this.state.isDestroyed && this.destructionTime !== undefined && this.destructionTime > 3;
  }

  public dispose(): void {
    if (this.explosionParticles) {
      this.explosionParticles.geometry.dispose();
      (this.explosionParticles.material as THREE.Material).dispose();
    }
    this.mesh.geometry?.dispose();
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
  }
}