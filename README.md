# Solar System Explorer

An interactive 3D solar system simulation built with Three.js, featuring realistic planetary motion, dynamic particle effects, and modern UI design.

<p align="center">
  <img src="screenshots/main-view.png" alt="Solar System Explorer" width="100%">
</p>

<p align="center">
  <a href="#key-highlights">Highlights</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#technical-details">Technical Details</a>
</p>

---

## Key Highlights

- 🌞 **Realistic Sun** with dynamic plasma effects and corona
- 🪐 **All 8 Planets** with procedurally generated textures
- 🌙 **Moons** including Earth's Moon and Jupiter's Galilean moons
- 💫 **35,000+ Stars** with realistic colors and Milky Way effect
- 🎮 **Smooth Controls** with zoom limits and intuitive navigation
- 📱 **Responsive Design** that works on all devices

## Screenshots

### Different Viewing Modes

<p align="center">
  <img src="screenshots/full-ui.png" width="48%" alt="Full UI with Labels and Orbits">
  <img src="screenshots/clean-view.png" width="48%" alt="Clean View without UI Elements">
</p>

<p align="center">
  <em>Left: Full interface with planet labels and orbital paths | Right: Clean view for an immersive experience</em>
</p>

## Features

### 🌟 Visual Effects
- **Dynamic Sun**
  - Multi-layered WebGL shaders for realistic solar surface
  - Dynamic plasma ejection particle system
  - Corona loops and solar flares
  - Real-time surface animation

- **Planetary System**
  - All 8 planets with accurate relative sizes
  - Procedurally generated textures for each planet
  - Earth's moon and Jupiter's major moons
  - Saturn's majestic ring system
  - Orbital trails for visual tracking

- **Space Environment**
  - Multi-layered starfield with 35,000+ stars
  - Varied star colors and sizes
  - Milky Way effect
  - Depth-based rendering

### 🎮 Interactive Controls
- **Mouse Controls**
  - Left Click + Drag: Rotate view
  - Scroll: Zoom in/out
  - Right Click + Drag: Pan camera
  
- **UI Controls**
  - Toggle orbital paths visibility
  - Toggle planet labels
  - Adjustable simulation speed (0-10x)
  - Modern, responsive interface

### 🎨 Modern Design
- **Typography**
  - Google Fonts integration (Orbitron & Space Grotesk)
  - Responsive text sizing
  - Distance-based label scaling

- **UI/UX**
  - Glassmorphism effects
  - Gradient backgrounds
  - Smooth animations
  - Mobile-responsive design

## Quick Start

### Using Vite (Recommended)

1. Clone the repository
```bash
git clone https://github.com/yourusername/threejs-experiments.git
cd threejs-experiments
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Using Python HTTP Server

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Project Structure

```
threejs-experiments/
├── index.html              # Main HTML with modern UI
├── solar-system.js         # Three.js application logic
├── solar-style.css         # Modern CSS styling
├── capture.js              # Puppeteer screenshot utility
├── package.json            # Project dependencies
├── vite.config.js          # Vite configuration
└── screenshots/            # Application screenshots
```

## Technical Details

### Technologies Used
- **Three.js** - 3D graphics library
- **WebGL Shaders** - Custom shaders for sun effects
- **OrbitControls** - Camera control system
- **Vite** - Build tool and dev server
- **Puppeteer** - Automated screenshot generation

### Key Features Implementation

#### Dynamic Particle System
- Real-time particle generation and recycling
- Phase-based animation for natural movement
- Distance-based opacity for depth perception
- Custom circular gradient textures

#### Planetary Textures
- Procedurally generated textures for each planet
- Earth: Continents, oceans, and cloud coverage
- Jupiter: Banded atmosphere with Great Red Spot
- Mars: Polar ice caps and surface features

#### Performance Optimizations
- Efficient particle recycling system
- Distance-based label updates
- Depth buffer optimization
- Level-of-detail star rendering

## Browser Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- WebGL 2.0 support
- Hardware acceleration enabled
- Recommended: Dedicated graphics card

## Development

### Adding New Features
1. Planets can be added/modified in the `planetData` array
2. Particle effects can be customized in `createSunParticles()`
3. UI styling can be modified in `solar-style.css`

### Building for Production
```bash
npm run build
```

## Controls Reference

| Control | Action |
|---------|--------|
| Left Mouse | Rotate camera |
| Scroll Wheel | Zoom in/out |
| Right Mouse | Pan camera |
| O key | Toggle orbits |
| L key | Toggle labels |

## Performance Tips

- For better performance on lower-end devices:
  - Reduce particle count in `createSunParticles()`
  - Lower star count in `createStarfield()`
  - Disable particle effects via code modification

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Three.js community for excellent documentation
- NASA for planetary data reference
- Google Fonts for typography