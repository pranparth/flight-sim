export interface FlightControls {
  pitch: number;      // -1 to 1 (down to up)
  roll: number;       // -1 to 1 (left to right)
  yaw: number;        // -1 to 1 (left to right)
  throttle: number;   // 0 to 1
  brake: boolean;
  boost: boolean;
  fire: boolean;
  lookBack: boolean;
  pause: boolean;
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private mouse = { x: 0, y: 0, buttons: 0 };
  private gamepad: Gamepad | null = null;
  private controls: FlightControls = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.5,
    brake: false,
    boost: false,
    fire: false,
    lookBack: false,
    pause: false,
  };
  
  // Input settings
  private sensitivity = {
    keyboard: 1.0,
    mouse: 0.002,
    gamepad: 1.0,
  };
  
  private deadzone = 0.15;
  private throttleSpeed = 0.5; // Throttle change per second
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    // Mouse events
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    // Gamepad events
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
    
    // Prevent right-click context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    this.keys.set(event.code, true);
    
    // Prevent default for game keys
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.code, false);
  }
  
  private onMouseMove(event: MouseEvent): void {
    // Store normalized mouse position
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.mouse.buttons = event.buttons;
  }
  
  private onMouseUp(event: MouseEvent): void {
    this.mouse.buttons = event.buttons;
  }
  
  private onGamepadConnected(event: GamepadEvent): void {
    console.log('Gamepad connected:', event.gamepad.id);
    this.gamepad = event.gamepad;
  }
  
  private onGamepadDisconnected(_event: GamepadEvent): void {
    console.log('Gamepad disconnected');
    this.gamepad = null;
  }
  
  private isGameKey(code: string): boolean {
    const gameKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyQ', 'KeyE',
      'Space', 'ShiftLeft', 'ShiftRight',
      'ControlLeft', 'ControlRight',
      'Tab', 'Escape'
    ];
    return gameKeys.includes(code);
  }
  
  update(): void {
    // Reset controls
    this.controls.pitch = 0;
    this.controls.roll = 0;
    this.controls.yaw = 0;
    this.controls.brake = false;
    this.controls.boost = false;
    this.controls.fire = false;
    this.controls.lookBack = false;
    
    // Update from keyboard
    this.updateKeyboardControls();
    
    // Update from gamepad (if connected)
    this.updateGamepadControls();
    
    // Apply sensitivity
    this.controls.pitch *= this.sensitivity.keyboard;
    this.controls.roll *= this.sensitivity.keyboard;
    this.controls.yaw *= this.sensitivity.keyboard;
    
    // Clamp values
    this.controls.pitch = Math.max(-1, Math.min(1, this.controls.pitch));
    this.controls.roll = Math.max(-1, Math.min(1, this.controls.roll));
    this.controls.yaw = Math.max(-1, Math.min(1, this.controls.yaw));
    this.controls.throttle = Math.max(0, Math.min(1, this.controls.throttle));
  }
  
  private updateKeyboardControls(): void {
    // Pitch controls (up/down)
    if (this.keys.get('KeyW') || this.keys.get('ArrowUp')) {
      this.controls.pitch = -1; // Pitch down
    }
    if (this.keys.get('KeyS') || this.keys.get('ArrowDown')) {
      this.controls.pitch = 1; // Pitch up
    }
    
    // Roll controls (left/right)
    if (this.keys.get('KeyA') || this.keys.get('ArrowLeft')) {
      this.controls.roll = -1; // Roll left
    }
    if (this.keys.get('KeyD') || this.keys.get('ArrowRight')) {
      this.controls.roll = 1; // Roll right
    }
    
    // Yaw controls
    if (this.keys.get('KeyQ')) {
      this.controls.yaw = -1; // Yaw left
    }
    if (this.keys.get('KeyE')) {
      this.controls.yaw = 1; // Yaw right
    }
    
    // Throttle controls
    if (this.keys.get('ShiftLeft') || this.keys.get('ShiftRight')) {
      this.controls.throttle = Math.min(1, this.controls.throttle + this.throttleSpeed * 0.016);
    }
    if (this.keys.get('ControlLeft') || this.keys.get('ControlRight')) {
      this.controls.throttle = Math.max(0, this.controls.throttle - this.throttleSpeed * 0.016);
    }
    
    // Other controls
    this.controls.fire = this.keys.get('Space') || false;
    this.controls.brake = this.keys.get('KeyB') || false;
    this.controls.boost = this.keys.get('Tab') || false;
    this.controls.lookBack = this.keys.get('KeyC') || false;
    this.controls.pause = this.keys.get('Escape') || false;
  }
  
  private updateGamepadControls(): void {
    if (!this.gamepad) return;
    
    // Update gamepad state
    const gamepads = navigator.getGamepads();
    this.gamepad = gamepads[this.gamepad.index];
    
    if (!this.gamepad) return;
    
    // Left stick - pitch and roll
    const leftX = this.applyDeadzone(this.gamepad.axes[0]);
    const leftY = this.applyDeadzone(this.gamepad.axes[1]);
    
    this.controls.roll = leftX;
    this.controls.pitch = leftY;
    
    // Right stick - yaw
    const rightX = this.applyDeadzone(this.gamepad.axes[2]);
    this.controls.yaw = rightX;
    
    // Triggers - throttle
    const leftTrigger = this.gamepad.buttons[6].value;  // L2
    const rightTrigger = this.gamepad.buttons[7].value; // R2
    
    if (rightTrigger > 0.1) {
      this.controls.throttle = Math.min(1, this.controls.throttle + rightTrigger * this.throttleSpeed * 0.016);
    }
    if (leftTrigger > 0.1) {
      this.controls.throttle = Math.max(0, this.controls.throttle - leftTrigger * this.throttleSpeed * 0.016);
    }
    
    // Buttons
    this.controls.fire = this.gamepad.buttons[0].pressed; // A/X
    this.controls.brake = this.gamepad.buttons[1].pressed; // B/Circle
    this.controls.boost = this.gamepad.buttons[2].pressed; // X/Square
    this.controls.lookBack = this.gamepad.buttons[3].pressed; // Y/Triangle
  }
  
  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) return 0;
    
    const sign = value > 0 ? 1 : -1;
    const magnitude = (Math.abs(value) - this.deadzone) / (1 - this.deadzone);
    
    return sign * magnitude;
  }
  
  getControls(): FlightControls {
    return { ...this.controls };
  }
  
  isKeyPressed(code: string): boolean {
    return this.keys.get(code) || false;
  }
  
  getMousePosition(): { x: number; y: number } {
    return { ...this.mouse };
  }
  
  isMouseButtonPressed(button: number): boolean {
    return (this.mouse.buttons & (1 << button)) !== 0;
  }
  
  setSensitivity(type: 'keyboard' | 'mouse' | 'gamepad', value: number): void {
    this.sensitivity[type] = value;
  }
}