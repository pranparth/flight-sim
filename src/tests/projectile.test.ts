import * as THREE from 'three';
import { Projectile, ProjectilePool, ProjectileConfig } from '@entities/Projectile';

export const projectileTests = {
  name: 'Projectile Tests',
  tests: [
    {
      name: 'Projectile initialization',
      async test() {
        const projectile = new Projectile();
        
        const config: ProjectileConfig = {
          position: new THREE.Vector3(10, 20, 30),
          velocity: new THREE.Vector3(0, 0, 100),
          damage: 50,
          ownerId: 'player',
          maxRange: 500,
          isTracer: true,
          projectileType: 'cannon'
        };
        
        projectile.init(config);
        
        // Check position
        const pos = projectile.getPosition();
        console.assert(pos.x === 10, 'X position should be 10');
        console.assert(pos.y === 20, 'Y position should be 20');
        console.assert(pos.z === 30, 'Z position should be 30');
        
        // Check other properties
        console.assert(projectile.getDamage() === 50, 'Damage should be 50');
        console.assert(projectile.getOwnerId() === 'player', 'Owner should be player');
        console.assert(projectile.getMaxRange() === 500, 'Max range should be 500');
        console.assert(projectile.isActive() === true, 'Should be active after init');
        console.assert(projectile.getProjectileType() === 'cannon', 'Type should be cannon');
        
        console.log('✓ Projectile initializes correctly');
      }
    },
    
    {
      name: 'Projectile movement',
      async test() {
        const projectile = new Projectile();
        
        const config: ProjectileConfig = {
          position: new THREE.Vector3(0, 100, 0),
          velocity: new THREE.Vector3(0, 0, 200), // 200 m/s forward
          damage: 10,
          ownerId: 'test',
          maxRange: 1000,
          isTracer: false,
          projectileType: 'bullet'
        };
        
        projectile.init(config);
        const initialPos = projectile.getPosition().clone();
        
        // Update for 0.1 seconds
        projectile.update(0.1);
        
        const newPos = projectile.getPosition();
        const expectedZ = initialPos.z + 20; // 200 m/s * 0.1s = 20m
        
        console.assert(Math.abs(newPos.z - expectedZ) < 0.01, 
          `Z position should be ~${expectedZ}, got ${newPos.z}`);
        console.assert(newPos.x === initialPos.x, 'X should not change');
        console.assert(newPos.y === initialPos.y, 'Y should not change for bullets');
        
        // Check distance traveled
        console.assert(Math.abs(projectile.getDistanceTraveled() - 20) < 0.01,
          'Distance traveled should be ~20m');
        
        console.log('✓ Projectile moves correctly');
      }
    },
    
    {
      name: 'Projectile gravity (non-bullet)',
      async test() {
        const projectile = new Projectile();
        
        const config: ProjectileConfig = {
          position: new THREE.Vector3(0, 100, 0),
          velocity: new THREE.Vector3(0, 0, 100),
          damage: 150,
          ownerId: 'test',
          maxRange: 1000,
          isTracer: true,
          projectileType: 'rocket'
        };
        
        projectile.init(config);
        const initialY = projectile.getPosition().y;
        
        // Update for 0.5 seconds
        projectile.update(0.5);
        
        const newPos = projectile.getPosition();
        // With gravity: y = y0 + v0*t - 0.5*g*t^2
        // But velocity is also affected: v_y = v0_y - g*t
        // Since initial v_y = 0, after 0.5s: v_y = -9.81 * 0.5 = -4.905
        // Average velocity over 0.5s = -2.4525
        // Distance = -2.4525 * 0.5 = -1.22625
        
        console.assert(newPos.y < initialY, 'Y position should decrease due to gravity');
        console.assert(Math.abs(newPos.y - (initialY - 1.226)) < 0.1,
          `Y should be ~${initialY - 1.226}, got ${newPos.y}`);
        
        console.log('✓ Gravity affects non-bullet projectiles');
      }
    },
    
    {
      name: 'Projectile deactivation',
      async test() {
        const projectile = new Projectile();
        
        const config: ProjectileConfig = {
          position: new THREE.Vector3(0, 0, 0),
          velocity: new THREE.Vector3(0, 0, 100),
          damage: 10,
          ownerId: 'test',
          maxRange: 50, // Short range
          isTracer: false,
          projectileType: 'bullet'
        };
        
        projectile.init(config);
        console.assert(projectile.isActive() === true, 'Should be active initially');
        console.assert(projectile.getMesh().visible === true, 'Mesh should be visible');
        
        // Deactivate
        projectile.deactivate();
        
        console.assert(projectile.isActive() === false, 'Should be inactive after deactivation');
        console.assert(projectile.getMesh().visible === false, 'Mesh should be hidden');
        
        console.log('✓ Projectile deactivates correctly');
      }
    },
    
    {
      name: 'ProjectilePool management',
      async test() {
        const scene = new THREE.Scene();
        const poolSize = 10;
        const pool = new ProjectilePool(scene, poolSize);
        
        // Acquire projectiles
        const projectiles: (Projectile | null)[] = [];
        for (let i = 0; i < 5; i++) {
          const p = pool.acquire();
          console.assert(p !== null, `Should acquire projectile ${i}`);
          projectiles.push(p);
        }
        
        console.assert(pool.getActiveProjectiles().size === 5, 
          'Should have 5 active projectiles');
        
        // Release one
        if (projectiles[0]) {
          pool.release(projectiles[0]);
          console.assert(pool.getActiveProjectiles().size === 4,
            'Should have 4 active projectiles after release');
        }
        
        // Acquire again
        const reacquired = pool.acquire();
        console.assert(reacquired !== null, 'Should reacquire projectile');
        console.assert(pool.getActiveProjectiles().size === 5,
          'Should have 5 active projectiles again');
        
        // Release all
        pool.releaseAll();
        console.assert(pool.getActiveProjectiles().size === 0,
          'Should have no active projectiles after releaseAll');
        
        console.log('✓ ProjectilePool manages projectiles correctly');
      }
    }
  ]
};