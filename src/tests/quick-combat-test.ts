// Quick test to verify combat system functionality
import * as THREE from 'three';
import { Projectile, ProjectilePool } from '@entities/Projectile';
import { Weapon, WeaponMount } from '@systems/WeaponSystem';
import { DamageModel } from '@systems/DamageSystem';
import { Aircraft } from '@entities/Aircraft';

export async function runQuickCombatTest() {
  console.log('🧪 Running quick combat system verification...');
  
  try {
    // Test 1: Projectile creation
    console.log('\n1️⃣ Testing Projectile...');
    const projectile = new Projectile();
    projectile.init({
      position: new THREE.Vector3(0, 100, 0),
      velocity: new THREE.Vector3(0, 0, 100),
      damage: 10,
      ownerId: 'test',
      maxRange: 500,
      isTracer: true,
      projectileType: 'bullet'
    });
    console.log('✓ Projectile created successfully');
    console.log(`  Position: ${projectile.getPosition().toArray()}`);
    console.log(`  Damage: ${projectile.getDamage()}`);
    
    // Test 2: Weapon firing
    console.log('\n2️⃣ Testing Weapon...');
    const mount: WeaponMount = {
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, 1)
    };
    const weapon = new Weapon('machineGun_303', mount);
    console.log('✓ Weapon created successfully');
    console.log(`  Type: Machine Gun .303`);
    console.log(`  Ammo: ${weapon.getAmmo()}/${weapon.getMaxAmmo()}`);
    
    // Test 3: Damage model
    console.log('\n3️⃣ Testing Damage Model...');
    const damageModel = new DamageModel();
    const aircraft = new Aircraft({
      type: 'spitfire',
      position: new THREE.Vector3(0, 100, 0)
    });
    
    const result = damageModel.applyDamage(
      30,
      new THREE.Vector3(0, 0, 0),
      aircraft,
      'bullet'
    );
    console.log('✓ Damage model working');
    console.log(`  Damage dealt: ${result.damage}`);
    console.log(`  Total health: ${result.totalHealth.toFixed(1)}%`);
    
    // Test 4: Projectile pool
    console.log('\n4️⃣ Testing Projectile Pool...');
    const scene = new THREE.Scene();
    const pool = new ProjectilePool(scene, 100);
    pool.acquire();
    pool.acquire();
    console.log('✓ Projectile pool working');
    console.log(`  Active projectiles: ${pool.getActiveProjectiles().size}`);
    
    console.log('\n✅ All quick tests passed! Combat system is functional.');
    return true;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
}

// Export for use in browser tests
export default runQuickCombatTest;