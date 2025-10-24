/* global THREE */

class JulesSubwayScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.stageElement = canvas ? canvas.parentElement : null;

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.clock = new THREE.Clock();

        this.mapGroup = new THREE.Group();
        this.mapBaseY = -24;
        this.trackCurve = null;
        this.frenetFrames = null;
        this.trackMesh = null;
        this.trainGroup = new THREE.Group();
        this.stationLights = [];
        this.headlights = [];

        this.trainProgress = 0;
        this.trainSpeed = 0.025;

        this.pointer = new THREE.Vector2(0, 0);
        this.cameraBasePosition = new THREE.Vector3(-40, 170, 320);
        this.cameraTarget = new THREE.Vector3(0, -12, 0);

        this.resizeObserver = null;
        this.animationActive = false;

        this.onWindowResize = this.onWindowResize.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerLeave = this.onPointerLeave.bind(this);
    }

    init() {
        if (!this.canvas) {
            console.warn('3D canvas element not found; skipping NYC subway scene.');
            return;
        }

        if (typeof THREE === 'undefined') {
            console.warn('Three.js is not available; cannot initialise NYC subway scene.');
            return;
        }

        this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (this.prefersReducedMotion) {
            this.trainSpeed = 0.012;
        }

        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.createLights();
        this.createMap();
        this.createTrack();
        this.createStations();
        this.createTrain();
        this.bindEvents();

        this.animationActive = true;
        this.renderer.setAnimationLoop(() => this.render());
        console.log('🚇 Jules subway 3D scene ready');
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
        if ('outputEncoding' in this.renderer) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        this.renderer.setClearColor(0x010409, 0);
    }

    getCanvasSize() {
        const parent = this.stageElement || this.canvas.parentElement;
        const width = parent ? parent.clientWidth : window.innerWidth;
        const height = parent ? parent.clientHeight : window.innerHeight;
        return {
            width: Math.max(width, 1),
            height: Math.max(height, 1)
        };
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x030712, 0.0025);
        this.mapGroup.position.y = this.mapBaseY;
        this.scene.add(this.mapGroup);
    }

    setupCamera() {
        const { width, height } = this.getCanvasSize();
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 2000);
        this.camera.position.copy(this.cameraBasePosition);
        this.camera.lookAt(this.cameraTarget);
        this.scene.add(this.camera);
    }

    createLights() {
        const ambient = new THREE.AmbientLight(0x5b6cff, 0.25);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0x4f9bff, 0x020409, 0.6);
        hemi.position.set(0, 320, 0);
        this.scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(-160, 260, 140);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 20;
        keyLight.shadow.camera.far = 800;
        this.scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x5bc0ff, 0.6);
        rimLight.position.set(200, 180, -240);
        this.scene.add(rimLight);

        const cityGlow = new THREE.PointLight(0x2563eb, 0.8, 400, 2.5);
        cityGlow.position.set(0, 80, 0);
        this.scene.add(cityGlow);
    }

    createMap() {
        const baseGeometry = new THREE.PlaneGeometry(420, 260, 1, 1);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a1428,
            metalness: 0.35,
            roughness: 0.85,
            transparent: true,
            opacity: 0.96
        });
        const basePlane = new THREE.Mesh(baseGeometry, baseMaterial);
        basePlane.rotation.x = -Math.PI / 2;
        basePlane.position.y = 2.5;
        basePlane.receiveShadow = true;
        this.mapGroup.add(basePlane);

        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(470, 320),
            new THREE.MeshBasicMaterial({ color: 0x01060f, transparent: true, opacity: 0.3 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.2;
        this.mapGroup.add(shadowPlane);

        const halo = new THREE.Mesh(
            new THREE.CircleGeometry(225, 80),
            new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.18 })
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = 1.4;
        this.mapGroup.add(halo);

        const frame = new THREE.LineSegments(
            new THREE.EdgesGeometry(baseGeometry),
            new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.45 })
        );
        frame.rotation.x = -Math.PI / 2;
        frame.position.y = 3.3;
        this.mapGroup.add(frame);

        const grid = new THREE.GridHelper(520, 24, 0x1d4ed8, 0x0f172a);
        grid.rotation.y = Math.PI / 4;
        grid.position.y = 1.2;
        grid.material.transparent = true;
        grid.material.opacity = 0.18;
        this.mapGroup.add(grid);

        const loader = new THREE.TextureLoader();
        loader.load(
            'nyc_subway_map_optimized.jpg',
            (texture) => {
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                texture.encoding = THREE.sRGBEncoding;
                texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

                const mapMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.98,
                    roughness: 0.7,
                    metalness: 0.15
                });
                const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 260, 1, 1), mapMaterial);
                mapMesh.rotation.x = -Math.PI / 2;
                mapMesh.position.y = 4.1;
                mapMesh.receiveShadow = true;
                this.mapGroup.add(mapMesh);
            },
            undefined,
            (error) => console.error('Failed to load NYC subway map texture', error)
        );
    }

    createTrack() {
        const trackPoints = [
            new THREE.Vector3(-190, 46, 110),
            new THREE.Vector3(-130, 42, 30),
            new THREE.Vector3(-60, 36, -40),
            new THREE.Vector3(30, 42, -120),
            new THREE.Vector3(170, 40, -40),
            new THREE.Vector3(150, 38, 80),
            new THREE.Vector3(60, 36, 130),
            new THREE.Vector3(-120, 44, 100)
        ];

        this.trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'catmullrom', 0.3);
        const tubularSegments = 800;
        const radius = 2.6;
        const radialSegments = 16;
        const closed = true;

        const tubeGeometry = new THREE.TubeGeometry(
            this.trackCurve,
            tubularSegments,
            radius,
            radialSegments,
            closed
        );
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            metalness: 0.65,
            roughness: 0.25,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.6
        });
        this.trackMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.trackMesh.castShadow = true;
        this.trackMesh.receiveShadow = true;
        this.scene.add(this.trackMesh);

        const railGlowGeometry = new THREE.BufferGeometry().setFromPoints(this.trackCurve.getPoints(400));
        const railGlowMaterial = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 });
        this.railGlow = new THREE.LineLoop(railGlowGeometry, railGlowMaterial);
        this.scene.add(this.railGlow);

        const supportMaterial = new THREE.MeshStandardMaterial({
            color: 0x111827,
            metalness: 0.25,
            roughness: 0.9,
            transparent: true,
            opacity: 0.9
        });
        const supportGroup = new THREE.Group();
        const baseHeight = this.mapBaseY + 4;
        for (let t = 0; t < 1; t += 0.08) {
            const position = this.trackCurve.getPointAt(t);
            const height = Math.max(position.y - baseHeight, 8);
            const support = new THREE.Mesh(
                new THREE.CylinderGeometry(1.6, 1.9, height, 12, 1, false),
                supportMaterial
            );
            support.position.set(position.x, baseHeight + height / 2 - 1.2, position.z);
            support.castShadow = true;
            supportGroup.add(support);
        }
        this.scene.add(supportGroup);

        this.frenetFrames = this.trackCurve.computeFrenetFrames(tubularSegments, closed);
    }

    createStations() {
        if (!this.trackCurve) return;

        const stationStops = [0, 0.12, 0.24, 0.38, 0.52, 0.66, 0.82, 0.94];
        const stationColors = [0x0ea5e9, 0x34d399, 0xf97316, 0xfacc15, 0xa855f7, 0xef4444];
        const baseY = this.mapBaseY + 4.2;

        stationStops.forEach((stop, index) => {
            const position = this.trackCurve.getPointAt(stop % 1);
            const color = stationColors[index % stationColors.length];

            const columnHeight = Math.max(position.y - baseY, 10);
            const column = new THREE.Mesh(
                new THREE.CylinderGeometry(1.8, 2.4, columnHeight, 18),
                new THREE.MeshStandardMaterial({
                    color: 0x0f172a,
                    metalness: 0.2,
                    roughness: 0.85,
                    transparent: true,
                    opacity: 0.9
                })
            );
            column.position.set(position.x, baseY + columnHeight / 2 - 1.5, position.z);
            column.receiveShadow = true;
            this.scene.add(column);

            const beacon = new THREE.Mesh(
                new THREE.SphereGeometry(3.6, 24, 20),
                new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.5,
                    metalness: 0.5,
                    roughness: 0.35
                })
            );
            beacon.position.copy(position);
            beacon.position.y += 5.8;
            beacon.castShadow = true;
            this.scene.add(beacon);

            const glow = new THREE.Mesh(
                new THREE.CircleGeometry(9, 48),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
            );
            glow.rotation.x = -Math.PI / 2;
            glow.position.set(position.x, baseY + 0.15, position.z);
            this.scene.add(glow);

            const pointLight = new THREE.PointLight(color, 1.2, 160, 2.4);
            pointLight.position.copy(position);
            pointLight.position.y += 14;
            pointLight.userData.baseY = pointLight.position.y;
            pointLight.castShadow = true;
            this.scene.add(pointLight);
            this.stationLights.push(pointLight);
        });
    }

    createTrain() {
        if (!this.trackCurve) return;

        const carBodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.75,
            roughness: 0.32,
            envMapIntensity: 1.2
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 6.8, 24), carBodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        body.position.y = 6.2;
        this.trainGroup.add(body);

        const roof = new THREE.Mesh(
            new THREE.CylinderGeometry(3.6, 3.6, 24, 24, 1, true, 0, Math.PI),
            new THREE.MeshStandardMaterial({
                color: 0xcbd5f5,
                metalness: 0.7,
                roughness: 0.42,
                side: THREE.DoubleSide
            })
        );
        roof.rotation.z = Math.PI / 2;
        roof.position.y = 8.2;
        this.trainGroup.add(roof);

        const undercarriage = new THREE.Mesh(
            new THREE.BoxGeometry(6.2, 1.2, 18),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.4, roughness: 0.85 })
        );
        undercarriage.position.y = 2.5;
        this.trainGroup.add(undercarriage);

        const sideWindowMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.4,
            roughness: 0.25,
            transparent: true,
            opacity: 0.8,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide
        });
        const sideWindowGeometry = new THREE.PlaneGeometry(16, 2.6);
        const leftWindows = new THREE.Mesh(sideWindowGeometry, sideWindowMaterial);
        leftWindows.position.set(-3.22, 6.2, 0);
        leftWindows.rotation.y = Math.PI / 2;
        this.trainGroup.add(leftWindows);
        const rightWindows = leftWindows.clone();
        rightWindows.position.x = 3.22;
        rightWindows.rotation.y = -Math.PI / 2;
        this.trainGroup.add(rightWindows);

        const frontWindow = new THREE.Mesh(
            new THREE.PlaneGeometry(5.8, 3.4),
            new THREE.MeshStandardMaterial({
                color: 0x111c34,
                metalness: 0.55,
                roughness: 0.3,
                transparent: true,
                opacity: 0.92,
                emissive: 0x2563eb,
                emissiveIntensity: 0.4
            })
        );
        frontWindow.position.set(0, 6.1, 12.2);
        this.trainGroup.add(frontWindow);

        const rearWindow = frontWindow.clone();
        rearWindow.position.z = -12.2;
        rearWindow.material = frontWindow.material.clone();
        rearWindow.material.emissive = new THREE.Color(0x991b1b);
        rearWindow.material.emissiveIntensity = 0.3;
        this.trainGroup.add(rearWindow);

        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xfff3b0,
            emissive: 0xfff1a1,
            emissiveIntensity: 1.2,
            metalness: 0.2,
            roughness: 0.1
        });
        const leftHeadlight = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), headlightMaterial);
        leftHeadlight.rotation.x = Math.PI / 2;
        leftHeadlight.position.set(-1.2, 4.8, 12.6);
        this.trainGroup.add(leftHeadlight);
        const rightHeadlight = leftHeadlight.clone();
        rightHeadlight.position.x = 1.2;
        this.trainGroup.add(rightHeadlight);

        const headlightBeamL = new THREE.SpotLight(0xfff7d6, 1.8, 80, Math.PI / 6, 0.4, 1.2);
        headlightBeamL.position.set(-1.2, 5, 12.6);
        headlightBeamL.target.position.set(-1.2, 4.2, 20);
        this.trainGroup.add(headlightBeamL);
        this.trainGroup.add(headlightBeamL.target);
        const headlightBeamR = headlightBeamL.clone();
        headlightBeamR.position.x = 1.2;
        headlightBeamR.target.position.x = 1.2;
        this.trainGroup.add(headlightBeamR);
        this.trainGroup.add(headlightBeamR.target);
        this.headlights.push(headlightBeamL, headlightBeamR);

        const rearLightMaterial = new THREE.MeshStandardMaterial({
            color: 0xf87171,
            emissive: 0xb91c1c,
            emissiveIntensity: 1.1,
            metalness: 0.2,
            roughness: 0.2
        });
        const rearLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.4), rearLightMaterial);
        rearLeft.position.set(-1.1, 4.7, -12.4);
        this.trainGroup.add(rearLeft);
        const rearRight = rearLeft.clone();
        rearRight.position.x = 1.1;
        this.trainGroup.add(rearRight);

        const interiorGlow = new THREE.PointLight(0x38bdf8, 1.2, 90, 1.8);
        interiorGlow.position.set(0, 6.5, 0);
        this.trainGroup.add(interiorGlow);

        this.trainGroup.castShadow = true;
        this.scene.add(this.trainGroup);

        const startPosition = this.trackCurve.getPointAt(0);
        this.trainGroup.position.copy(startPosition);
    }

    bindEvents() {
        window.addEventListener('resize', this.onWindowResize);
        if (this.stageElement) {
            this.stageElement.addEventListener('pointermove', this.onPointerMove);
            this.stageElement.addEventListener('pointerleave', this.onPointerLeave);
        }

        if ('ResizeObserver' in window && this.stageElement) {
            this.resizeObserver = new ResizeObserver(() => this.setRendererSize());
            this.resizeObserver.observe(this.stageElement);
        }
    }

    onWindowResize() {
        this.setRendererSize();
    }

    onPointerMove(event) {
        if (!this.stageElement) return;
        const bounds = this.stageElement.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        this.pointer.x = x * 2 - 1;
        this.pointer.y = -(y * 2 - 1);
    }

    onPointerLeave() {
        this.pointer.set(0, 0);
    }

    setRendererSize() {
        if (!this.renderer || !this.camera) return;
        const { width, height } = this.getCanvasSize();
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    updateTrain(delta, elapsed) {
        if (!this.trackCurve || !this.frenetFrames) return;

        this.trainProgress = (this.trainProgress + delta * this.trainSpeed) % 1;
        const position = this.trackCurve.getPointAt(this.trainProgress);
        const nextPosition = this.trackCurve.getPointAt((this.trainProgress + 0.002) % 1);
        const tangent = nextPosition.clone().sub(position).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

        const basis = new THREE.Matrix4();
        basis.makeBasis(binormal, normal, tangent);
        this.trainGroup.quaternion.setFromRotationMatrix(basis);

        this.trainGroup.position.copy(position);
        this.trainGroup.position.y += Math.sin(elapsed * 2.6) * 0.8;

        this.headlights.forEach((light, index) => {
            light.intensity = 1.6 + Math.sin(elapsed * 12 + index) * 0.2;
            if (light.target) {
                light.target.position.z = 20;
            }
        });
    }

    animateStations(elapsed) {
        this.stationLights.forEach((light, index) => {
            light.intensity = 0.9 + Math.sin(elapsed * 1.8 + index) * 0.4;
            if (light.userData && typeof light.userData.baseY === 'number') {
                light.position.y = light.userData.baseY + Math.sin(elapsed * 2 + index) * 0.6;
            }
        });
    }

    animateMap(elapsed) {
        this.mapGroup.rotation.z = Math.sin(elapsed * 0.35) * 0.05;
        this.mapGroup.position.y = this.mapBaseY + Math.sin(elapsed * 0.45) * 1.6;
        if (this.railGlow && this.railGlow.material) {
            this.railGlow.material.opacity = 0.25 + Math.sin(elapsed * 2) * 0.08;
        }
        if (this.trackMesh && this.trackMesh.material) {
            this.trackMesh.material.emissiveIntensity = 0.55 + Math.sin(elapsed * 1.5) * 0.12;
        }
    }

    animateCamera(delta) {
        const targetX = this.cameraBasePosition.x + this.pointer.x * 55;
        const targetY = this.cameraBasePosition.y + this.pointer.y * 28;
        const targetZ = this.cameraBasePosition.z + this.pointer.x * 25;

        this.camera.position.x += (targetX - this.camera.position.x) * 0.035;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.035;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.035;
        this.camera.lookAt(this.cameraTarget);
    }

    render() {
        if (!this.animationActive) return;

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        this.updateTrain(delta, elapsed);
        this.animateStations(elapsed);
        this.animateMap(elapsed);
        this.animateCamera(delta);

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
