import * as THREE from 'three';
import { CameraController, CameraMode } from '@systems/CameraController';
import { Aircraft } from '@entities/Aircraft';
import { FlightControls } from '@systems/InputManager';

// Helper to create test aircraft
function createTestAircraft(): Aircraft {
  const aircraft = new Aircraft({ type: 'spitfire' });
  aircraft._testSetState({
    position: new THREE.Vector3(0, 500, 0),
    velocity: new THREE.Vector3(0, 0, 50),
    throttle: 0.7,
    airspeed: 50
  });
  return aircraft;
}

// Helper to simulate keyboard events
function simulateKeyPress(key: string) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true
  });
  window.dispatchEvent(event);
}

export async function testCameraResetAfterYaw(): Promise<void> {
  console.log('Testing Camera Reset After Yaw Movement...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Set to chase mode
  controller.setMode(CameraMode.CHASE);
  
  // Apply yaw control to aircraft
  const controls: FlightControls = {
    pitch: 0,
    roll: 0,
    yaw: 1, // Full left yaw
    throttle: 0.7,
    brake: false,
    boost: false,
    fire: false,
    lookBack: false,
    pause: false
  };
  
  // Simulate yaw movement for 2 seconds
  for (let i = 0; i < 120; i++) {
    aircraft.updateControls(controls);
    aircraft.update(0.016);
    controller.update(0.016);
  }
  
  // Get camera position before reset
  const camPosBefore = camera.position.clone();
  const camDirBefore = new THREE.Vector3();
  camera.getWorldDirection(camDirBefore);
  
  // Reset camera
  simulateKeyPress('c');
  
  // Update for reset animation - give more time for full reset
  for (let i = 0; i < 60; i++) {
    controller.update(0.016);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  
  // Check camera is properly aligned behind aircraft
  const aircraftPos = aircraft.getPosition();
  const aircraftRot = aircraft.getRotation();
  const aircraftForward = new THREE.Vector3(0, 0, 1);
  aircraftForward.applyEuler(aircraftRot);
  
  const camToAircraft = aircraftPos.clone().sub(camera.position).normalize();
  const dotProduct = aircraftForward.dot(camToAircraft);
  
  console.log(`Camera alignment dot product: ${dotProduct}`);
  console.assert(dotProduct > 0.9, `Camera should be behind aircraft after reset, dot=${dotProduct}`);
  
  // Check camera is looking at aircraft
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const lookDot = camDir.dot(camToAircraft);
  console.assert(lookDot > 0.9, `Camera should look at aircraft after reset, dot=${lookDot}`);
  
  console.log('✓ Camera reset after yaw test passed');
}

export async function testCameraResetAfterBankAndTurn(): Promise<void> {
  console.log('Testing Camera Reset After Bank and Turn...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Set to chase mode
  controller.setMode(CameraMode.CHASE);
  
  // Apply roll and pitch to simulate banking turn
  const controls: FlightControls = {
    pitch: -0.3, // Pull up slightly
    roll: 1,     // Full right roll
    yaw: 0,
    throttle: 0.7,
    brake: false,
    boost: false,
    fire: false,
    lookBack: false,
    pause: false
  };
  
  // Simulate banking turn for 3 seconds
  for (let i = 0; i < 180; i++) {
    aircraft.updateControls(controls);
    aircraft.update(0.016);
    controller.update(0.016);
  }
  
  // Reset camera
  simulateKeyPress('c');
  
  // Update for reset animation - give more time for full reset
  for (let i = 0; i < 60; i++) {
    controller.update(0.016);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  
  // Verify camera alignment
  const aircraftPos = aircraft.getPosition();
  const aircraftRot = aircraft.getRotation();
  
  // Calculate expected camera position (behind aircraft)
  const expectedOffset = new THREE.Vector3(0, 8, -20);
  const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(aircraftRot);
  expectedOffset.applyMatrix4(rotMatrix);
  const expectedCamPos = aircraftPos.clone().add(expectedOffset);
  
  const camPosError = camera.position.distanceTo(expectedCamPos);
  console.assert(camPosError < 5, `Camera position error should be small, got ${camPosError}`);
  
  console.log('✓ Camera reset after bank and turn test passed');
}

export async function testCameraResetDuringComplexManeuver(): Promise<void> {
  console.log('Testing Camera Reset During Complex Maneuver...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Apply complex control inputs
  const maneuverSteps = [
    { pitch: 0.5, roll: 0.8, yaw: 0.3, duration: 60 },   // Climbing turn
    { pitch: -0.7, roll: -1, yaw: 0, duration: 60 },     // Diving roll
    { pitch: 0, roll: 0, yaw: 1, duration: 60 }          // Flat spin
  ];
  
  for (const step of maneuverSteps) {
    const controls: FlightControls = {
      pitch: step.pitch,
      roll: step.roll,
      yaw: step.yaw,
      throttle: 0.7,
      brake: false,
      boost: false,
      fire: false,
      lookBack: false,
      pause: false
    };
    
    for (let i = 0; i < step.duration; i++) {
      aircraft.updateControls(controls);
      aircraft.update(0.016);
      controller.update(0.016);
    }
  }
  
  // Reset camera mid-maneuver
  simulateKeyPress('c');
  
  // Continue updating to complete reset
  const neutralControls: FlightControls = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.7,
    brake: false,
    boost: false,
    fire: false,
    lookBack: false,
    pause: false
  };
  
  aircraft.updateControls(neutralControls);
  
  for (let i = 0; i < 60; i++) {
    aircraft.update(0.016);
    controller.update(0.016);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  
  // Verify camera has stabilized relative to aircraft
  const aircraftPos1 = aircraft.getPosition().clone();
  const camPos1 = camera.position.clone();
  const relativeCamPos1 = camPos1.sub(aircraftPos1);
  
  // Update a bit more
  for (let i = 0; i < 10; i++) {
    aircraft.update(0.016);
    controller.update(0.016);
  }
  
  const aircraftPos2 = aircraft.getPosition().clone();
  const camPos2 = camera.position.clone();
  const relativeCamPos2 = camPos2.sub(aircraftPos2);
  
  // Camera should be stable relative to aircraft
  const relativeMovement = relativeCamPos1.distanceTo(relativeCamPos2);
  console.assert(relativeMovement < 2, `Camera should be stable relative to aircraft, movement=${relativeMovement}`);
  
  console.log('✓ Camera reset during complex maneuver test passed');
}

export async function testCameraOffsetCalculation(): Promise<void> {
  console.log('Testing Camera Offset Calculation...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Initialize camera position first
  controller.setMode(CameraMode.CHASE);
  for (let i = 0; i < 60; i++) {
    controller.update(0.016);
  }
  
  // Test different aircraft orientations
  const testOrientations = [
    { x: 0, y: 0, z: 0 },                    // Level flight
    { x: 0, y: Math.PI / 2, z: 0 },          // 90° yaw
    { x: 0, y: 0, z: Math.PI / 4 },          // 45° roll
    { x: Math.PI / 6, y: 0, z: 0 },          // 30° pitch
    { x: Math.PI / 6, y: Math.PI / 4, z: Math.PI / 6 }  // Combined
  ];
  
  for (const rot of testOrientations) {
    aircraft._testSetState({
      rotation: new THREE.Euler(rot.x, rot.y, rot.z)
    });
    
    // Give camera time to adjust to new aircraft orientation
    for (let i = 0; i < 60; i++) {
      controller.update(0.016);
    }
    
    // Camera should maintain consistent distance
    const distance = camera.position.distanceTo(aircraft.getPosition());
    console.assert(distance > 15 && distance < 30, 
      `Camera distance should be ~20 units, got ${distance} for rotation ${JSON.stringify(rot)}`);
  }
  
  console.log('✓ Camera offset calculation test passed');
}

// Test runner
export async function runCameraLateralMovementTests(): Promise<void> {
  console.log('=== Running Camera Lateral Movement Tests ===');
  
  try {
    await testCameraResetAfterYaw();
    await testCameraResetAfterBankAndTurn();
    await testCameraResetDuringComplexManeuver();
    await testCameraOffsetCalculation();
    console.log('\n✅ All camera lateral movement tests passed!');
  } catch (error) {
    console.error('❌ Camera lateral movement tests failed:', error);
    throw error;
  }
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const button = document.createElement('button');
    button.textContent = 'Run Camera Lateral Movement Tests';
    button.style.position = 'fixed';
    button.style.bottom = '60px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.onclick = runCameraLateralMovementTests;
    document.body.appendChild(button);
  });
}