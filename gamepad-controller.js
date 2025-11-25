// Gamepad Controller for MiniDayZ
// Supports Nintendo Switch Pro Controller and other gamepads

class GamepadController {
  constructor() {
    this.gamepad = null;
    this.gamepadIndex = -1;
    this.buttons = {};
    this.axes = {};
    this.deadZone = 0.2;
    this.isConnected = false;
    this.lastButtons = {};
    this.stickKeysDown = { w: false, s: false, a: false, d: false };
    this.buttonMapping = {
      // Nintendo Switch Pro Controller mapping
      A: 0,      // A button (bottom)
      B: 1,      // B button (right)
      X: 2,      // X button (top)
      Y: 3,      // Y button (left)
      L: 4,      // Left shoulder
      R: 5,      // Right shoulder
      ZL: 6,     // Left trigger
      ZR: 7,     // Right trigger
      Minus: 8,  // Select/Minus
      Plus: 9,   // Start/Plus
      LStick: 10, // Left stick press
      RStick: 11, // Right stick press
      DPadUp: 12,
      DPadDown: 13,
      DPadLeft: 14,
      DPadRight: 15
    };
    
    // Keyboard mapping for gamepad buttons
    this.keyboardMapping = {
      A: 'Space',        // Action/Interact
      B: 'Escape',       // Cancel/Back
      X: 'KeyF',         // Attack/Use item
      Y: 'KeyI',         // Inventory
      Plus: 'Escape',    // Menu/Pause
      Minus: 'Tab',      // Map/Secondary menu
      DPadUp: 'KeyW',
      DPadDown: 'KeyS',
      DPadLeft: 'KeyA',
      DPadRight: 'KeyD',
      L: 'KeyQ',         // Reload/Secondary action
      R: 'KeyR'          // Reload/Secondary action
    };
    
    this.init();
  }

  init() {
    // Listen for gamepad connection
    window.addEventListener("gamepadconnected", (e) => {
      this.gamepadIndex = e.gamepad.index;
      this.gamepad = navigator.getGamepads()[this.gamepadIndex];
      this.isConnected = true;
      console.log("Геймпад подключен:", this.gamepad.id);
      this.startPolling();
    });

    // Listen for gamepad disconnection
    window.addEventListener("gamepaddisconnected", (e) => {
      if (e.gamepad.index === this.gamepadIndex) {
        this.isConnected = false;
        this.gamepad = null;
        this.gamepadIndex = -1;
        console.log("Геймпад отключен");
      }
    });

    // Check for already connected gamepads
    this.checkExistingGamepads();
  }

  checkExistingGamepads() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepadIndex = i;
        this.gamepad = gamepads[i];
        this.isConnected = true;
        console.log("Найден подключенный геймпад:", this.gamepad.id);
        this.startPolling();
        break;
      }
    }
  }

  startPolling() {
    if (this.polling) return;
    this.polling = true;
    
    const poll = () => {
      if (!this.isConnected || !this.gamepad) {
        this.polling = false;
        return;
      }

      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (!gp) {
        this.polling = false;
        return;
      }

      this.updateButtons(gp);
      this.updateAxes(gp);
      this.handleInput();
      
      requestAnimationFrame(poll);
    };
    
    poll();
  }

  updateButtons(gamepad) {
    // Update button states
    this.buttons = {
      A: this.getButtonValue(gamepad, this.buttonMapping.A),
      B: this.getButtonValue(gamepad, this.buttonMapping.B),
      X: this.getButtonValue(gamepad, this.buttonMapping.X),
      Y: this.getButtonValue(gamepad, this.buttonMapping.Y),
      L: this.getButtonValue(gamepad, this.buttonMapping.L),
      R: this.getButtonValue(gamepad, this.buttonMapping.R),
      ZL: this.getButtonValue(gamepad, this.buttonMapping.ZL),
      ZR: this.getButtonValue(gamepad, this.buttonMapping.ZR),
      Minus: this.getButtonValue(gamepad, this.buttonMapping.Minus),
      Plus: this.getButtonValue(gamepad, this.buttonMapping.Plus),
      LStick: this.getButtonValue(gamepad, this.buttonMapping.LStick),
      RStick: this.getButtonValue(gamepad, this.buttonMapping.RStick),
      DPadUp: this.getButtonValue(gamepad, this.buttonMapping.DPadUp),
      DPadDown: this.getButtonValue(gamepad, this.buttonMapping.DPadDown),
      DPadLeft: this.getButtonValue(gamepad, this.buttonMapping.DPadLeft),
      DPadRight: this.getButtonValue(gamepad, this.buttonMapping.DPadRight)
    };
  }

  getButtonValue(gamepad, index) {
    if (!gamepad.buttons || index >= gamepad.buttons.length) return false;
    const button = gamepad.buttons[index];
    return button ? (button.pressed || button.value > 0.5) : false;
  }

  updateAxes(gamepad) {
    // Left stick: axes[0] = X, axes[1] = Y
    // Right stick: axes[2] = X, axes[3] = Y
    const leftX = this.applyDeadZone(gamepad.axes[0] || 0);
    const leftY = this.applyDeadZone(gamepad.axes[1] || 0);
    const rightX = this.applyDeadZone(gamepad.axes[2] || 0);
    const rightY = this.applyDeadZone(gamepad.axes[3] || 0);

    this.axes = {
      leftStick: { x: leftX, y: leftY },
      rightStick: { x: rightX, y: rightY }
    };
  }

  applyDeadZone(value) {
    return Math.abs(value) < this.deadZone ? 0 : value;
  }

  handleInput() {
    // Handle button presses (convert to keyboard events)
    for (const [buttonName, pressed] of Object.entries(this.buttons)) {
      const wasPressed = this.lastButtons[buttonName] || false;
      
      if (pressed && !wasPressed) {
        // Button just pressed
        this.triggerKeyDown(buttonName);
      } else if (!pressed && wasPressed) {
        // Button just released
        this.triggerKeyUp(buttonName);
      }
      
      this.lastButtons[buttonName] = pressed;
    }

    // Handle left stick movement (WASD keys)
    this.handleStickMovement();
  }

  triggerKeyDown(buttonName) {
    const keyInfo = this.getKeyInfo(buttonName);
    if (!keyInfo) return;

    // Создаем событие, которое будет правильно обработано игрой
    const event = new KeyboardEvent('keydown', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.keyCode,
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    // Отправляем на canvas и document для надежности
    const canvas = document.getElementById('c2canvas');
    if (canvas) {
      canvas.dispatchEvent(event);
    }
    document.dispatchEvent(event);
    window.dispatchEvent(event);
  }

  triggerKeyUp(buttonName) {
    const keyInfo = this.getKeyInfo(buttonName);
    if (!keyInfo) return;

    const event = new KeyboardEvent('keyup', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.keyCode,
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    const canvas = document.getElementById('c2canvas');
    if (canvas) {
      canvas.dispatchEvent(event);
    }
    document.dispatchEvent(event);
    window.dispatchEvent(event);
  }

  getKeyInfo(keyName) {
    const keyMap = {
      'Space': { key: ' ', code: 'Space', keyCode: 32 },
      'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
      'KeyF': { key: 'f', code: 'KeyF', keyCode: 70 },
      'KeyI': { key: 'i', code: 'KeyI', keyCode: 73 },
      'KeyW': { key: 'w', code: 'KeyW', keyCode: 87 },
      'KeyS': { key: 's', code: 'KeyS', keyCode: 83 },
      'KeyA': { key: 'a', code: 'KeyA', keyCode: 65 },
      'KeyD': { key: 'd', code: 'KeyD', keyCode: 68 },
      'KeyQ': { key: 'q', code: 'KeyQ', keyCode: 81 },
      'KeyR': { key: 'r', code: 'KeyR', keyCode: 82 },
      'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 }
    };
    
    const key = this.keyboardMapping[keyName];
    return key ? keyMap[key] : null;
  }

  handleStickMovement() {
    const stick = this.axes.leftStick;
    
    // Convert stick movement to WASD keys
    // Up (W)
    if (stick.y < -0.3) {
      if (!this.stickKeysDown.w) {
        this.triggerKeyDown('DPadUp');
        this.stickKeysDown.w = true;
      }
    } else {
      if (this.stickKeysDown.w) {
        this.triggerKeyUp('DPadUp');
        this.stickKeysDown.w = false;
      }
    }
    
    // Down (S)
    if (stick.y > 0.3) {
      if (!this.stickKeysDown.s) {
        this.triggerKeyDown('DPadDown');
        this.stickKeysDown.s = true;
      }
    } else {
      if (this.stickKeysDown.s) {
        this.triggerKeyUp('DPadDown');
        this.stickKeysDown.s = false;
      }
    }
    
    // Left (A)
    if (stick.x < -0.3) {
      if (!this.stickKeysDown.a) {
        this.triggerKeyDown('DPadLeft');
        this.stickKeysDown.a = true;
      }
    } else {
      if (this.stickKeysDown.a) {
        this.triggerKeyUp('DPadLeft');
        this.stickKeysDown.a = false;
      }
    }
    
    // Right (D)
    if (stick.x > 0.3) {
      if (!this.stickKeysDown.d) {
        this.triggerKeyDown('DPadRight');
        this.stickKeysDown.d = true;
      }
    } else {
      if (this.stickKeysDown.d) {
        this.triggerKeyUp('DPadRight');
        this.stickKeysDown.d = false;
      }
    }
  }

  // Public methods
  getButton(buttonName) {
    return this.buttons[buttonName] || false;
  }

  getLeftStick() {
    return this.axes.leftStick || { x: 0, y: 0 };
  }

  getRightStick() {
    return this.axes.rightStick || { x: 0, y: 0 };
  }
}

// Create global instance
window.gamepadController = new GamepadController();

