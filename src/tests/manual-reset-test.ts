import * as THREE from 'three';
import { Aircraft } from '../entities/Aircraft';

// Manual test runner for auto-reset functionality
export class ResetTester {
  private aircraft: Aircraft;
  private testResults: { name: string; passed: boolean; message: string }[] = [];
  
  constructor() {
    console.log('🧪 Starting Aircraft Auto-Reset Tests...\n');
    this.aircraft = new Aircraft({ type: 'spitfire' });
  }
  
  async runAllTests(): Promise<void> {
    await this.testCrashAutoReset();
    await this.testStuckDetection();
    await this.testBoundaryReset();
    await this.testManualResetCancelsAuto();
    
    this.printResults();
  }
  
  private async testCrashAutoReset(): Promise<void> {
    console.log('Test 1: Crash Auto-Reset');
    
    try {
      // Setup initial state
      // const _initialHealth = this.aircraft.getState().health;
      
      // Simulate crash by setting position below ground
      (this.aircraft as any)._testSetState({
        position: new THREE.Vector3(0, -10, 0),
        altitude: -10,
        velocity: new THREE.Vector3(0, -50, 100),
        health: 100
      });
      
      // Trigger collision check
      (this.aircraft as any)._testCheckCollisions();
      
      // Check crash occurred
      const crashedHealth = this.aircraft.getState().health;
      const crashedPosition = this.aircraft.getState().position.y;
      
      if (crashedHealth !== 0 || crashedPosition !== 0) {
        throw new Error(`Crash not detected properly. Health: ${crashedHealth}, Y: ${crashedPosition}`);
      }
      
      console.log('  ✓ Aircraft crashed successfully');
      console.log('  ⏳ Waiting 2.5 seconds for auto-reset...');
      
      // Wait for auto-reset
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Check if reset occurred
      const resetHealth = this.aircraft.getState().health;
      const resetPosition = this.aircraft.getState().position.y;
      
      if (resetHealth === 100 && resetPosition === 500) {
        this.testResults.push({
          name: 'Crash Auto-Reset',
          passed: true,
          message: 'Aircraft auto-reset after crash'
        });
        console.log('  ✅ Auto-reset successful!\n');
      } else {
        throw new Error(`Auto-reset failed. Health: ${resetHealth}, Y: ${resetPosition}`);
      }
    } catch (error) {
      this.testResults.push({
        name: 'Crash Auto-Reset',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`  ❌ Test failed: ${error}\n`);
    }
  }
  
  private async testStuckDetection(): Promise<void> {
    console.log('Test 2: Stuck Detection');
    
    try {
      // Reset aircraft first
      this.aircraft.reset();
      
      // Simulate stuck condition
      (this.aircraft as any)._testSetState({
        position: new THREE.Vector3(0, 10, 0),
        altitude: 10,
        airspeed: 5,
        velocity: new THREE.Vector3(0, 0, 5),
        health: 100
      });
      
      // const _beforeY = this.aircraft.getState().position.y;
      
      // Trigger collision check
      (this.aircraft as any)._testCheckCollisions();
      
      // Should reset immediately
      const afterY = this.aircraft.getState().position.y;
      const afterSpeed = this.aircraft.getState().airspeed;
      
      if (afterY === 500 && afterSpeed > 50) {
        this.testResults.push({
          name: 'Stuck Detection',
          passed: true,
          message: 'Aircraft reset when stuck'
        });
        console.log('  ✅ Stuck detection working!\n');
      } else {
        throw new Error(`Stuck reset failed. Y: ${afterY}, Speed: ${afterSpeed}`);
      }
    } catch (error) {
      this.testResults.push({
        name: 'Stuck Detection',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`  ❌ Test failed: ${error}\n`);
    }
  }
  
  private async testBoundaryReset(): Promise<void> {
    console.log('Test 3: Boundary Reset');
    
    try {
      // Reset aircraft first
      this.aircraft.reset();
      
      // Test 1: Out of bounds with low speed (should reset)
      (this.aircraft as any)._testSetState({
        position: new THREE.Vector3(6000, 100, 0),
        airspeed: 30,
        health: 100
      });
      
      // Trigger collision check
      (this.aircraft as any)._testCheckCollisions();
      
      const resetX = this.aircraft.getState().position.x;
      
      if (resetX !== 0) {
        throw new Error(`Boundary reset failed with low speed. X: ${resetX}`);
      }
      
      console.log('  ✓ Low speed boundary reset works');
      
      // Test 2: Out of bounds with high speed (should turn back)
      (this.aircraft as any)._testSetState({
        position: new THREE.Vector3(6000, 100, 0),
        rotation: new THREE.Euler(0, 0, 0),
        airspeed: 100,
        health: 100
      });
      
      const beforeRotation = this.aircraft.getState().rotation.y;
      
      // Trigger collision check
      (this.aircraft as any)._testCheckCollisions();
      
      const afterX = this.aircraft.getState().position.x;
      const afterRotation = this.aircraft.getState().rotation.y;
      
      if (afterX === 0) {
        throw new Error('Should not reset with high speed at boundary');
      }
      
      if (afterRotation === beforeRotation) {
        throw new Error('Should turn back when at boundary with high speed');
      }
      
      this.testResults.push({
        name: 'Boundary Reset',
        passed: true,
        message: 'Boundary detection working correctly'
      });
      console.log('  ✓ High speed boundary turn works');
      console.log('  ✅ Boundary reset tests passed!\n');
    } catch (error) {
      this.testResults.push({
        name: 'Boundary Reset',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`  ❌ Test failed: ${error}\n`);
    }
  }
  
  private async testManualResetCancelsAuto(): Promise<void> {
    console.log('Test 4: Manual Reset Cancels Auto');
    
    try {
      // Reset aircraft first
      this.aircraft.reset();
      
      // Crash the aircraft
      (this.aircraft as any)._testSetState({
        position: new THREE.Vector3(0, -10, 0),
        altitude: -10,
        health: 100
      });
      
      // Trigger collision check to detect crash
      (this.aircraft as any)._testCheckCollisions();
      
      console.log('  ✓ Aircraft crashed');
      console.log('  ⏳ Waiting 1 second then manual reset...');
      
      // Wait 1 second then manual reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Manual reset
      this.aircraft.reset();
      // const _afterManualReset = this.aircraft.getState().health;
      
      console.log('  ✓ Manual reset performed');
      console.log('  ⏳ Waiting 2 more seconds to ensure no double reset...');
      
      // Store position after manual reset
      const positionAfterManual = { ...this.aircraft.getState().position };
      
      // Wait 2 more seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check position hasn't changed (no second reset)
      const finalPosition = this.aircraft.getState().position;
      
      if (finalPosition.x === positionAfterManual.x && 
          finalPosition.y === positionAfterManual.y && 
          finalPosition.z === positionAfterManual.z) {
        this.testResults.push({
          name: 'Manual Reset Cancels Auto',
          passed: true,
          message: 'Auto-reset properly cancelled by manual reset'
        });
        console.log('  ✅ No double reset occurred!\n');
      } else {
        throw new Error('Double reset detected');
      }
    } catch (error) {
      this.testResults.push({
        name: 'Manual Reset Cancels Auto',
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`  ❌ Test failed: ${error}\n`);
    }
  }
  
  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    
    this.testResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.message}`);
      if (result.passed) passed++;
      else failed++;
    });
    
    console.log('\n------------------------');
    console.log(`Total: ${passed + failed} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  }
}

// Note: Removed auto-run check as __filename is not available in browser environment
// Tests should be run explicitly via ResetTester class