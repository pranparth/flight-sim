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

export async function debugCameraReset(): Promise<void> {
  console.log('=== Debugging Camera Reset ===');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Set to chase mode
  controller.setMode(CameraMode.CHASE);
  
  // Initial state
  console.log('Initial aircraft position:', aircraft.getPosition());
  console.log('Initial aircraft rotation:', aircraft.getRotation());
  console.log('Initial camera position:', camera.position);
  
  // Apply yaw control
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
  
  // Simulate yaw movement
  console.log('\n--- Applying yaw for 2 seconds ---');
  for (let i = 0; i < 120; i++) {
    aircraft.updateControls(controls);
    aircraft.update(0.016);
    controller.update(0.016);
  }
  
  console.log('After yaw - aircraft position:', aircraft.getPosition());
  console.log('After yaw - aircraft rotation:', aircraft.getRotation());
  console.log('After yaw - camera position:', camera.position);
  
  // Calculate current alignment
  const aircraftPos1 = aircraft.getPosition();
  const aircraftRot1 = aircraft.getRotation();
  const aircraftForward1 = new THREE.Vector3(0, 0, 1);
  aircraftForward1.applyEuler(aircraftRot1);
  
  const camToAircraft1 = aircraftPos1.clone().sub(camera.position).normalize();
  const dotProduct1 = aircraftForward1.dot(camToAircraft1);
  
  console.log('\nBefore reset:');
  console.log('Aircraft forward:', aircraftForward1);
  console.log('Camera to aircraft:', camToAircraft1);
  console.log('Dot product:', dotProduct1);
  
  // Trigger camera reset
  console.log('\n--- Resetting camera ---');
  controller.resetCamera();
  
  // Update for reset animation
  for (let i = 0; i < 30; i++) {
    controller.update(0.016);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  
  // Check alignment after reset
  const aircraftPos2 = aircraft.getPosition();
  const aircraftRot2 = aircraft.getRotation();
  const aircraftForward2 = new THREE.Vector3(0, 0, 1);
  aircraftForward2.applyEuler(aircraftRot2);
  
  const camToAircraft2 = aircraftPos2.clone().sub(camera.position).normalize();
  const dotProduct2 = aircraftForward2.dot(camToAircraft2);
  
  console.log('\nAfter reset:');
  console.log('Aircraft position:', aircraftPos2);
  console.log('Aircraft rotation:', aircraftRot2);
  console.log('Camera position:', camera.position);
  console.log('Aircraft forward:', aircraftForward2);
  console.log('Camera to aircraft:', camToAircraft2);
  console.log('Dot product:', dotProduct2);
  
  // Calculate expected camera position
  const expectedOffset = new THREE.Vector3(0, 8, -20); // Chase mode offset
  const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(aircraftRot2);
  expectedOffset.applyMatrix4(rotMatrix);
  const expectedCamPos = aircraftPos2.clone().add(expectedOffset);
  
  console.log('\nExpected camera position:', expectedCamPos);
  console.log('Actual camera position:', camera.position);
  console.log('Position error:', camera.position.distanceTo(expectedCamPos));
  
  // Check if camera is looking at the aircraft
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const toAircraft = aircraftPos2.clone().sub(camera.position).normalize();
  const lookDot = camDir.dot(toAircraft);
  
  console.log('\nCamera direction:', camDir);
  console.log('Direction to aircraft:', toAircraft);
  console.log('Look dot product:', lookDot);
}

// Run debug test
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const button = document.createElement('button');
    button.textContent = 'Debug Camera Reset';
    button.style.position = 'fixed';
    button.style.bottom = '100px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.onclick = debugCameraReset;
    document.body.appendChild(button);
  });
}