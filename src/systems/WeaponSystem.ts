import * as THREE from 'three';
import { Projectile, ProjectilePool } from '@entities/Projectile';

export interface WeaponStats {
  damage: number;
  rateOfFire: number;      // rounds per second
  muzzleVelocity: number;   // m/s
  range: number;            // effective range in meters
  ammunition: number;       // total rounds
  spread: number;           // accuracy cone in radians
  tracerInterval: number;   // tracer every N rounds
  weaponType: 'machinegun' | 'cannon' | 'rocket';
}

export interface WeaponMount {
  position: THREE.Vector3;  // Local position relative to aircraft
  direction: THREE.Vector3; // Local firing direction
}

// Weapon configurations
export const WEAPON_CONFIGS: Record<string, WeaponStats> = {
  // Machine guns - high ROF, low damage
  machineGun_303: {
    damage: 10,
    rateOfFire: 15,
    muzzleVelocity: 750,
    range: 400,
    ammunition: 500,
    spread: 0.02,
    tracerInterval: 5,
    weaponType: 'machinegun'
  },
  
  // Cannons - low ROF, high damage
  cannon_20mm: {
    damage: 40,
    rateOfFire: 4,
    muzzleVelocity: 850,
    range: 600,
    ammunition: 120,
    spread: 0.015,
    tracerInterval: 3,
    weaponType: 'cannon'
  },
  
  // Heavy cannons
  cannon_37mm: {
    damage: 80,
    rateOfFire: 2,
    muzzleVelocity: 900,
    range: 800,
    ammunition: 60,
    spread: 0.01,
    tracerInterval: 1,
    weaponType: 'cannon'
  },
  
  // Rockets - unguided projectiles
  rocket_HVAR: {
    damage: 150,
    rateOfFire: 0.5, // salvo fire
    muzzleVelocity: 420,
    range: 1200,
    ammunition: 8,
    spread: 0.05,
    tracerInterval: 1,
    weaponType: 'rocket'
  }
};

export class Weapon {
  protected stats: WeaponStats;
  protected mountPoint: WeaponMount;
  protected currentAmmo: number;
  protected lastFireTime: number = 0;
  protected roundsFired: number = 0;
  protected isFiring: boolean = false;
  
  constructor(weaponType: string, mountPoint: WeaponMount) {
    const config = WEAPON_CONFIGS[weaponType];
    if (!config) {
      throw new Error(`Unknown weapon type: ${weaponType}`);
    }
    
    this.stats = { ...config };
    this.mountPoint = mountPoint;
    this.currentAmmo = this.stats.ammunition;
  }
  
  canFire(currentTime: number): boolean {
    const timeSinceLastShot = currentTime - this.lastFireTime;
    const fireInterval = 1000 / this.stats.rateOfFire; // milliseconds
    
    return (
      this.currentAmmo > 0 &&
      timeSinceLastShot >= fireInterval &&
      this.isFiring
    );
  }
  
  startFiring(): void {
    this.isFiring = true;
  }
  
  stopFiring(): void {
    this.isFiring = false;
  }
  
  fire(
    currentTime: number,
    worldPosition: THREE.Vector3,
    worldDirection: THREE.Vector3,
    ownerId: string,
    convergencePoint?: THREE.Vector3
  ): ProjectileConfig | null {
    if (!this.canFire(currentTime)) {
      return null;
    }
    
    this.lastFireTime = currentTime;
    this.currentAmmo--;
    this.roundsFired++;
    
    // Apply weapon spread
    const spreadDirection = this.applySpread(worldDirection);
    
    // Adjust for convergence if provided
    if (convergencePoint) {
      const toConvergence = convergencePoint.clone().sub(worldPosition).normalize();
      spreadDirection.lerp(toConvergence, 0.5); // Partial convergence
      spreadDirection.normalize();
    }
    
    // Determine if this should be a tracer
    const isTracer = this.roundsFired % this.stats.tracerInterval === 0;
    
    return {
      position: worldPosition.clone(),
      velocity: spreadDirection.multiplyScalar(this.stats.muzzleVelocity),
      damage: this.stats.damage,
      ownerId: ownerId,
      maxRange: this.stats.range,
      isTracer: isTracer,
      projectileType: this.getProjectileType()
    };
  }
  
  private applySpread(direction: THREE.Vector3): THREE.Vector3 {
    const spread = this.stats.spread;
    const result = direction.clone();
    
    // Create random spread within cone
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * spread;
    
    // Create perpendicular vectors
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    
    if (Math.abs(direction.y) < 0.99) {
      right.crossVectors(direction, new THREE.Vector3(0, 1, 0));
    } else {
      right.crossVectors(direction, new THREE.Vector3(1, 0, 0));
    }
    right.normalize();
    
    up.crossVectors(right, direction);
    up.normalize();
    
    // Apply spread
    result.applyAxisAngle(right, Math.sin(theta) * phi);
    result.applyAxisAngle(up, Math.cos(theta) * phi);
    
    return result.normalize();
  }
  
  private getProjectileType(): 'bullet' | 'cannon' | 'rocket' {
    switch (this.stats.weaponType) {
      case 'machinegun':
        return 'bullet';
      case 'cannon':
        return 'cannon';
      case 'rocket':
        return 'rocket';
      default:
        return 'bullet';
    }
  }
  
  reload(): void {
    this.currentAmmo = this.stats.ammunition;
    this.roundsFired = 0;
  }
  
  // Getters
  getAmmo(): number {
    return this.currentAmmo;
  }
  
  getMaxAmmo(): number {
    return this.stats.ammunition;
  }
  
  getDamage(): number {
    return this.stats.damage;
  }
  
  getMountPoint(): WeaponMount {
    return this.mountPoint;
  }
  
  getStats(): WeaponStats {
    return { ...this.stats };
  }
}

interface ProjectileConfig {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  ownerId: string;
  maxRange: number;
  isTracer: boolean;
  projectileType: 'bullet' | 'cannon' | 'rocket';
}

export class WeaponManager {
  private weapons: Map<string, Weapon[]> = new Map();
  private projectilePool: ProjectilePool;
  private activeProjectiles: Set<Projectile> = new Set();
  
  constructor(scene: THREE.Scene) {
    this.projectilePool = new ProjectilePool(scene, 1000);
  }
  
  addWeaponGroup(aircraftId: string, weapons: Weapon[]): void {
    this.weapons.set(aircraftId, weapons);
  }
  
  removeWeaponGroup(aircraftId: string): void {
    this.weapons.delete(aircraftId);
  }
  
  startFiring(aircraftId: string): void {
    const weapons = this.weapons.get(aircraftId);
    if (weapons) {
      weapons.forEach(weapon => weapon.startFiring());
    }
  }
  
  stopFiring(aircraftId: string): void {
    const weapons = this.weapons.get(aircraftId);
    if (weapons) {
      weapons.forEach(weapon => weapon.stopFiring());
    }
  }
  
  fireWeapons(
    aircraftId: string,
    aircraftTransform: THREE.Matrix4,
    currentTime: number,
    convergenceDistance: number = 300
  ): void {
    const weapons = this.weapons.get(aircraftId);
    if (!weapons) return;
    
    // Calculate convergence point
    const forward = new THREE.Vector3(0, 0, 1);
    forward.transformDirection(aircraftTransform);
    const aircraftPosition = new THREE.Vector3();
    aircraftPosition.setFromMatrixPosition(aircraftTransform);
    const convergencePoint = aircraftPosition.clone().add(
      forward.multiplyScalar(convergenceDistance)
    );
    
    weapons.forEach(weapon => {
      // Transform weapon mount to world space
      const worldPosition = weapon.getMountPoint().position.clone();
      worldPosition.applyMatrix4(aircraftTransform);
      
      const worldDirection = weapon.getMountPoint().direction.clone();
      worldDirection.transformDirection(aircraftTransform);
      
      const projectileConfig = weapon.fire(
        currentTime,
        worldPosition,
        worldDirection,
        aircraftId,
        convergencePoint
      );
      
      if (projectileConfig) {
        const projectile = this.projectilePool.acquire();
        if (projectile) {
          projectile.init(projectileConfig);
          this.activeProjectiles.add(projectile);
        }
      }
    });
  }
  
  update(deltaTime: number, targetables: THREE.Object3D[]): HitResult[] {
    const hits: HitResult[] = [];
    const projectilesToRemove: Projectile[] = [];
    
    this.activeProjectiles.forEach(projectile => {
      // Update projectile physics
      projectile.update(deltaTime);
      
      // Check if out of range
      if (projectile.getDistanceTraveled() > projectile.getMaxRange()) {
        projectilesToRemove.push(projectile);
        return;
      }
      
      // Check for collisions
      const hit = this.checkCollision(projectile, targetables, deltaTime);
      if (hit) {
        hits.push({
          projectile: projectile,
          target: hit.object,
          hitPoint: hit.point,
          damage: projectile.getDamage()
        });
        projectilesToRemove.push(projectile);
      }
    });
    
    // Remove dead projectiles
    projectilesToRemove.forEach(projectile => {
      this.activeProjectiles.delete(projectile);
      this.projectilePool.release(projectile);
    });
    
    return hits;
  }
  
  private checkCollision(
    projectile: Projectile,
    targetables: THREE.Object3D[],
    deltaTime: number
  ): THREE.Intersection | null {
    const ray = new THREE.Raycaster(
      projectile.getLastPosition(),
      projectile.getVelocity().normalize(),
      0,
      projectile.getVelocity().length() * deltaTime
    );
    
    // Filter out the owner's aircraft
    const validTargets = targetables.filter(target => {
      return target.userData.aircraftId !== projectile.getOwnerId();
    });
    
    const intersects = ray.intersectObjects(validTargets, true);
    return intersects.length > 0 ? intersects[0] : null;
  }
  
  getWeaponsStatus(aircraftId: string): WeaponStatus[] {
    const weapons = this.weapons.get(aircraftId);
    if (!weapons) return [];
    
    return weapons.map((weapon, index) => ({
      index: index,
      ammo: weapon.getAmmo(),
      maxAmmo: weapon.getMaxAmmo(),
      type: weapon.getStats().weaponType
    }));
  }
}

export interface HitResult {
  projectile: Projectile;
  target: THREE.Object3D;
  hitPoint: THREE.Vector3;
  damage: number;
}

export interface WeaponStatus {
  index: number;
  ammo: number;
  maxAmmo: number;
  type: string;
}