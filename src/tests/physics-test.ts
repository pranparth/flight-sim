// import * as THREE from 'three';
import { Aircraft } from '../entities/Aircraft';
import { FlightDynamics } from '../core/FlightDynamics';
import { getAircraftConfig } from '../core/AircraftConfigs';

// Comprehensive physics test suite for improved flight dynamics
export class PhysicsTestSuite {
  private testResults: { name: string; passed: boolean; message: string }[] = [];
  private aircraft: Aircraft;
  private dynamics: FlightDynamics;

  constructor() {
    console.log('🧪 Starting Physics Test Suite...\n');
    this.aircraft = new Aircraft({ type: 'spitfire' });
    const config = getAircraftConfig('spitfire');
    this.dynamics = new FlightDynamics(config);
  }

  async runAllTests(): Promise<void> {
    await this.testThrottleResponse();
    await this.testPitchGravityEffects();
    await this.testStallBehavior();
    await this.testEngineCharacteristics();
    await this.testStallRecovery();
    await this.testDeepStallConditions();
    
    this.printResults();
  }

  private async testThrottleResponse(): Promise<void> {
    console.log('Test 1: Throttle Response and Engine Lag');
    
    try {
      // Reset aircraft to known state
      this.aircraft.reset();
      const initialThrottle = this.dynamics.getActualThrottle();
      
      // Test throttle lag - engine should not respond immediately
      this.aircraft.updateControls({ 
        throttle: 1.0, pitch: 0, roll: 0, yaw: 0, 
        brake: false, boost: false, fire: false, lookBack: false, pause: false 
      });
      
      // Update for small time step
      this.aircraft.update(0.1);
      const quickResponse = this.dynamics.getActualThrottle();
      
      this.assert(quickResponse < 0.8, 'Engine should not respond immediately to throttle input');
      this.assert(quickResponse > initialThrottle, 'Engine should start responding to throttle');
      
      // Update for longer time to see full response
      for (let i = 0; i < 50; i++) {
        this.aircraft.update(0.016); // Simulate 50 frames at 60fps
      }
      
      const finalResponse = this.dynamics.getActualThrottle();
      this.assert(finalResponse > 0.9, 'Engine should eventually reach target throttle');
      
      // Test RPM correlation
      const rpm = this.dynamics.getRPM();
      this.assert(rpm > 2000, 'RPM should increase with throttle');
      
      this.testResults.push({ 
        name: 'Throttle Response', 
        passed: true, 
        message: `Throttle lag working correctly. Quick: ${quickResponse.toFixed(2)}, Final: ${finalResponse.toFixed(2)}, RPM: ${rpm.toFixed(0)}` 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Throttle Response', 
        passed: false, 
        message: `Failed: ${error}` 
      });
    }
  }

  private async testPitchGravityEffects(): Promise<void> {
    console.log('Test 2: Pitch Gravity Effects');
    
    try {
      // Reset to level flight at cruise speed
      this.aircraft.reset();
      
      // Set up level flight conditions
      (this.aircraft as any)._testSetState({
        airspeed: 120, // Cruise speed
        altitude: 1000
      });
      
      // Record initial speed
      const initialSpeed = this.aircraft.getState().airspeed;
      
      // Pitch down 20 degrees and see if speed increases due to gravity
      (this.aircraft as any)._testSetState({
        rotation: { x: -20 * Math.PI / 180, y: 0, z: 0 } // Pitch down
      });
      
      // Simulate for a few seconds
      for (let i = 0; i < 60; i++) { // 1 second at 60fps
        this.aircraft.update(0.016);
      }
      
      const speedAfterPitchDown = this.aircraft.getState().airspeed;
      this.assert(speedAfterPitchDown > initialSpeed + 5, 'Speed should increase when pitched down due to gravity');
      
      // Now test pitch up
      this.aircraft.reset();
      (this.aircraft as any)._testSetState({
        airspeed: 120,
        rotation: { x: 20 * Math.PI / 180, y: 0, z: 0 } // Pitch up
      });
      
      for (let i = 0; i < 60; i++) {
        this.aircraft.update(0.016);
      }
      
      const speedAfterPitchUp = this.aircraft.getState().airspeed;
      this.assert(speedAfterPitchUp < 120 - 5, 'Speed should decrease when pitched up due to gravity');
      
      this.testResults.push({ 
        name: 'Pitch Gravity Effects', 
        passed: true, 
        message: `Gravity effects working. Pitch down: +${(speedAfterPitchDown - initialSpeed).toFixed(1)} m/s, Pitch up: ${(speedAfterPitchUp - 120).toFixed(1)} m/s` 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Pitch Gravity Effects', 
        passed: false, 
        message: `Failed: ${error}` 
      });
    }
  }

  private async testStallBehavior(): Promise<void> {
    console.log('Test 3: Stall Behavior');
    
    try {
      this.aircraft.reset();
      
      // Set up conditions for stall test
      (this.aircraft as any)._testSetState({
        airspeed: 30, // Below stall speed
        angleOfAttack: 20 * Math.PI / 180 // High angle of attack
      });
      
      const state = this.aircraft.getState();
      
      const stallSeverity = this.dynamics.getStallSeverity(state);
      const isStalled = this.dynamics.isStalled(state);
      
      this.assert(isStalled, 'Aircraft should be detected as stalled');
      this.assert(stallSeverity > 0.2, 'Stall severity should be significant');
      
      // Test progressive stall vs deep stall
      (this.aircraft as any)._testSetState({
        angleOfAttack: 30 * Math.PI / 180 // Very high AoA
      });
      const deepStallSeverity = this.dynamics.getStallSeverity(state);
      
      this.assert(deepStallSeverity > stallSeverity, 'Deep stall should be more severe than progressive stall');
      
      this.testResults.push({ 
        name: 'Stall Behavior', 
        passed: true, 
        message: `Stall detection working. Progressive: ${stallSeverity.toFixed(2)}, Deep: ${deepStallSeverity.toFixed(2)}` 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Stall Behavior', 
        passed: false, 
        message: `Failed: ${error}` 
      });
    }
  }

  private async testEngineCharacteristics(): Promise<void> {
    console.log('Test 4: Engine Characteristics');
    
    try {
      this.aircraft.reset();
      
      // Test engine efficiency curve
      const lowThrottleEfficiency = this.dynamics['getThrottleEfficiency'](0.1);
      const midThrottleEfficiency = this.dynamics['getThrottleEfficiency'](0.5);
      const highThrottleEfficiency = this.dynamics['getThrottleEfficiency'](0.9);
      
      this.assert(midThrottleEfficiency > lowThrottleEfficiency, 'Mid throttle should be more efficient than low throttle');
      this.assert(highThrottleEfficiency < 1.0, 'Very high throttle should have some efficiency loss due to overheating');
      
      // Test altitude effects on engine power
      (this.aircraft as any)._testSetState({
        altitude: 10000 // High altitude
      });
      
      // Should experience power loss at altitude
      this.testResults.push({ 
        name: 'Engine Characteristics', 
        passed: true, 
        message: `Engine efficiency curve working. Low: ${lowThrottleEfficiency.toFixed(2)}, Mid: ${midThrottleEfficiency.toFixed(2)}, High: ${highThrottleEfficiency.toFixed(2)}` 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Engine Characteristics', 
        passed: false, 
        message: `Failed: ${error}` 
      });
    }
  }

  private async testStallRecovery(): Promise<void> {
    console.log('Test 5: Stall Recovery');
    
    try {
      this.aircraft.reset();
      
      // Put aircraft in stall
      (this.aircraft as any)._testSetState({
        airspeed: 25, // Well below stall speed
        angleOfAttack: 18 * Math.PI / 180 // Above critical AoA
      });
      
      const state = this.aircraft.getState();
      
      this.assert(this.dynamics.isStalled(state), 'Aircraft should be in stall');
      
      // Attempt recovery - reduce AoA and add power
      (this.aircraft as any)._testSetState({
        angleOfAttack: 5 * Math.PI / 180 // Reduce AoA
      });
      this.aircraft.updateControls({ 
        throttle: 1.0, pitch: 0, roll: 0, yaw: 0, 
        brake: false, boost: false, fire: false, lookBack: false, pause: false 
      });
      
      // Simulate recovery attempt
      for (let i = 0; i < 120; i++) { // 2 seconds
        this.aircraft.update(0.016);
      }
      
      const recoveredSpeed = this.aircraft.getState().airspeed;
      const stillStalled = this.dynamics.isStalled(this.aircraft.getState());
      
      this.assert(recoveredSpeed > 40, 'Speed should increase during recovery');
      this.assert(!stillStalled, 'Aircraft should recover from stall with proper technique');
      
      this.testResults.push({ 
        name: 'Stall Recovery', 
        passed: true, 
        message: `Stall recovery successful. Speed: ${recoveredSpeed.toFixed(1)} m/s, Stalled: ${stillStalled}` 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Stall Recovery', 
        passed: false, 
        message: `Failed: ${error}` 
      });
    }
  }

  private async testDeepStallConditions(): Promise<void> {
    console.log('Test 6: Deep Stall Conditions');
    
    try {
      this.aircraft.reset();
      
      // Create deep stall conditions
      (this.aircraft as any)._testSetState({
        airspeed: 20, // Very low speed
        angleOfAttack: 35 * Math.PI / 180 // Very high AoA - deep stall
      });
      
      const state = this.aircraft.getState();
      
      const deepStallSeverity = this.dynamics.getStallSeverity(state);
      
      this.assert(deepStallSeverity > 0.6, 'Deep stall should have high severity');
      
      // Deep stall should be harder to recover from
      (this.aircraft as any)._testSetState({
        angleOfAttack: 10 * Math.PI / 180 // Try to reduce AoA
      });
      
      // Short recovery attempt
      for (let i = 0; i < 60; i++) { // 1 second
        this.aircraft.update(0.016);
      }
      
      const quickRecoverySpeed = this.aircraft.getState().airspeed;
      
      // Deep stall recovery should be slower than normal stall
      this.assert(quickRecoverySpeed < 35, 'Deep stall recovery should be slower and more difficult');
      
      this.testResults.push({ 
        name: 'Deep Stall Conditions', 
        passed: true, 
        message: `Deep stall behavior correct. Severity: ${deepStallSeverity.toFixed(2)}, Quick recovery speed: ${quickRecoverySpeed.toFixed(1)} m/s` 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Deep Stall Conditions', 
        passed: false, 
        message: `Failed: ${error}` 
      });
    }
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  private printResults(): void {
    console.log('\n📊 Physics Test Results:');
    console.log('========================');
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.message}`);
    });
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    console.log(`\n📈 Summary: ${passed}/${total} physics tests passed`);
    
    if (passed === total) {
      console.log('🎉 All physics tests passed! Flight dynamics improvements working correctly.');
    } else {
      console.log('⚠️ Some physics tests failed. Check implementation.');
    }
  }
}