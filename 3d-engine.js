/* global THREE, sceneData */

class JulesSubwayScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.stageElement = canvas ? canvas.parentElement : null;
        this.data = sceneData;

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.clock = null;

        this.mapElevation = this.data.map.elevation;
        this.mapGroup = new THREE.Group();
        this.mapBaseY = this.mapElevation;

        this.trackCurve = null;
        this.trackMesh = null;
        this.trackGlow = null;

        this.subwayTrain = null;
        this.trainProgress = 0;
        this.baseTrainSpeed = this.data.train.speed;
        this.trainSpeed = this.baseTrainSpeed;
        this.lastArrivedStationIndex = null;

        this.subwayStations = [];
        this.stationLights = [];

        this.cameraBasePosition = new THREE.Vector3(
            this.data.camera.basePosition.x,
            this.data.camera.basePosition.y,
            this.data.camera.basePosition.z
        );
        this.cameraTarget = new THREE.Vector3(0, this.mapElevation + 20, 0);
        this.pointer = new THREE.Vector2(0, 0);
        this.pointerTarget = new THREE.Vector2(0, 0);

        this.resizeObserver = null;
        this.prefersReducedMotion = false;
        this.animationActive = false;
        this.isInitialized = false;

        this.floatingParticles = null;
        this.trainTrail = null;

        this.colors = this.data.colors;

        this.onWindowResize = this.onWindowResize.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerLeave = this.onPointerLeave.bind(this);
    }

    init() {
        if (this.isInitialized) return;

        if (!this.setupCanvas()) {
            return;
        }

        try {
            this.setupRenderer();
            this.setupScene();
            this.setupCamera();
            this.setupLights();
            this.createSubwayMap();
            this.createSubwayNetwork();
            this.createSubwayStations();
            this.createSubwayTrain();
            this.enhanceStationLighting();
            this.createTrainParticleTrail();
            this.addTrainSounds();
            this.createFloatingParticles();
            this.createInteractiveElements();
            this.setupEventListeners();
            this.optimizePerformance();
            this.reduceMotionForAccessibility();
            this.startAnimation();

            this.isInitialized = true;
            console.log('🚇 Jules AI 3D engine ready.');
        } catch (error) {
            console.error('Error initialising NYC subway scene', error);
        }
    }

    setupCanvas() {
        if (!this.canvas) {
            this.canvas = document.getElementById('three-canvas');
            this.stageElement = this.canvas ? this.canvas.parentElement : null;
        }

        if (!this.canvas) {
            console.warn('3D canvas element not found; skipping NYC subway scene.');
            return false;
        }

        if (typeof THREE === 'undefined') {
            console.warn('Three.js is not available; cannot initialise NYC subway scene.');
            return false;
        }

        const prefersMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        if (prefersMotionQuery) {
            this.prefersReducedMotion = prefersMotionQuery.matches;
            const handleChange = (event) => {
                this.prefersReducedMotion = event.matches;
                this.updateMotionPreferences();
            };
            if (typeof prefersMotionQuery.addEventListener === 'function') {
                prefersMotionQuery.addEventListener('change', handleChange);
            } else if (typeof prefersMotionQuery.addListener === 'function') {
                prefersMotionQuery.addListener(handleChange);
            }
        }
        this.updateMotionPreferences();

        return true;
    }

    updateMotionPreferences() {
        this.trainSpeed = this.prefersReducedMotion ? this.baseTrainSpeed * 0.35 : this.baseTrainSpeed;
        this.mapFloatAmplitude = this.prefersReducedMotion ? 1.6 : this.data.map.floatAmplitude;
    }

    getCanvasSize() {
        if (this.stageElement) {
            const rect = this.stageElement.getBoundingClientRect();
            return {
                width: Math.max(rect.width, 320),
                height: Math.max(rect.height, 240)
            };
        }
        return {
            width: this.canvas.clientWidth || window.innerWidth,
            height: this.canvas.clientHeight || window.innerHeight * 0.7
        };
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        const { width, height } = this.getCanvasSize();
        this.renderer.setSize(width, height, false);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x020617, 220, 900);
        this.scene.add(this.mapGroup);
    }

    setupCamera() {
        const { width, height } = this.getCanvasSize();
        this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 2000);
        this.camera.position.copy(this.cameraBasePosition);
        this.camera.lookAt(this.cameraTarget);
        this.scene.add(this.camera);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
        keyLight.position.set(180, 260, 200);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 10;
        keyLight.shadow.camera.far = 1000;
        this.scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x89CFF0, 0.45);
        rimLight.position.set(-220, 200, -180);
        this.scene.add(rimLight);

        const accentColors = Object.values(this.colors);
        accentColors.forEach((color, index) => {
            const point = new THREE.PointLight(color, 0.6, 320, 2);
            const angle = (index / accentColors.length) * Math.PI * 2;
            point.position.set(Math.cos(angle) * 240, 120, Math.sin(angle) * 240);
            this.scene.add(point);
        });

        this.renderer.setClearColor(0x010409, 0);
    }

    createSubwayMap() {
        const loader = new THREE.TextureLoader();
        loader.load(
            this.data.map.imageUrl,
            (texture) => {
                if (!this.renderer) return;
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                texture.encoding = THREE.sRGBEncoding;

                const mapGeometry = new THREE.PlaneGeometry(this.data.map.width, this.data.map.height);
                const mapMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.96,
                    roughness: 0.65,
                    metalness: 0.15
                });
                const mapPlane = new THREE.Mesh(mapGeometry, mapMaterial);
                mapPlane.rotation.x = -Math.PI / 2;
                mapPlane.position.y = this.mapElevation;
                mapPlane.receiveShadow = true;
                this.mapGroup.add(mapPlane);

                const frame = new THREE.LineSegments(
                    new THREE.EdgesGeometry(mapGeometry),
                    new THREE.LineBasicMaterial({ color: 0x172554, transparent: true, opacity: 0.35 })
                );
                frame.rotation.x = -Math.PI / 2;
                frame.position.y = this.mapElevation + 0.6;
                this.mapGroup.add(frame);

                const glowPlane = new THREE.Mesh(
                    new THREE.PlaneGeometry(840, 540),
                    new THREE.MeshBasicMaterial({ color: 0x0039A6, transparent: true, opacity: 0.12 })
                );
                glowPlane.rotation.x = -Math.PI / 2;
                glowPlane.position.y = this.mapElevation - 3;
                this.mapGroup.add(glowPlane);
            },
            undefined,
            (error) => console.error('Failed to load NYC subway map texture', error)
        );
    }

    createSubwayNetwork() {
        const elevation = this.mapElevation + this.data.track.elevation;
        const points = this.data.track.points.map(p => new THREE.Vector3(p.x, elevation, p.z));

        this.trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

        const tubeGeometry = new THREE.TubeGeometry(this.trackCurve, 600, 4.6, 24, true);
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: this.data.track.color,
            emissive: this.data.track.emissive,
            emissiveIntensity: this.data.track.emissiveIntensity,
            metalness: 0.75,
            roughness: 0.25
        });
        this.trackMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.trackMesh.castShadow = true;
        this.trackMesh.receiveShadow = true;
        this.scene.add(this.trackMesh);

        const glowGeometry = new THREE.BufferGeometry().setFromPoints(this.trackCurve.getPoints(600));
        const glowMaterial = new THREE.LineBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.35 });
        this.trackGlow = new THREE.LineLoop(glowGeometry, glowMaterial);
        this.scene.add(this.trackGlow);
    }

    createSubwayStations() {
        if (!this.trackCurve) return;

        const stations = this.data.stations.map(s => ({
            ...s,
            color: this.colors[s.color]
        }));

        const textCanvas = (label) => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(10, 18, 38, 0.88)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 48px "Poppins", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, canvas.width / 2, canvas.height / 2);
            return canvas;
        };

        this.subwayStations = stations.map((station) => {
            const point = this.trackCurve.getPointAt(station.t);
            const elevated = point.clone().setY(point.y + 8);

            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(6, 24, 24),
                new THREE.MeshStandardMaterial({
                    color: station.color,
                    emissive: station.color,
                    emissiveIntensity: 0.5,
                    metalness: 0.2,
                    roughness: 0.4
                })
            );
            marker.position.copy(elevated);
            marker.castShadow = true;
            this.scene.add(marker);

            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(2.2, 2.2, elevated.y - this.mapElevation, 20),
                new THREE.MeshStandardMaterial({ color: station.color, transparent: true, opacity: 0.38 })
            );
            pillar.position.set(point.x, (elevated.y + this.mapElevation) / 2, point.z);
            this.scene.add(pillar);

            const texture = new THREE.CanvasTexture(textCanvas(station.name));
            texture.encoding = THREE.sRGBEncoding;
            const label = new THREE.Sprite(
                new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 })
            );
            label.position.copy(elevated.clone().setY(elevated.y + 18));
            label.scale.set(120, 32, 1);
            this.scene.add(label);

            return {
                name: station.name,
                color: station.color,
                t: station.t,
                marker,
                label,
                pillar,
                arrivalPulse: 0
            };
        });
    }

    createSubwayTrain() {
        if (!this.trackCurve) return;

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.data.train.bodyColor,
            metalness: 0.6,
            roughness: 0.35,
            emissive: 0x111827,
            emissiveIntensity: 0.35
        });
        const carBody = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 60), bodyMaterial);
        carBody.castShadow = true;
        carBody.receiveShadow = true;

        const roof = new THREE.Mesh(
            new THREE.CylinderGeometry(12, 12, 24, 32, 1, true, 0, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide })
        );
        roof.rotation.z = Math.PI / 2;
        roof.position.y = 8;

        const windowMaterial = new THREE.MeshStandardMaterial({
            color: this.data.train.windowColor,
            roughness: 0.15,
            metalness: 0.4,
            transparent: true,
            opacity: 0.75,
            emissive: 0x38BDF8,
            emissiveIntensity: 0.55
        });
        const sideWindows = new THREE.Mesh(new THREE.PlaneGeometry(40, 5), windowMaterial);
        sideWindows.position.set(0, 5, 15);

        const frontWindow = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), windowMaterial.clone());
        frontWindow.position.set(0, 5, 30.2);

        const rearWindow = frontWindow.clone();
        rearWindow.position.z = -30.2;
        rearWindow.material = windowMaterial.clone();
        rearWindow.material.emissive = new THREE.Color(0xF97316);

        const headlights = new THREE.PointLight(this.data.train.headlightColor, 1.6, 120, 2.4);
        headlights.position.set(0, 5, 32);

        const trainGroup = new THREE.Group();
        trainGroup.add(carBody);
        trainGroup.add(roof);

        const windowsLeft = sideWindows.clone();
        windowsLeft.position.x = -12;
        windowsLeft.rotation.y = Math.PI / 2;
        trainGroup.add(windowsLeft);

        const windowsRight = sideWindows.clone();
        windowsRight.position.x = 12;
        windowsRight.rotation.y = -Math.PI / 2;
        trainGroup.add(windowsRight);

        trainGroup.add(frontWindow);
        trainGroup.add(rearWindow);
        trainGroup.add(headlights);

        if (this.trackCurve) {
            const start = this.trackCurve.getPointAt(0);
            trainGroup.position.copy(start);
            const lookAhead = this.trackCurve.getPointAt(0.01);
            trainGroup.lookAt(lookAhead);
        }

        this.subwayTrain = trainGroup;
        this.scene.add(trainGroup);
    }

    enhanceStationLighting() {
        this.stationLights = this.subwayStations.map((station) => {
            const light = new THREE.PointLight(station.color, 0.9, 180, 3);
            light.position.copy(station.marker.position.clone().setY(station.marker.position.y + 12));
            this.scene.add(light);
            return light;
        });
    }

    createTrainParticleTrail() {
        if (!this.trackCurve) return;

        const points = this.trackCurve.getPoints(200);
        const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const trailMaterial = new THREE.LineDashedMaterial({
            color: 0x93C5FD,
            transparent: true,
            opacity: 0.3,
            dashSize: 8,
            gapSize: 4
        });
        this.trainTrail = new THREE.Line(trailGeometry, trailMaterial);
        this.trainTrail.computeLineDistances();
        this.trainTrail.material.dashOffset = 0;
        this.scene.add(this.trainTrail);
    }

    addTrainSounds() {
        // Placeholder for immersive audio hooks
        this.soundEnabled = false;
    }

    createFloatingParticles() {
        const particleCount = this.data.particles.count;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 900;
            positions[i * 3 + 1] = Math.random() * 260 + 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: this.data.particles.color,
            size: this.data.particles.size,
            transparent: true,
            opacity: 0.35,
            sizeAttenuation: true
        });
        this.floatingParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.floatingParticles);
    }

    createInteractiveElements() {
        this.pointer.set(0, 0);
        this.pointerTarget.set(0, 0);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize);
        if (this.stageElement) {
            this.stageElement.addEventListener('pointermove', this.onPointerMove);
            this.stageElement.addEventListener('pointerleave', this.onPointerLeave);
        }
    }

    optimizePerformance() {
        if (typeof ResizeObserver !== 'undefined' && (this.stageElement || this.canvas)) {
            this.resizeObserver = new ResizeObserver(() => {
                this.onWindowResize();
            });
            this.resizeObserver.observe(this.stageElement || this.canvas);
        }
    }

    reduceMotionForAccessibility() {
        this.updateMotionPreferences();
    }

    startAnimation() {
        if (!this.renderer) return;
        this.clock = new THREE.Clock();
        this.animationActive = true;
        this.renderer.setAnimationLoop(() => this.render());
    }

    onWindowResize() {
        if (!this.renderer || !this.camera) return;
        const { width, height } = this.getCanvasSize();
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    onPointerMove(event) {
        if (!this.stageElement) return;
        const rect = this.stageElement.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        this.pointerTarget.set(x * 2 - 1, -(y * 2 - 1));
    }

    onPointerLeave() {
        this.pointerTarget.set(0, 0);
    }

    updateTrain(delta) {
        if (!this.subwayTrain || !this.trackCurve) return;

        this.trainProgress = (this.trainProgress + this.trainSpeed) % 1;
        const currentPosition = this.trackCurve.getPointAt(this.trainProgress);
        const lookAhead = this.trackCurve.getPointAt((this.trainProgress + 0.01) % 1);
        this.subwayTrain.position.copy(currentPosition);
        this.subwayTrain.lookAt(lookAhead);

        this.checkStationArrival(currentPosition);

        if (this.trainTrail) {
            const dashOffset = (this.trainTrail.material.dashOffset || 0) - delta * 1.5;
            this.trainTrail.material.dashOffset = dashOffset;
        }
    }

    checkStationArrival(position) {
        this.subwayStations.forEach((station, index) => {
            const stationPos = this.trackCurve.getPointAt(station.t);
            const distance = position.distanceTo(stationPos);
            if (distance < 18) {
                station.arrivalPulse = 1;
                if (this.lastArrivedStationIndex !== index) {
                    this.lastArrivedStationIndex = index;
                    console.log(`🚉 Arrived at ${station.name}`);
                }
            }
        });
    }

    animateStations(delta) {
        this.subwayStations.forEach((station, index) => {
            station.arrivalPulse = Math.max(0, station.arrivalPulse - delta * 0.65);
            const scale = 1 + station.arrivalPulse * 0.8;
            station.marker.scale.setScalar(scale);
            if (station.label) {
                station.label.material.opacity = 0.75 + station.arrivalPulse * 0.2;
            }
            if (this.stationLights[index]) {
                this.stationLights[index].intensity = 0.6 + station.arrivalPulse * 1.4;
            }
        });
    }

    animateMap(elapsed) {
        if (!this.mapGroup) return;
        this.mapGroup.rotation.z = Math.sin(elapsed * 0.3) * 0.06;
        this.mapGroup.position.y = this.mapBaseY + Math.sin(elapsed * 0.5) * this.mapFloatAmplitude;
        if (this.trackGlow) {
            this.trackGlow.material.opacity = 0.22 + Math.sin(elapsed * 1.8) * 0.08;
        }
    }

    animateCamera(delta) {
        this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-delta * 5));

        const targetX = this.cameraBasePosition.x + this.pointer.x * 60;
        const targetY = this.cameraBasePosition.y + this.pointer.y * 30;
        const targetZ = this.cameraBasePosition.z + this.pointer.x * 30;

        this.camera.position.x += (targetX - this.camera.position.x) * 0.06;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.06;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.06;
        this.camera.lookAt(this.cameraTarget);
    }

    render() {
        if (!this.animationActive || !this.clock) return;

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        this.updateTrain(delta);
        this.animateStations(delta);
        this.animateMap(elapsed);
        this.animateCamera(delta);

        if (this.floatingParticles) {
            this.floatingParticles.rotation.y += delta * 0.08;
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.animationActive = false;
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
            this.renderer.dispose();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        window.removeEventListener('resize', this.onWindowResize);
        if (this.stageElement) {
            this.stageElement.removeEventListener('pointermove', this.onPointerMove);
            this.stageElement.removeEventListener('pointerleave', this.onPointerLeave);
        }
        console.log('🛑 Jules subway 3D scene disposed');
    }
}

class HeroParticleField {
    constructor(container) {
        this.container = container;
        this.particles = [];
        this.colors = ['subway-red', 'subway-blue', 'subway-green', 'subway-orange', 'subway-purple', 'subway-yellow'];
        this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    init() {
        if (!this.container || this.reduceMotion) return;

        const total = 70;
        for (let i = 0; i < total; i++) {
            this.spawnParticle();
        }
    }

    spawnParticle() {
        const particle = document.createElement('div');
        particle.className = `particle ${this.colors[Math.floor(Math.random() * this.colors.length)]}`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = '100%';
        particle.style.width = `${Math.random() * 4 + 2}px`;
        particle.style.height = particle.style.width;
        particle.style.animationDuration = `${Math.random() * 18 + 14}s`;
        particle.style.animationDelay = `${Math.random() * 18}s`;
        this.container.appendChild(particle);
        this.particles.push(particle);
    }

    destroy() {
        this.particles.forEach((particle) => {
            if (particle && particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
        this.particles = [];
    }
}

let subwayScene = null;
let particleField = null;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('three-canvas');
    if (canvas && typeof THREE !== 'undefined') {
        subwayScene = new JulesSubwayScene(canvas);
        subwayScene.init();
    } else if (!canvas) {
        console.warn('NYC subway canvas not found on this page.');
    } else {
        console.warn('Three.js failed to load; NYC subway scene disabled.');
    }

    const particleContainer = document.getElementById('particle-container');
    particleField = new HeroParticleField(particleContainer);
    particleField.init();

    window.JulesAI3D = {
        scene: subwayScene,
        particles: particleField
    };
});

window.addEventListener('beforeunload', () => {
    if (subwayScene) {
        subwayScene.dispose();
        subwayScene = null;
    }
    if (particleField) {
        particleField.destroy();
        particleField = null;
    }
});
