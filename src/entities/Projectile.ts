import * as THREE from 'three';

export interface ProjectileConfig {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  ownerId: string;
  maxRange: number;
  isTracer: boolean;
  projectileType: 'bullet' | 'cannon' | 'rocket';
}

export class Projectile {
  private mesh: THREE.Mesh;
  private velocity: THREE.Vector3;
  private damage: number;
  private ownerId: string;
  private maxRange: number;
  private distanceTraveled: number;
  private lastPosition: THREE.Vector3;
  private isTracer: boolean;
  private projectileType: 'bullet' | 'cannon' | 'rocket';
  private active: boolean;
  private trail?: THREE.Line;
  
  constructor() {
    // Create projectile mesh - will be initialized later from pool
    const geometry = new THREE.SphereGeometry(0.1, 4, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
    
    this.velocity = new THREE.Vector3();
    this.lastPosition = new THREE.Vector3();
    this.damage = 0;
    this.ownerId = '';
    this.maxRange = 0;
    this.distanceTraveled = 0;
    this.isTracer = false;
    this.projectileType = 'bullet';
    this.active = false;
  }
  
  init(config: ProjectileConfig): void {
    this.mesh.position.copy(config.position);
    this.lastPosition.copy(config.position);
    this.velocity.copy(config.velocity);
    this.damage = config.damage;
    this.ownerId = config.ownerId;
    this.maxRange = config.maxRange;
    this.isTracer = config.isTracer;
    this.projectileType = config.projectileType;
    this.distanceTraveled = 0;
    this.active = true;
    this.mesh.visible = true;
    
    // Update visual based on type
    this.updateVisual();
    
    // Create tracer trail if needed
    if (this.isTracer) {
      this.createTracerTrail();
    }
  }
  
  private updateVisual(): void {
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    
    switch (this.projectileType) {
      case 'bullet':
        material.color.setHex(0xffff00);
        this.mesh.scale.set(1, 1, 1);
        break;
      case 'cannon':
        material.color.setHex(0xff8800);
        this.mesh.scale.set(1.5, 1.5, 1.5);
        break;
      case 'rocket':
        material.color.setHex(0xff0000);
        this.mesh.scale.set(2, 2, 2);
        break;
    }
  }
  
  private createTracerTrail(): void {
    const points = [
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -2)
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.projectileType === 'bullet' ? 0xffff88 : 0xff8844,
      opacity: 0.6,
      transparent: true,
      linewidth: 2,
    });
    
    this.trail = new THREE.Line(geometry, material);
    this.mesh.add(this.trail);
  }
  
  update(deltaTime: number): void {
    if (!this.active) return;
    
    // Store last position for collision detection
    this.lastPosition.copy(this.mesh.position);
    
    // Apply velocity
    const displacement = this.velocity.clone().multiplyScalar(deltaTime);
    this.mesh.position.add(displacement);
    
    // Apply gravity for non-bullet projectiles
    if (this.projectileType !== 'bullet') {
      this.velocity.y -= 9.81 * deltaTime;
    }
    
    // Update distance traveled
    this.distanceTraveled += displacement.length();
    
    // Orient projectile to velocity direction
    if (this.velocity.length() > 0) {
      this.mesh.lookAt(
        this.mesh.position.clone().add(this.velocity)
      );
    }
    
    // Update trail if exists
    if (this.trail) {
      const positions = this.trail.geometry.attributes.position;
      positions.setXYZ(0, 0, 0, 0);
      positions.setXYZ(1, 0, 0, -Math.min(this.velocity.length() * 0.05, 5));
      positions.needsUpdate = true;
    }
  }
  
  deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
    if (this.trail) {
      this.trail.visible = false;
    }
  }
  
  // Getters
  getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }
  
  getLastPosition(): THREE.Vector3 {
    return this.lastPosition.clone();
  }
  
  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }
  
  getDamage(): number {
    return this.damage;
  }
  
  getOwnerId(): string {
    return this.ownerId;
  }
  
  getDistanceTraveled(): number {
    return this.distanceTraveled;
  }
  
  getMaxRange(): number {
    return this.maxRange;
  }
  
  isActive(): boolean {
    return this.active;
  }
  
  getProjectileType(): string {
    return this.projectileType;
  }
}

// Projectile pool for performance
export class ProjectilePool {
  private pool: Projectile[] = [];
  private activeProjectiles: Set<Projectile> = new Set();
  private poolSize: number;
  private scene: THREE.Scene;
  
  constructor(scene: THREE.Scene, poolSize: number = 500) {
    this.scene = scene;
    this.poolSize = poolSize;
    this.initializePool();
  }
  
  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const projectile = new Projectile();
      this.pool.push(projectile);
      this.scene.add(projectile.getMesh());
    }
  }
  
  acquire(): Projectile | null {
    const projectile = this.pool.pop();
    if (projectile) {
      this.activeProjectiles.add(projectile);
      return projectile;
    }
    return null;
  }
  
  release(projectile: Projectile): void {
    projectile.deactivate();
    this.activeProjectiles.delete(projectile);
    this.pool.push(projectile);
  }
  
  getActiveProjectiles(): Set<Projectile> {
    return this.activeProjectiles;
  }
  
  releaseAll(): void {
    this.activeProjectiles.forEach(projectile => {
      this.release(projectile);
    });
  }
}