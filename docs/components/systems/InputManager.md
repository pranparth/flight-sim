# InputManager Class

## Overview
The `InputManager` class provides a unified input handling system that supports keyboard, mouse, and gamepad controls. It translates raw input events into normalized flight controls that aircraft can consume.

## Architecture

The InputManager implements:
- **Multi-device Support**: Keyboard, mouse, and gamepad
- **Normalized Controls**: -1 to 1 ranges for axes
- **Dead Zone Handling**: For analog stick precision
- **Sensitivity Settings**: Per-device multipliers
- **Event Prevention**: Blocks browser shortcuts

## Control Scheme

### FlightControls Interface
```typescript
interface FlightControls {
  pitch: number;      // -1 (down) to 1 (up)
  roll: number;       // -1 (left) to 1 (right)
  yaw: number;        // -1 (left) to 1 (right)
  throttle: number;   // 0 to 1
  brake: boolean;     // Air brakes
  boost: boolean;     // Afterburner
  fire: boolean;      // Fire weapons
  lookBack: boolean;  // Rear view
  pause: boolean;     // Pause game
}
```

### Keyboard Mappings

| Action | Primary | Alternative |
|--------|---------|-------------|
| Pitch Down | W | ↑ |
| Pitch Up | S | ↓ |
| Roll Left | A | ← |
| Roll Right | D | → |
| Yaw Left | Q | - |
| Yaw Right | E | - |
| Throttle Up | Shift | - |
| Throttle Down | Ctrl | - |
| Fire | Space | - |
| Brake | B | - |
| Boost | Tab | - |
| Look Back | C | - |
| Pause | Esc | - |

### Gamepad Mappings

| Action | Xbox | PlayStation |
|--------|------|-------------|
| Pitch/Roll | Left Stick | Left Stick |
| Yaw | Right Stick X | Right Stick X |
| Throttle Up | RT | R2 |
| Throttle Down | LT | L2 |
| Fire | A | X |
| Brake | B | Circle |
| Boost | X | Square |
| Look Back | Y | Triangle |

## Key Features

### 1. Event Management
- Captures keyboard events with preventDefault for game keys
- Tracks key states in a Map for efficient lookup
- Mouse position normalized to -1 to 1 range
- Gamepad polling each frame for state updates

### 2. Input Processing

#### Keyboard Input
- Binary inputs converted to -1, 0, or 1
- Throttle changes gradually (0.5 units/second)
- Prevents browser shortcuts (arrows, space, etc.)

#### Gamepad Input
- Analog stick dead zones (15% default)
- Smooth analog control for flight surfaces
- Trigger analog values for throttle
- Button states for actions

#### Mouse Input (Future)
- Position tracked for free-look camera
- Button states for firing
- Not currently used for flight control

### 3. Sensitivity System
```typescript
sensitivity = {
  keyboard: 1.0,
  mouse: 0.002,
  gamepad: 1.0
}
```
Allows per-device tuning for player preference.

## Methods

### Core Methods

#### `update(): void`
Main update called each frame:
1. Resets transient controls
2. Processes keyboard input
3. Polls gamepad state
4. Applies sensitivity
5. Clamps values to valid ranges

#### `getControls(): FlightControls`
Returns a copy of current control state.

### Input Queries

#### `isKeyPressed(code: string): boolean`
Check specific key state (e.g., 'KeyW', 'Space').

#### `getMousePosition(): { x: number; y: number }`
Get normalized mouse coordinates.

#### `isMouseButtonPressed(button: number): boolean`
Check mouse button state (0=left, 1=middle, 2=right).

### Configuration

#### `setSensitivity(type: 'keyboard' | 'mouse' | 'gamepad', value: number): void`
Adjust input sensitivity per device type.

## Implementation Details

### Dead Zone Calculation
```typescript
applyDeadzone(value: number): number {
  if (Math.abs(value) < deadzone) return 0;
  
  const sign = value > 0 ? 1 : -1;
  const magnitude = (Math.abs(value) - deadzone) / (1 - deadzone);
  
  return sign * magnitude;
}
```
Ensures precise center position and smooth transitions.

### Throttle Behavior
- Gradual changes (0.5/second) for realistic engine response
- Maintained between frames
- Clamped to 0-1 range
- Shift/Ctrl for increase/decrease

### Game Key Prevention
Prevents default browser behavior for:
- Arrow keys (scrolling)
- Space (page down)
- Tab (focus change)
- Escape (fullscreen exit)

## Usage Example

```typescript
const inputManager = new InputManager();

// Game loop
function update(deltaTime: number) {
  inputManager.update();
  
  const controls = inputManager.getControls();
  aircraft.updateControls(controls);
  
  // Check for special keys
  if (inputManager.isKeyPressed('KeyP')) {
    togglePause();
  }
}

// Adjust sensitivity
inputManager.setSensitivity('keyboard', 1.5);
inputManager.setSensitivity('gamepad', 0.8);
```

## Gamepad Support

### Connection Handling
- Auto-detects gamepad connection/disconnection
- Logs gamepad ID for debugging
- Supports hot-plugging

### Gamepad State
- Polls navigator.getGamepads() each frame
- Updates stored gamepad reference
- Handles null states gracefully

### Button Mapping
Standard gamepad layout assumed:
- Buttons 0-3: Face buttons (A/B/X/Y)
- Buttons 6-7: Triggers (L2/R2)
- Axes 0-1: Left stick
- Axes 2-3: Right stick

## Performance Considerations

### Optimization Strategies
- Key states stored in Map for O(1) lookup
- Single update pass per frame
- No allocation in hot paths
- Early returns for disconnected devices

### Frame Rate Independence
- Throttle changes scaled by assumed 60 FPS
- Could be improved with actual deltaTime
- Other controls are instantaneous

## Future Enhancements

### Mouse Flight Mode
- Optional mouse control for pitch/roll
- Relative mode with pointer lock
- Sensitivity curves

### Advanced Gamepad
- Vibration feedback
- Custom button mapping
- Multiple gamepad support
- Analog trigger dead zones

### Input Recording
- Record/replay functionality
- Input macros
- Training mode inputs

### Accessibility
- Customizable controls
- One-handed modes
- Voice commands
- Eye tracking support

### Mobile Support
- Touch controls
- Accelerometer input
- Virtual joysticks
- Gesture recognition