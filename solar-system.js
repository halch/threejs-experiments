import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let sun, planets = [], moons = [];
let particleSystems = [];
let orbits = [];
let labels = [];
let time = 0;
let speedMultiplier = 1;
let comet = null;
let cameraMode = 'free';
let cameraTarget = null;
let cameraTransition = { active: false, startTime: 0, duration: 2000, from: null, to: null };
let cometData = {
    // 実際のハレー彗星のパラメータ（スケール調整済み）
    eccentricity: 0.967,  // 実際の離心率
    inclination: Math.PI * 0.9,  // 162度を簡略化（逆行軌道）
    perihelion: 60,  // 0.586 AU相当（地球軌道100に対して）
    aphelion: 35.1 * 100,  // 35.1 AU相当
    orbitalPeriod: 75.3,  // 年
    speed: 0.001  // 公転周期に基づく速度
};

// パーティクルの色を温度に基づいて取得する関数
function getParticleColor(temperature) {
    const color = new THREE.Color();
    if (temperature < 0.3) {
        color.setHSL(0.16, 0.8, 0.6); // 黄色〜オレンジ（明度を下げる）
    } else if (temperature < 0.7) {
        color.setHSL(0.08, 0.7, 0.5); // オレンジ〜赤
    } else {
        color.setHSL(0.0, 0.6, 0.4); // 暗い赤
    }
    return color;
}

// パーティクル用の円形テクスチャを作成
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,200,100,0.6)');
    gradient.addColorStop(0.7, 'rgba(255,100,50,0.3)');
    gradient.addColorStop(1, 'rgba(255,50,0,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// 惑星のテクスチャを生成
function createPlanetTexture(planetName, baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // ベースカラーを塗る
    const color = new THREE.Color(baseColor);
    context.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 惑星ごとの特徴を追加
    if (planetName === 'Earth') {
        // 地球：大陸と海
        context.fillStyle = '#2e8b57';
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const w = 50 + Math.random() * 100;
            const h = 30 + Math.random() * 70;
            context.fillRect(x, y, w, h);
        }
        
        // 雲
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 10 + Math.random() * 30;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    } else if (planetName === 'Jupiter') {
        // 木星：縞模様
        for (let i = 0; i < canvas.height; i += 10) {
            const hue = 30 + Math.sin(i * 0.05) * 10;
            const lightness = 50 + Math.sin(i * 0.1) * 20;
            context.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
            context.fillRect(0, i, canvas.width, 10);
        }
        
        // 大赤斑
        context.fillStyle = '#cd5c5c';
        context.beginPath();
        context.ellipse(canvas.width * 0.7, canvas.height * 0.6, 40, 20, 0, 0, Math.PI * 2);
        context.fill();
    } else if (planetName === 'Mars') {
        // 火星：極冠
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.fillRect(0, 0, canvas.width, 20);
        context.fillRect(0, canvas.height - 20, canvas.width, 20);
        
        // 暗い領域
        context.fillStyle = 'rgba(139, 69, 19, 0.5)';
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * canvas.width;
            const y = 20 + Math.random() * (canvas.height - 40);
            const radius = 20 + Math.random() * 40;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    } else {
        // その他の惑星：ノイズパターン
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 20;
            const opacity = Math.random() * 0.3;
            context.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, ${opacity})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

const planetData = [
    { name: 'Mercury', radius: 3, distance: 40, color: 0x8c7c62, speed: 0.02, rotationSpeed: 0.01 },
    { name: 'Venus', radius: 6, distance: 70, color: 0xffc649, speed: 0.015, rotationSpeed: 0.008 },
    { name: 'Earth', radius: 6.5, distance: 100, color: 0x1e90ff, speed: 0.01, rotationSpeed: 0.02,
      moons: [{ name: 'Moon', radius: 2, distance: 15, color: 0xcccccc, speed: 0.03 }] },
    { name: 'Mars', radius: 4, distance: 140, color: 0xcd5c5c, speed: 0.008, rotationSpeed: 0.018 },
    { name: 'Jupiter', radius: 15, distance: 220, color: 0xffa500, speed: 0.005, rotationSpeed: 0.04,
      moons: [
        { name: 'Io', radius: 2, distance: 25, color: 0xffff99, speed: 0.04 },
        { name: 'Europa', radius: 1.8, distance: 30, color: 0xe6f2ff, speed: 0.03 },
        { name: 'Ganymede', radius: 2.5, distance: 35, color: 0xcc9966, speed: 0.02 },
        { name: 'Callisto', radius: 2.2, distance: 40, color: 0x8b7355, speed: 0.015 }
      ] },
    { name: 'Saturn', radius: 12, distance: 320, color: 0xf4e99b, speed: 0.003, rotationSpeed: 0.038,
      hasRings: true },
    { name: 'Uranus', radius: 8, distance: 400, color: 0x4fd1c5, speed: 0.002, rotationSpeed: 0.03 },
    { name: 'Neptune', radius: 8, distance: 480, color: 0x4169e1, speed: 0.001, rotationSpeed: 0.028 }
];

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 200, 400);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 5000;  // より遠くまでズームアウト可能に
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.6;
    
    createStarfield();
    createSun();
    createPlanets();
    createComet();
    createLights();
    
    setupEventListeners();
    window.addEventListener('resize', onWindowResize);
}

function createStarfield() {
    // 多層の星空を作成
    const layers = [
        { count: 20000, sizeRange: [0.5, 1.5], distanceRange: [1500, 3000], brightness: 0.8 },
        { count: 10000, sizeRange: [1, 2.5], distanceRange: [1000, 2000], brightness: 1 },
        { count: 5000, sizeRange: [2, 4], distanceRange: [800, 1500], brightness: 0.6 }
    ];
    
    layers.forEach((layer, layerIndex) => {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const sizes = [];
        
        for (let i = 0; i < layer.count; i++) {
            const angle1 = Math.random() * Math.PI * 2;
            const angle2 = Math.random() * Math.PI;
            const radius = layer.distanceRange[0] + Math.random() * (layer.distanceRange[1] - layer.distanceRange[0]);
            
            vertices.push(
                radius * Math.sin(angle2) * Math.cos(angle1),
                radius * Math.sin(angle2) * Math.sin(angle1),
                radius * Math.cos(angle2)
            );
            
            // より多様な星の色
            const starType = Math.random();
            const color = new THREE.Color();
            if (starType < 0.15) {
                // 青い星（高温）
                color.setHSL(0.6, 0.8, 0.7 + Math.random() * 0.3);
            } else if (starType < 0.3) {
                // 赤い星（低温）
                color.setHSL(0.0, 0.6, 0.5 + Math.random() * 0.3);
            } else if (starType < 0.4) {
                // 黄色い星
                color.setHSL(0.15, 0.7, 0.6 + Math.random() * 0.3);
            } else {
                // 白い星（通常）
                color.setHSL(0.6, 0.1, 0.7 + Math.random() * 0.3);
            }
            
            colors.push(color.r * layer.brightness, color.g * layer.brightness, color.b * layer.brightness);
            sizes.push(layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]));
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.9 - layerIndex * 0.2,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            map: createStarTexture()
        });
        
        const stars = new THREE.Points(geometry, material);
        scene.add(stars);
    });
    
    // 天の川効果を追加
    createMilkyWay();
}

// 星のテクスチャを作成
function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// 天の川効果
function createMilkyWay() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const milkyWayParticles = 30000;
    
    for (let i = 0; i < milkyWayParticles; i++) {
        const t = (i / milkyWayParticles) * Math.PI * 2;
        const spread = Math.random() * 100 - 50;
        const distance = 1000 + Math.random() * 500;
        
        const x = Math.cos(t) * distance + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * 200 + Math.sin(t * 2) * 50;
        const z = Math.sin(t) * distance + (Math.random() - 0.5) * spread;
        
        vertices.push(x, y, z);
        
        const color = new THREE.Color();
        color.setHSL(0.6, 0.1, 0.2 + Math.random() * 0.3);
        colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    const milkyWay = new THREE.Points(geometry, material);
    scene.add(milkyWay);
}

function createSun() {
    // 太陽のコア
    const coreGeometry = new THREE.SphereGeometry(20, 64, 64);
    const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0xffffff) },
            color2: { value: new THREE.Color(0xffaa00) },
            color3: { value: new THREE.Color(0xff6600) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float noise(vec3 p, float t) {
                return sin(p.x * 10.0 + t) * sin(p.y * 10.0 + t * 0.8) * sin(p.z * 10.0 + t * 1.2);
            }
            
            void main() {
                float n = noise(vPosition * 0.5, time * 0.1);
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                
                vec3 color = mix(color1, color2, vUv.y + n * 0.2);
                color = mix(color, color3, intensity);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });
    
    sun = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(sun);
    
    // 内側のグロー
    const innerGlowGeometry = new THREE.SphereGeometry(25, 32, 32);
    const innerGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            glowColor: { value: new THREE.Color(0xffaa00) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 glowColor;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.5);
                float pulse = sin(time * 2.0) * 0.1 + 0.9;
                gl_FragColor = vec4(glowColor, intensity * 0.5 * pulse);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    sun.add(innerGlow);
    
    // 外側のグロー（コロナ）
    const coronaGeometry = new THREE.SphereGeometry(40, 32, 32);
    const coronaMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            coronaColor: { value: new THREE.Color(0xff6600) }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 coronaColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float noise(vec3 p, float t) {
                return sin(p.x * 5.0 + t * 0.5) * sin(p.y * 5.0 + t * 0.3) * sin(p.z * 5.0 + t * 0.7);
            }
            
            void main() {
                float n = noise(vPosition * 0.1, time);
                float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.2);
                intensity += n * 0.2;
                float pulse = sin(time * 1.5 + n * 10.0) * 0.1 + 0.9;
                gl_FragColor = vec4(coronaColor, intensity * 0.3 * pulse);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sun.add(corona);
    
    // 最外層のフレア
    const flareGeometry = new THREE.SphereGeometry(60, 16, 16);
    const flareMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.4 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.8);
                float flicker = sin(time * 3.0) * sin(time * 5.0) * 0.1 + 0.9;
                vec3 color = mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.3, 0.0), intensity);
                gl_FragColor = vec4(color, intensity * 0.2 * flicker);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    sun.add(flare);
    
    // シェーダーのユニフォームを保存
    sun.userData.shaders = {
        core: coreMaterial,
        innerGlow: innerGlowMaterial,
        corona: coronaMaterial,
        flare: flareMaterial
    };
    
    createSunParticles();
}

function createSunParticles() {
    // より動的なプラズマ噴出パーティクル
    const geometry = new THREE.BufferGeometry();
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.3;
        const radius = 20 + Math.random() * 5;
        
        positions[i * 3] = Math.cos(angle) * Math.cos(elevation) * radius;
        positions[i * 3 + 1] = Math.sin(elevation) * radius;
        positions[i * 3 + 2] = Math.sin(angle) * Math.cos(elevation) * radius;
        
        // より複雑な速度パターン
        const speed = 0.5 + Math.random() * 1.5;
        const turbulence = Math.random() * 0.3;
        velocities[i * 3] = Math.cos(angle) * speed + (Math.random() - 0.5) * turbulence;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * speed * 0.8;
        velocities[i * 3 + 2] = Math.sin(angle) * speed + (Math.random() - 0.5) * turbulence;
        
        // 温度による色のグラデーション（明度を抑える）
        const temp = Math.random();
        const color = getParticleColor(temp);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        sizes[i] = Math.random() * 2.5 + 0.5;
        lifetimes[i] = Math.random();
        opacities[i] = 0.6 + Math.random() * 0.4;
        phases[i] = Math.random() * Math.PI * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        depthWrite: false,
        map: createCircleTexture()
    });
    
    const particles = new THREE.Points(geometry, material);
    sun.add(particles);
    particleSystems.push({ particles, type: 'sun' });
    
    // ダイナミックなコロナループパーティクル
    const loopGeometry = new THREE.BufferGeometry();
    const loopCount = 2000;
    const loopPositions = new Float32Array(loopCount * 3);
    const loopColors = new Float32Array(loopCount * 3);
    
    for (let i = 0; i < loopCount; i++) {
        const t = i / loopCount;
        const angle = t * Math.PI * 2 * (2 + Math.random() * 2);
        const radius = 22 + Math.sin(angle * 0.5) * 8; // 範囲を狭める
        const height = Math.sin(angle) * 15; // 高さを抑える
        
        loopPositions[i * 3] = Math.cos(angle) * radius;
        loopPositions[i * 3 + 1] = height;
        loopPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        const color = new THREE.Color();
        color.setHSL(0.05 + Math.random() * 0.1, 0.8, 0.5); // 明度を下げる
        loopColors[i * 3] = color.r;
        loopColors[i * 3 + 1] = color.g;
        loopColors[i * 3 + 2] = color.b;
    }
    
    loopGeometry.setAttribute('position', new THREE.BufferAttribute(loopPositions, 3));
    loopGeometry.setAttribute('color', new THREE.BufferAttribute(loopColors, 3));
    
    const loopMaterial = new THREE.PointsMaterial({
        size: 1, // サイズを小さく
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.3, // 透明度を下げる
        depthWrite: false
    });
    
    const loopParticles = new THREE.Points(loopGeometry, loopMaterial);
    sun.add(loopParticles);
    particleSystems.push({ particles: loopParticles, type: 'corona' });
}

function createPlanets() {
    planetData.forEach((data) => {
        const planetGroup = new THREE.Group();
        
        const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
        const texture = createPlanetTexture(data.name, data.color);
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            emissive: data.color,
            emissiveIntensity: 0.05,
            shininess: data.name === 'Earth' ? 100 : 30,
            bumpScale: 0.05
        });
        
        const planet = new THREE.Mesh(geometry, material);
        planet.castShadow = true;
        planet.receiveShadow = true;
        planetGroup.add(planet);
        
        if (data.hasRings) {
            createRings(planet, data.radius);
        }
        
        createOrbit(data.distance);
        
        createPlanetTrail(planetGroup, data.color);
        
        if (data.moons) {
            data.moons.forEach(moonData => {
                createMoon(planetGroup, moonData);
            });
        }
        
        planets.push({
            group: planetGroup,
            mesh: planet,
            data: data,
            angle: Math.random() * Math.PI * 2
        });
        
        scene.add(planetGroup);
        
        createLabel(data.name, planetGroup);
    });
}

function createRings(planet, radius) {
    const innerRadius = radius * 1.5;
    const outerRadius = radius * 2.5;
    
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    
    const rings = new THREE.Mesh(geometry, material);
    rings.rotation.x = Math.PI / 2;
    planet.add(rings);
    
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 10000;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = innerRadius + Math.random() * (outerRadius - innerRadius);
        
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.5,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const ringParticles = new THREE.Points(particleGeometry, particleMaterial);
    planet.add(ringParticles);
}

function createOrbit(radius) {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2
    });
    
    const orbit = new THREE.Line(geometry, material);
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);
    orbits.push(orbit);
}

function createPlanetTrail(planet, color) {
    const geometry = new THREE.BufferGeometry();
    const trailLength = 100;
    const positions = new Float32Array(trailLength * 3);
    const colors = new Float32Array(trailLength * 3);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const trail = new THREE.Line(geometry, material);
    scene.add(trail);
    
    planet.trail = trail;
    planet.trailPositions = [];
    planet.trailColor = new THREE.Color(color);
}

function createMoon(planetGroup, moonData) {
    const moonGroup = new THREE.Group();
    
    const geometry = new THREE.SphereGeometry(moonData.radius, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: moonData.color,
        emissive: moonData.color,
        emissiveIntensity: 0.05
    });
    
    const moon = new THREE.Mesh(geometry, material);
    moon.castShadow = true;
    moon.receiveShadow = true;
    moonGroup.add(moon);
    
    moons.push({
        group: moonGroup,
        mesh: moon,
        data: moonData,
        angle: Math.random() * Math.PI * 2,
        parent: planetGroup
    });
    
    planetGroup.add(moonGroup);
}

function createLights() {
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);
    
    const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
}

function createComet() {
    // 彗星のグループ
    const cometGroup = new THREE.Group();
    
    // 彗星の核（コア）
    const coreGeometry = new THREE.IcosahedronGeometry(4, 1);  // サイズを大きく
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        emissive: 0x666666,  // より明るく
        emissiveIntensity: 0.8,
        roughness: 0.8
    });
    const cometCore = new THREE.Mesh(coreGeometry, coreMaterial);
    cometGroup.add(cometCore);
    
    // コマ（彗星の頭部の輝き）
    const comaGeometry = new THREE.SphereGeometry(12, 16, 16);  // サイズを大きく
    const comaMaterial = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.5,  // より見やすく
        blending: THREE.AdditiveBlending
    });
    const coma = new THREE.Mesh(comaGeometry, comaMaterial);
    cometGroup.add(coma);
    
    // 彗星の尾のパーティクルシステム
    createCometTail(cometGroup);
    
    // 彗星の軌道を作成
    createCometOrbit();
    
    comet = {
        group: cometGroup,
        core: cometCore,
        coma: coma,
        angle: 0 // 近日点から開始
    };
    
    scene.add(cometGroup);
    createLabel('Halley\'s Comet', cometGroup);
}

function createCometTail(cometGroup) {
    // イオンテール（青い尾）
    const ionTailGeometry = new THREE.BufferGeometry();
    const ionParticleCount = 5000;
    const ionPositions = new Float32Array(ionParticleCount * 3);
    const ionColors = new Float32Array(ionParticleCount * 3);
    const ionSizes = new Float32Array(ionParticleCount);
    
    for (let i = 0; i < ionParticleCount; i++) {
        // 初期位置は彗星の位置
        ionPositions[i * 3] = 0;
        ionPositions[i * 3 + 1] = 0;
        ionPositions[i * 3 + 2] = 0;
        
        // 青っぽい色
        const intensity = Math.random();
        ionColors[i * 3] = 0.3 + intensity * 0.3;
        ionColors[i * 3 + 1] = 0.6 + intensity * 0.4;
        ionColors[i * 3 + 2] = 1.0;
        
        ionSizes[i] = Math.random() * 3 + 1;
    }
    
    ionTailGeometry.setAttribute('position', new THREE.BufferAttribute(ionPositions, 3));
    ionTailGeometry.setAttribute('color', new THREE.BufferAttribute(ionColors, 3));
    ionTailGeometry.setAttribute('size', new THREE.BufferAttribute(ionSizes, 1));
    
    const ionTailMaterial = new THREE.PointsMaterial({
        size: 3,  // より大きく
        vertexColors: true,
        transparent: true,
        opacity: 0.8,  // より目立つように
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: createStarTexture()
    });
    
    const ionTail = new THREE.Points(ionTailGeometry, ionTailMaterial);
    cometGroup.add(ionTail);
    
    // ダストテール（黄色い尾）
    const dustTailGeometry = new THREE.BufferGeometry();
    const dustParticleCount = 3000;
    const dustPositions = new Float32Array(dustParticleCount * 3);
    const dustColors = new Float32Array(dustParticleCount * 3);
    const dustSizes = new Float32Array(dustParticleCount);
    
    for (let i = 0; i < dustParticleCount; i++) {
        dustPositions[i * 3] = 0;
        dustPositions[i * 3 + 1] = 0;
        dustPositions[i * 3 + 2] = 0;
        
        // 黄色っぽい色
        const intensity = Math.random();
        dustColors[i * 3] = 1.0;
        dustColors[i * 3 + 1] = 0.8 + intensity * 0.2;
        dustColors[i * 3 + 2] = 0.4 + intensity * 0.3;
        
        dustSizes[i] = Math.random() * 4 + 2;
    }
    
    dustTailGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustTailGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    dustTailGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));
    
    const dustTailMaterial = new THREE.PointsMaterial({
        size: 4,  // より大きく
        vertexColors: true,
        transparent: true,
        opacity: 0.6,  // より目立つように
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: createStarTexture()
    });
    
    const dustTail = new THREE.Points(dustTailGeometry, dustTailMaterial);
    cometGroup.add(dustTail);
    
    // パーティクルシステムに追加
    particleSystems.push({ 
        particles: ionTail, 
        type: 'cometIonTail',
        geometry: ionTailGeometry
    });
    particleSystems.push({ 
        particles: dustTail, 
        type: 'cometDustTail',
        geometry: dustTailGeometry
    });
}

function createCometOrbit() {
    // 楕円軌道の作成
    const points = [];
    const segments = 200;
    
    for (let i = 0; i <= segments; i++) {
        const meanAnomaly = (i / segments) * Math.PI * 2;
        let eccentricAnomaly = meanAnomaly;
        
        // ニュートン法で離心近点角を計算
        for (let j = 0; j < 5; j++) {
            eccentricAnomaly = meanAnomaly + cometData.eccentricity * Math.sin(eccentricAnomaly);
        }
        
        // 真近点角の計算
        const trueAnomaly = 2 * Math.atan2(
            Math.sqrt(1 + cometData.eccentricity) * Math.sin(eccentricAnomaly / 2),
            Math.sqrt(1 - cometData.eccentricity) * Math.cos(eccentricAnomaly / 2)
        );
        
        // 動径の計算
        const radius = cometData.perihelion * (1 + cometData.eccentricity) / 
                      (1 + cometData.eccentricity * Math.cos(trueAnomaly));
        
        // 3D位置の計算
        const x = radius * Math.cos(trueAnomaly);
        const z = radius * Math.sin(trueAnomaly);
        const y = z * Math.sin(cometData.inclination);
        
        points.push(new THREE.Vector3(x, y, z * Math.cos(cometData.inclination)));
    }
    
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        opacity: 0.5,
        transparent: true
    });
    
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);
    orbits.push(orbitLine);
}

function createLabel(text, object) {
    const label = document.createElement('div');
    label.className = 'planet-label';
    label.textContent = text;
    label.style.display = 'block';
    label.style.position = 'absolute';
    document.body.appendChild(label);
    
    // 惑星データを取得してラベルに保存
    const planetInfo = planetData.find(p => p.name === text);
    
    labels.push({ 
        element: label, 
        object: object,
        name: text,
        radius: planetInfo ? planetInfo.radius : 5
    });
}

function updateLabels() {
    const showLabels = document.getElementById('showLabels').checked;
    
    labels.forEach((label) => {
        if (showLabels) {
            // ワールド座標を取得（planetGroupの実際の位置）
            const worldPosition = new THREE.Vector3();
            label.object.getWorldPosition(worldPosition);
            
            // 少し上にオフセットを追加（惑星の上に表示）
            worldPosition.y += label.radius + 8;
            
            // スクリーン座標に変換
            const vector = worldPosition.clone();
            vector.project(camera);
            
            // カメラの視界内にあるかチェック
            if (vector.z > 1) {
                label.element.style.display = 'none';
                return;
            }
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            label.element.style.left = x + 'px';
            label.element.style.top = y + 'px';
            label.element.style.transform = 'translate(-50%, -50%)';
            label.element.style.display = 'block';
            
            // 距離に応じてラベルのサイズを調整
            const distance = worldPosition.distanceTo(camera.position);
            const scale = Math.min(1.5, 400 / distance);
            label.element.style.fontSize = `${16 * scale}px`;
            label.element.style.opacity = Math.min(1, scale * 1.2);
        } else {
            label.element.style.display = 'none';
        }
    });
}

function setupEventListeners() {
    // メニューのトグル機能
    const menuToggle = document.getElementById('menu-toggle');
    const infoPanel = document.getElementById('info');
    
    menuToggle.addEventListener('click', () => {
        infoPanel.classList.toggle('collapsed');
    });
    
    // 既存のイベントリスナー
    document.getElementById('showOrbits').addEventListener('change', (e) => {
        orbits.forEach(orbit => orbit.visible = e.target.checked);
    });
    
    document.getElementById('speed').addEventListener('input', (e) => {
        speedMultiplier = parseFloat(e.target.value);
        const speedValue = document.querySelector('.speed-value');
        if (speedValue) {
            speedValue.textContent = `${speedMultiplier.toFixed(1)}x`;
        }
    });
    
    // Camera view switching
    document.getElementById('camera-view').addEventListener('change', (e) => {
        switchCameraView(e.target.value);
    });
}

function updateParticles() {
    particleSystems.forEach(system => {
        if (system.type === 'sun') {
            const positions = system.particles.geometry.attributes.position.array;
            const velocities = system.particles.geometry.attributes.velocity.array;
            const lifetimes = system.particles.geometry.attributes.lifetime.array;
            const opacities = system.particles.geometry.attributes.opacity.array;
            
            for (let i = 0; i < positions.length / 3; i++) {
                // パーティクルの位置を更新（控えめに）
                positions[i * 3] += velocities[i * 3] * 0.2;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.2;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.2;
                
                // パーティクルの寿命を更新
                lifetimes[i] -= 0.01;
                
                // 距離に応じて透明度を減衰
                const distance = Math.sqrt(
                    positions[i * 3] * positions[i * 3] + 
                    positions[i * 3 + 1] * positions[i * 3 + 1] + 
                    positions[i * 3 + 2] * positions[i * 3 + 2]
                );
                
                // 距離に基づいて透明度を計算（遠いほど透明に）
                const maxDistance = 50; // 最大距離を短く
                const fadeStart = 25; // フェード開始距離
                if (distance > fadeStart) {
                    const fadeRatio = 1 - ((distance - fadeStart) / (maxDistance - fadeStart));
                    opacities[i] = Math.max(0, fadeRatio * (0.3 + Math.random() * 0.3));
                }
                
                // パーティクルが遠くに行きすぎたらリセット
                if (distance > maxDistance || lifetimes[i] <= 0) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 20 + Math.random() * 3;
                    positions[i * 3] = Math.cos(angle) * radius;
                    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
                    positions[i * 3 + 2] = Math.sin(angle) * radius;
                    
                    const speed = 0.3 + Math.random() * 0.7;
                    velocities[i * 3] = Math.cos(angle) * speed;
                    velocities[i * 3 + 1] = (Math.random() - 0.5) * speed * 0.5;
                    velocities[i * 3 + 2] = Math.sin(angle) * speed;
                    
                    lifetimes[i] = 1.0;
                    opacities[i] = 0.3 + Math.random() * 0.3;
                }
            }
            
            system.particles.geometry.attributes.position.needsUpdate = true;
            system.particles.geometry.attributes.lifetime.needsUpdate = true;
            system.particles.geometry.attributes.opacity.needsUpdate = true;
            system.particles.rotation.y += 0.001;
        } else if (system.type === 'corona') {
            system.particles.rotation.y += 0.001; // 回転速度を下げる
            system.particles.rotation.x = Math.sin(time * 0.3) * 0.05; // 動きを小さく
        }
    });
}

function updateTrails() {
    planets.forEach(planet => {
        if (planet.group.trail && planet.group.trailPositions) {
            const position = planet.group.position.clone();
            planet.group.trailPositions.push(position);
            
            if (planet.group.trailPositions.length > 100) {
                planet.group.trailPositions.shift();
            }
            
            const positions = planet.group.trail.geometry.attributes.position.array;
            const colors = planet.group.trail.geometry.attributes.color.array;
            
            planet.group.trailPositions.forEach((pos, index) => {
                positions[index * 3] = pos.x;
                positions[index * 3 + 1] = pos.y;
                positions[index * 3 + 2] = pos.z;
                
                const alpha = index / planet.group.trailPositions.length;
                colors[index * 3] = planet.group.trailColor.r * alpha;
                colors[index * 3 + 1] = planet.group.trailColor.g * alpha;
                colors[index * 3 + 2] = planet.group.trailColor.b * alpha;
            });
            
            planet.group.trail.geometry.attributes.position.needsUpdate = true;
            planet.group.trail.geometry.attributes.color.needsUpdate = true;
        }
    });
}

function updateComet() {
    // 彗星の軌道運動（ケプラーの法則に基づく）
    // 平均運動 n = 2π / T (T = 周期)
    const meanMotion = (2 * Math.PI) / (cometData.orbitalPeriod * 365);  // 日単位
    comet.angle += meanMotion * speedMultiplier * 0.1;  // スケール調整
    
    // 楕円軌道の計算
    const meanAnomaly = comet.angle;
    let eccentricAnomaly = meanAnomaly;
    
    // ニュートン法で離心近点角を計算
    for (let i = 0; i < 5; i++) {
        eccentricAnomaly = meanAnomaly + cometData.eccentricity * Math.sin(eccentricAnomaly);
    }
    
    // 真近点角の計算
    const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + cometData.eccentricity) * Math.sin(eccentricAnomaly / 2),
        Math.sqrt(1 - cometData.eccentricity) * Math.cos(eccentricAnomaly / 2)
    );
    
    // 動径の計算
    const radius = cometData.perihelion * (1 + cometData.eccentricity) / 
                  (1 + cometData.eccentricity * Math.cos(trueAnomaly));
    
    // 3D位置の計算
    const x = radius * Math.cos(trueAnomaly);
    const z = radius * Math.sin(trueAnomaly);
    const y = z * Math.sin(cometData.inclination);
    
    comet.group.position.set(x, y, z * Math.cos(cometData.inclination));
    
    // 太陽からの距離を計算
    const distanceFromSun = comet.group.position.length();
    
    // 彗星の尾を更新
    updateCometTail(distanceFromSun, trueAnomaly);
    
    // コマのサイズを距離に応じて調整
    const comaScale = Math.max(0.5, 2 - distanceFromSun / 200);
    comet.coma.scale.setScalar(comaScale);
    comet.coma.material.opacity = Math.max(0.1, 0.5 - distanceFromSun / 400);
    
    // デバッグ用：彗星の位置を確認
    if (Math.random() < 0.01) {  // 1%の確率でログ出力
        console.log('Comet position:', comet.group.position);
        console.log('Distance from Sun:', distanceFromSun);
    }
}

function updateCometTail(distanceFromSun, trueAnomaly) {
    // 太陽からの距離に基づいて尾の長さと強度を計算
    const tailIntensity = Math.max(0, 1 - distanceFromSun / 200);  // より近い距離で反応
    const tailLength = tailIntensity * 150;  // より長い尾
    
    // 太陽と反対方向のベクトルを計算
    const sunDirection = comet.group.position.clone().normalize().negate();
    
    particleSystems.forEach(system => {
        if (system.type === 'cometIonTail' || system.type === 'cometDustTail') {
            const positions = system.geometry.attributes.position.array;
            const particleCount = positions.length / 3;
            
            for (let i = 0; i < particleCount; i++) {
                const progress = i / particleCount;
                
                if (system.type === 'cometIonTail') {
                    // イオンテール：太陽風に直接影響される
                    const spread = progress * 10;
                    positions[i * 3] = sunDirection.x * progress * tailLength + 
                                     (Math.random() - 0.5) * spread;
                    positions[i * 3 + 1] = sunDirection.y * progress * tailLength + 
                                         (Math.random() - 0.5) * spread;
                    positions[i * 3 + 2] = sunDirection.z * progress * tailLength + 
                                         (Math.random() - 0.5) * spread;
                } else {
                    // ダストテール：軌道に沿って曲がる
                    const curve = Math.sin(progress * Math.PI) * 20;
                    const spread = progress * 15;
                    
                    positions[i * 3] = sunDirection.x * progress * tailLength * 0.8 + 
                                     Math.sin(trueAnomaly) * curve +
                                     (Math.random() - 0.5) * spread;
                    positions[i * 3 + 1] = sunDirection.y * progress * tailLength * 0.8 + 
                                         (Math.random() - 0.5) * spread;
                    positions[i * 3 + 2] = sunDirection.z * progress * tailLength * 0.8 - 
                                         Math.cos(trueAnomaly) * curve +
                                         (Math.random() - 0.5) * spread;
                }
            }
            
            system.geometry.attributes.position.needsUpdate = true;
            
            // 透明度を調整
            system.particles.material.opacity = tailIntensity * 
                (system.type === 'cometIonTail' ? 0.8 : 0.6);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function switchCameraView(mode) {
    cameraMode = mode;
    
    if (mode === 'free') {
        cameraTarget = null;
        controls.enabled = true;
        startCameraTransition(null);
    } else {
        controls.enabled = false;
        
        // Find the target object
        if (mode === 'sun') {
            cameraTarget = sun;
        } else if (mode === 'comet') {
            cameraTarget = comet ? comet.group : null;
        } else {
            const planet = planets.find(p => p.data.name.toLowerCase() === mode);
            cameraTarget = planet ? planet.group : null;
        }
        
        if (cameraTarget) {
            startCameraTransition(cameraTarget);
        }
    }
}

function startCameraTransition(target) {
    cameraTransition.active = true;
    cameraTransition.startTime = Date.now();
    cameraTransition.from = {
        position: camera.position.clone(),
        rotation: camera.rotation.clone()
    };
    
    if (target) {
        const targetPos = new THREE.Vector3();
        target.getWorldPosition(targetPos);
        
        // Calculate camera position relative to target
        const distance = cameraMode === 'sun' ? 200 : 50;
        const offset = new THREE.Vector3(distance, distance * 0.5, distance);
        
        cameraTransition.to = {
            position: targetPos.clone().add(offset),
            lookAt: targetPos
        };
    } else {
        // Return to free camera position
        cameraTransition.to = {
            position: new THREE.Vector3(0, 200, 400),
            lookAt: new THREE.Vector3(0, 0, 0)
        };
    }
}

function updateCameraPosition() {
    if (cameraMode === 'free' || !cameraTarget) return;
    
    const targetPos = new THREE.Vector3();
    cameraTarget.getWorldPosition(targetPos);
    
    if (cameraTransition.active) {
        // Handle smooth transition
        const elapsed = Date.now() - cameraTransition.startTime;
        const progress = Math.min(elapsed / cameraTransition.duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        if (progress >= 1) {
            cameraTransition.active = false;
        }
        
        // Interpolate position
        if (cameraTransition.from && cameraTransition.to) {
            camera.position.lerpVectors(
                cameraTransition.from.position,
                cameraTransition.to.position,
                easeProgress
            );
            
            // Look at target
            const lookAtPos = cameraTransition.to.lookAt.clone();
            if (cameraMode !== 'free') {
                lookAtPos.lerp(targetPos, easeProgress);
            }
            camera.lookAt(lookAtPos);
        }
    } else {
        // Follow mode - camera follows the target
        const distance = cameraMode === 'sun' ? 200 : 50;
        const angle = Date.now() * 0.0001; // Slow rotation around target
        
        // Calculate offset based on target type
        let offset;
        if (cameraMode === 'comet') {
            // For comet, position camera behind and above relative to its motion
            const velocity = new THREE.Vector3();
            if (comet && comet.previousPosition) {
                velocity.subVectors(targetPos, comet.previousPosition).normalize();
            } else {
                velocity.set(1, 0, 0);
            }
            
            offset = velocity.multiplyScalar(-distance);
            offset.y = distance * 0.3;
        } else if (cameraMode === 'sun') {
            // Orbit around sun
            offset = new THREE.Vector3(
                Math.cos(angle) * distance,
                distance * 0.5,
                Math.sin(angle) * distance
            );
        } else {
            // For planets, position camera to see orbital motion
            const planet = planets.find(p => p.data.name.toLowerCase() === cameraMode);
            if (planet) {
                const orbitAngle = planet.angle - Math.PI / 4; // Slightly behind
                offset = new THREE.Vector3(
                    Math.cos(orbitAngle) * distance,
                    distance * 0.4,
                    Math.sin(orbitAngle) * distance
                );
            } else {
                offset = new THREE.Vector3(distance, distance * 0.5, distance);
            }
        }
        
        camera.position.copy(targetPos).add(offset);
        camera.lookAt(targetPos);
    }
    
    // Store previous position for velocity calculation
    if (cameraMode === 'comet' && comet) {
        comet.previousPosition = targetPos.clone();
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01 * speedMultiplier;
    
    sun.rotation.y += 0.001 * speedMultiplier;
    
    // 太陽のシェーダーアニメーション
    if (sun.userData.shaders) {
        sun.userData.shaders.core.uniforms.time.value = time;
        sun.userData.shaders.innerGlow.uniforms.time.value = time;
        sun.userData.shaders.corona.uniforms.time.value = time;
        sun.userData.shaders.flare.uniforms.time.value = time;
    }
    
    planets.forEach(planet => {
        planet.angle += planet.data.speed * speedMultiplier;
        planet.group.position.x = Math.cos(planet.angle) * planet.data.distance;
        planet.group.position.z = Math.sin(planet.angle) * planet.data.distance;
        
        planet.mesh.rotation.y += planet.data.rotationSpeed * speedMultiplier;
    });
    
    moons.forEach(moon => {
        moon.angle += moon.data.speed * speedMultiplier;
        moon.group.position.x = Math.cos(moon.angle) * moon.data.distance;
        moon.group.position.z = Math.sin(moon.angle) * moon.data.distance;
        
        moon.mesh.rotation.y += 0.02 * speedMultiplier;
    });
    
    // 彗星のアニメーション
    if (comet) {
        updateComet();
    }
    
    updateParticles();
    updateTrails();
    updateLabels();
    updateCameraPosition();
    
    if (cameraMode === 'free') {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

init();
animate();