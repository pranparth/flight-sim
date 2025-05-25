# WW2 Combat Flight Simulator - System Design & Architecture

## Project Overview

This is a browser-based WW2 combat flight simulator with cartoon-style graphics, built using TypeScript and Three.js. The game emphasizes arcade-style gameplay with semi-realistic flight physics, making it accessible while maintaining engaging aerial combat.

### Key Design Principles
1. **Arcade Accessibility**: Easy to learn, fun to master
2. **Visual Clarity**: Cartoon style for clear friend/foe identification  
3. **Performance First**: 60 FPS target on mid-range hardware
4. **Modular Architecture**: Clean separation of concerns
5. **Browser-Native**: No plugins, works on modern browsers

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────┐
│                   Game Loop (60Hz)                   │
├─────────────────────────────────────────────────────┤
│  Input Manager → Game Core → Physics → Rendering    │
├─────────────────────────────────────────────────────┤
│         Entities          │        Systems           │
│  - Aircraft               │  - FlightDynamics        │
│  - Projectiles (future)   │  - PhysicsEngine         │
│  - Effects (future)       │  - SceneManager          │
│                          │  - CameraController      │
├─────────────────────────────────────────────────────┤
│                  Utilities & Assets                  │
│  - MaterialFactory        - AircraftConfigs          │
│  - MeshFactory           - Shaders (future)         │
└─────────────────────────────────────────────────────┘
```

### Memories
- Don't run the devserver in claude code when trying to use the puppeteer MCP server. I'll have it running always.

### Core Components

[... rest of the file remains unchanged ...]