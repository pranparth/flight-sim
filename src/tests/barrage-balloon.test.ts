import * as THREE from 'three';
import { BarrageBalloon } from '../entities/BarrageBalloon';

// Test runner for barrage balloon functionality
export class BarrageBalloonTester {
  private testResults: { name: string; passed: boolean; message: string }[] = [];
  
  constructor() {
    console.log('🎈 Starting Barrage Balloon Tests...\n');
  }
  
  async runAllTests(): Promise<void> {
    await this.testBalloonCreation();
    await this.testBalloonSway();
    await this.testBalloonDamage();
    await this.testBalloonDestruction();
    
    this.printResults();
  }
  
  private async testBalloonCreation(): Promise<void> {
    console.log('Test 1: Balloon Creation');
    
    try {
      const position = new THREE.Vector3(100, 0, 200);
      const altitude = 500;
      const balloon = new BarrageBalloon(position, altitude);
      
      const state = balloon.getState();
      
      if (state.position.x !== 100 || state.position.z !== 200) {
        throw new Error(`Incorrect position. Expected: (100, 0, 200), Got: (${state.position.x}, ${state.position.y}, ${state.position.z})`);
      }
      
      if (state.altitude !== 500) {
        throw new Error(`Incorrect altitude. Expected: 500, Got: ${state.altitude}`);
      }
      
      if (state.health !== 50 || state.isDestroyed) {
        throw new Error(`Incorrect initial health state. Health: ${state.health}, Destroyed: ${state.isDestroyed}`);
      }
      
      console.log('  ✓ Balloon created at correct position and altitude');
      console.log('  ✓ Balloon initialized with full health');
      
      balloon.dispose();
      
      this.testResults.push({
        name: 'Balloon Creation',
        passed: true,
        message: 'Balloon created successfully with correct initial state'
      });
    } catch (error) {
      this.testResults.push({
        name: 'Balloon Creation',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  private async testBalloonSway(): Promise<void> {
    console.log('\nTest 2: Balloon Sway Motion');
    
    try {
      const balloon = new BarrageBalloon(new THREE.Vector3(0, 0, 0), 300);
      const initialX = balloon.getObject3D().position.x;
      
      // Update for 2 seconds to see sway
      for (let i = 0; i < 20; i++) {
        balloon.update(0.1);
      }
      
      const currentX = balloon.getObject3D().position.x;
      const movement = Math.abs(currentX - initialX);
      
      if (movement < 0.1) {
        throw new Error(`Balloon not swaying. Movement: ${movement}`);
      }
      
      // Check altitude remains constant
      if (balloon.getObject3D().position.y !== 300) {
        throw new Error(`Altitude changed during sway. Expected: 300, Got: ${balloon.getObject3D().position.y}`);
      }
      
      console.log(`  ✓ Balloon swaying correctly (movement: ${movement.toFixed(2)}m)`);
      console.log('  ✓ Altitude remains constant during sway');
      
      balloon.dispose();
      
      this.testResults.push({
        name: 'Balloon Sway Motion',
        passed: true,
        message: 'Balloon exhibits correct swaying behavior'
      });
    } catch (error) {
      this.testResults.push({
        name: 'Balloon Sway Motion',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  private async testBalloonDamage(): Promise<void> {
    console.log('\nTest 3: Balloon Damage System');
    
    try {
      const balloon = new BarrageBalloon(new THREE.Vector3(0, 0, 0), 400);
      
      // Apply damage
      balloon.takeDamage(20);
      let state = balloon.getState();
      
      if (state.health !== 30) {
        throw new Error(`Incorrect health after damage. Expected: 30, Got: ${state.health}`);
      }
      
      if (state.isDestroyed) {
        throw new Error('Balloon destroyed too early');
      }
      
      console.log('  ✓ Balloon takes damage correctly');
      
      // Apply lethal damage
      balloon.takeDamage(30);
      state = balloon.getState();
      
      if (state.health !== 0 || !state.isDestroyed) {
        throw new Error(`Balloon not destroyed properly. Health: ${state.health}, Destroyed: ${state.isDestroyed}`);
      }
      
      console.log('  ✓ Balloon destroyed when health reaches zero');
      
      balloon.dispose();
      
      this.testResults.push({
        name: 'Balloon Damage System',
        passed: true,
        message: 'Damage system works correctly'
      });
    } catch (error) {
      this.testResults.push({
        name: 'Balloon Damage System',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  private async testBalloonDestruction(): Promise<void> {
    console.log('\nTest 4: Balloon Destruction Animation');
    
    try {
      const balloon = new BarrageBalloon(new THREE.Vector3(0, 0, 0), 500);
      const initialY = balloon.getObject3D().position.y;
      
      // Destroy balloon
      balloon.takeDamage(100);
      
      if (!balloon.isDestroyed()) {
        throw new Error('Balloon not destroyed after lethal damage');
      }
      
      console.log('  ✓ Balloon marked as destroyed');
      
      // Update for 1 second to see falling
      for (let i = 0; i < 10; i++) {
        balloon.update(0.1);
      }
      
      const currentY = balloon.getObject3D().position.y;
      
      if (currentY >= initialY) {
        throw new Error(`Balloon not falling. Initial Y: ${initialY}, Current Y: ${currentY}`);
      }
      
      console.log(`  ✓ Balloon falling after destruction (dropped ${(initialY - currentY).toFixed(2)}m)`);
      
      // Check removal after animation
      if (!balloon.shouldRemove()) {
        console.log('  ⏳ Waiting for removal timer...');
        
        // Update for 3 more seconds
        for (let i = 0; i < 30; i++) {
          balloon.update(0.1);
        }
        
        if (!balloon.shouldRemove()) {
          throw new Error('Balloon not marked for removal after destruction animation');
        }
      }
      
      console.log('  ✓ Balloon marked for removal after animation');
      
      balloon.dispose();
      
      this.testResults.push({
        name: 'Balloon Destruction Animation',
        passed: true,
        message: 'Destruction animation and removal work correctly'
      });
    } catch (error) {
      this.testResults.push({
        name: 'Balloon Destruction Animation',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  private printResults(): void {
    console.log('\n=====================================');
    console.log('        TEST RESULTS SUMMARY         ');
    console.log('=====================================\n');
    
    let passedCount = 0;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.name}`);
      if (!result.passed) {
        console.log(`    Error: ${result.message}`);
      } else {
        passedCount++;
      }
    });
    
    console.log(`\nTotal: ${passedCount}/${this.testResults.length} tests passed`);
    
    if (passedCount === this.testResults.length) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Export function to run tests
export async function runBarrageBalloonTests(): Promise<void> {
  const tester = new BarrageBalloonTester();
  await tester.runAllTests();
}