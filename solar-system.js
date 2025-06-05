import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let sun, planets = [], moons = [];
let particleSystems = [];
let orbits = [];
let labels = [];
let time = 0;
let speedMultiplier = 1;
let lastCameraPosition = new THREE.Vector3();

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
    
    createStarfield();
    createSun();
    createPlanets();
    createLights();
    
    setupEventListeners();
    window.addEventListener('resize', onWindowResize);
}

function createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    
    for (let i = 0; i < 10000; i++) {
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        const radius = 2000 + Math.random() * 1000;
        
        vertices.push(
            radius * Math.sin(angle2) * Math.cos(angle1),
            radius * Math.sin(angle2) * Math.sin(angle1),
            radius * Math.cos(angle2)
        );
        
        const color = new THREE.Color();
        color.setHSL(0.6 + Math.random() * 0.4, 0.2, 0.5 + Math.random() * 0.5);
        colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
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
    // プラズマ噴出パーティクル（控えめに調整）
    const geometry = new THREE.BufferGeometry();
    const particleCount = 3000; // 数を減らす
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 3; // より太陽に近い位置から開始
        const height = (Math.random() - 0.5) * 30; // 高さの範囲を狭める
        
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 外向きの速度（控えめに）
        const speed = 0.3 + Math.random() * 0.7; // 速度を下げる
        velocities[i * 3] = Math.cos(angle) * speed;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * speed * 0.5;
        velocities[i * 3 + 2] = Math.sin(angle) * speed;
        
        // 温度による色のグラデーション（明度を抑える）
        const temp = Math.random();
        const color = getParticleColor(temp);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        sizes[i] = Math.random() * 1.5 + 0.5; // サイズを小さく
        lifetimes[i] = Math.random();
        opacities[i] = 0.3 + Math.random() * 0.3; // 初期透明度を設定
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    const material = new THREE.PointsMaterial({
        size: 1, // 基本サイズを小さく
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.4, // 全体の透明度を下げる
        sizeAttenuation: true,
        depthWrite: false // 深度バッファへの書き込みを無効化
    });
    
    const particles = new THREE.Points(geometry, material);
    sun.add(particles);
    particleSystems.push({ particles, type: 'sun' });
    
    // コロナループパーティクル（控えめに調整）
    const loopGeometry = new THREE.BufferGeometry();
    const loopCount = 1000; // 数を減らす
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
        const material = new THREE.MeshPhongMaterial({
            color: data.color,
            emissive: data.color,
            emissiveIntensity: 0.1,
            shininess: 30
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
    
    // カメラが移動していない場合はスキップ
    if (camera.position.equals(lastCameraPosition) && labels.length > 0) {
        return;
    }
    lastCameraPosition.copy(camera.position);
    
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
        } else {
            label.element.style.display = 'none';
        }
    });
}

function setupEventListeners() {
    document.getElementById('showOrbits').addEventListener('change', (e) => {
        orbits.forEach(orbit => orbit.visible = e.target.checked);
    });
    
    document.getElementById('speed').addEventListener('input', (e) => {
        speedMultiplier = parseFloat(e.target.value);
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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
    
    updateParticles();
    updateTrails();
    updateLabels();
    
    controls.update();
    renderer.render(scene, camera);
}

init();
animate();