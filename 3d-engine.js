// ===== JULES COMMUNITY 3D ENGINE =====
// Advanced WebGL 3D animations using Three.js
// Created for stunning visual effects and user engagement

class JulesAI3DEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        this.animationId = null;
        this.particles = [];
        this.subwayLines = [];
        this.subwayTrain = null;
        this.subwayStations = [];
        this.trackCurve = null;
        this.trackPoints = [];
        this.mapElevation = -20;
        this.trainProgress = 0;
        this.trainSpeed = 0.0006;
        this.lastArrivedStationIndex = null;
        this.mapGroup = new THREE.Group();
        this.cameraBasePosition = { y: 220, z: 360 };
        this.cameraTarget = { y: this.cameraBasePosition.y, z: this.cameraBasePosition.z };
        this.mousePosition = { x: 0, y: 0 };
        this.isInitialized = false;
        
        // Subway-themed colors
        this.colors = {
            red: 0xEE352E,
            blue: 0x0039A6,
            green: 0x00933C,
            orange: 0xFF6319,
            purple: 0xB933AD,
            yellow: 0xFCCC0A
        };
        
        // Bind methods
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    init() {
        if (this.isInitialized) return;
        
        try {
            this.setupCanvas();
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
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
            console.log('🚇 Jules AI 3D Engine initialized successfully!');
        } catch (error) {
            console.error('Error initializing 3D engine:', error);
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('three-canvas');
        if (!this.canvas) {
            console.warn('3D canvas element not found');
            return;
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 100, 1000);
        this.scene.add(this.mapGroup);
    }
    
    setupCamera() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 2000);
        this.camera.position.set(0, this.cameraBasePosition.y, this.cameraBasePosition.z);
        this.camera.lookAt(new THREE.Vector3(0, this.mapElevation, 0));
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    
    setupLights() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point lights for NYC subway ambiance
        const colors = Object.values(this.colors);
        for (let i = 0; i < 6; i++) {
            const pointLight = new THREE.PointLight(colors[i], 0.5, 200);
            pointLight.position.set(
                Math.cos(i * Math.PI / 3) * 150,
                Math.sin(i * Math.PI / 3) * 150,
                Math.random() * 100 - 50
            );
            this.scene.add(pointLight);
        }
    }

    createSubwayMap() {
        if (!this.renderer) return;

        const loader = new THREE.TextureLoader();
        loader.load(
            'nyc_subway_map_optimized.jpg',
            (texture) => {
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                texture.encoding = THREE.sRGBEncoding;

                const mapGeometry = new THREE.PlaneGeometry(820, 520, 32, 32);
                const mapMaterial = new THREE.MeshPhongMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.92,
                    shininess: 40
                });

                const mapPlane = new THREE.Mesh(mapGeometry, mapMaterial);
                mapPlane.rotation.x = -Math.PI / 2.1;
                mapPlane.position.y = this.mapElevation;
                mapPlane.receiveShadow = true;

                const mapFrameGeometry = new THREE.EdgesGeometry(mapGeometry);
                const mapFrameMaterial = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.6 });
                const mapFrame = new THREE.LineSegments(mapFrameGeometry, mapFrameMaterial);
                mapFrame.rotation.copy(mapPlane.rotation);
                mapFrame.position.copy(mapPlane.position);

                const glowGeometry = new THREE.PlaneGeometry(840, 540);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0x0039A6,
                    transparent: true,
                    opacity: 0.15,
                    side: THREE.DoubleSide
                });
                const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
                glowPlane.rotation.copy(mapPlane.rotation);
                glowPlane.position.copy(mapPlane.position.clone().setY(this.mapElevation - 1));

                this.mapGroup.add(glowPlane);
                this.mapGroup.add(mapPlane);
                this.mapGroup.add(mapFrame);

                // Add subtle floating animation to the entire map group
                this.mapGroup.position.y = this.mapElevation;
                if (typeof gsap !== 'undefined') {
                    gsap.to(this.mapGroup.position, {
                        y: this.mapElevation + 4,
                        duration: 6,
                        ease: 'sine.inOut',
                        yoyo: true,
                        repeat: -1
                    });
                }
            },
            undefined,
            (error) => {
                console.error('Failed to load NYC subway map texture', error);
            }
        );
    }

    createSubwayNetwork() {
        // Create 3D subway line network
        const elevation = this.mapElevation + 12;

        this.trackPoints = [
            new THREE.Vector3(-300, elevation, 200),
            new THREE.Vector3(-220, elevation, 140),
            new THREE.Vector3(-170, elevation, 60),
            new THREE.Vector3(-120, elevation, -10),
            new THREE.Vector3(-40, elevation, -80),
            new THREE.Vector3(40, elevation, -140),
            new THREE.Vector3(140, elevation, -170),
            new THREE.Vector3(240, elevation, -120),
            new THREE.Vector3(300, elevation, -30),
            new THREE.Vector3(270, elevation, 90),
            new THREE.Vector3(200, elevation, 180),
            new THREE.Vector3(80, elevation, 230),
            new THREE.Vector3(-60, elevation, 240),
            new THREE.Vector3(-200, elevation, 220)
        ];

        this.trackCurve = new THREE.CatmullRomCurve3(this.trackPoints, true, 'centripetal');

        const guidewayMaterial = new THREE.MeshPhongMaterial({
            color: 0x111827,
            emissive: 0x1f2937,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.85
        });
        const guidewayGeometry = new THREE.TubeGeometry(this.trackCurve, 400, 6, 32, true);
        const guideway = new THREE.Mesh(guidewayGeometry, guidewayMaterial);
        guideway.castShadow = true;
        guideway.receiveShadow = true;

        const railMaterial = new THREE.MeshStandardMaterial({
            color: 0xd1d5db,
            metalness: 0.6,
            roughness: 0.3,
            emissive: 0x4b5563,
            emissiveIntensity: 0.1
        });
        const railGeometry = new THREE.TubeGeometry(this.trackCurve, 400, 2.3, 16, true);
        const rail = new THREE.Mesh(railGeometry, railMaterial);
        rail.castShadow = true;

        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.blue,
            transparent: true,
            opacity: 0.25
        });
        const glowGeometry = new THREE.TubeGeometry(this.trackCurve, 400, 8, 16, true);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.userData = { baseOpacity: glowMaterial.opacity };

        this.scene.add(glow);
        this.scene.add(guideway);
        this.scene.add(rail);

        this.subwayLines = [guideway, rail, glow];
    }
    
    createFloatingParticles() {
        const particleCount = 1500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        const colorArray = [
            [0.93, 0.21, 0.18], // Red
            [0.0, 0.22, 0.65],  // Blue
            [0.0, 0.58, 0.24],  // Green
            [1.0, 0.39, 0.1],   // Orange
            [0.72, 0.2, 0.68],  // Purple
            [0.99, 0.8, 0.04]   // Yellow
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions in a large sphere
            positions[i3] = (Math.random() - 0.5) * 1000;
            positions[i3 + 1] = (Math.random() - 0.5) * 1000;
            positions[i3 + 2] = (Math.random() - 0.5) * 500;
            
            // Random velocities
            velocities[i3] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            // Random subway colors
            const colorIndex = Math.floor(Math.random() * colorArray.length);
            colors[i3] = colorArray[colorIndex][0];
            colors[i3 + 1] = colorArray[colorIndex][1];
            colors[i3 + 2] = colorArray[colorIndex][2];
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }
    
    createInteractiveElements() {
        // Create floating 3D subway station signs
        const stationNames = ['JULES', 'AI', 'CODING', 'AGENT', 'GITHUB', 'BETA'];
        
        stationNames.forEach((name, index) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            
            context.fillStyle = '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#FFFFFF';
            context.font = 'bold 24px Arial';
            context.textAlign = 'center';
            context.fillText(name, canvas.width / 2, canvas.height / 2 + 8);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const geometry = new THREE.PlaneGeometry(50, 12);
            const sign = new THREE.Mesh(geometry, material);
            
            const angle = (index / stationNames.length) * Math.PI * 2;
            sign.position.set(
                Math.cos(angle) * 300,
                Math.sin(angle) * 300,
                Math.random() * 100 - 50
            );
            
            sign.lookAt(this.camera.position);
            sign.userData = {
                rotationSpeed: (Math.random() - 0.5) * 0.005,
                floatSpeed: Math.random() * 0.01 + 0.005,
                originalY: sign.position.y
            };
            
            this.scene.add(sign);
        });
    }
    
    createSubwayStations() {
        if (!this.trackCurve) return;

        const stationDefinitions = [
            { name: 'BUG FIXING', color: this.colors.red, t: 0.02 },
            { name: 'VERSION BUMPS', color: this.colors.blue, t: 0.18 },
            { name: 'AUTOMATED TESTS', color: this.colors.green, t: 0.32 },
            { name: 'FEATURE BUILDING', color: this.colors.orange, t: 0.48 },
            { name: 'GITHUB INTEGRATION', color: this.colors.purple, t: 0.65 },
            { name: 'GEMINI 2.5 POWERED', color: this.colors.yellow, t: 0.82 }
        ];

        this.subwayStations = [];

        stationDefinitions.forEach((feature, index) => {
            const basePosition = this.trackCurve.getPointAt(feature.t);
            const elevatedPosition = basePosition.clone();
            const platformHeight = this.mapElevation + 4;
            const pillarHeight = elevatedPosition.y - this.mapElevation + 6;

            // Create station platform hovering over the map
            const platformGeometry = new THREE.BoxGeometry(40, 4, 16);
            const platformMaterial = new THREE.MeshPhongMaterial({
                color: 0x1f2937,
                emissive: feature.color,
                emissiveIntensity: 0.2,
                shininess: 80
            });
            const platform = new THREE.Mesh(platformGeometry, platformMaterial);
            platform.position.set(basePosition.x, platformHeight, basePosition.z);
            platform.castShadow = true;
            platform.receiveShadow = true;
            this.scene.add(platform);

            // Create illuminated pillar connecting platform to track
            const pillarGeometry = new THREE.CylinderGeometry(3.5, 3.5, pillarHeight, 24);
            const pillarMaterial = new THREE.MeshPhongMaterial({
                color: feature.color,
                transparent: true,
                opacity: 0.85,
                emissive: feature.color,
                emissiveIntensity: 0.6
            });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(basePosition.x, this.mapElevation + pillarHeight / 2, basePosition.z);
            pillar.castShadow = true;
            this.scene.add(pillar);

            // Create glowing station marker at track level
            const markerGeometry = new THREE.SphereGeometry(5, 32, 32);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: feature.color,
                transparent: true,
                opacity: 0.9
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(elevatedPosition.clone().setY(elevatedPosition.y + 4));
            this.scene.add(marker);

            // Create station sign with NYC subway styling
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;

            context.fillStyle = '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#FFFFFF';
            context.font = 'bold 18px Arial';
            context.textAlign = 'center';
            context.fillText(feature.name, canvas.width / 2, canvas.height / 2 + 8);

            const texture = new THREE.CanvasTexture(canvas);
            const signMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            });

            const signGeometry = new THREE.PlaneGeometry(50, 14);
            const stationSign = new THREE.Mesh(signGeometry, signMaterial);
            stationSign.position.copy(elevatedPosition.clone().setY(elevatedPosition.y + 18));
            stationSign.lookAt(this.camera.position.clone().setY(elevatedPosition.y + 18));
            stationSign.userData = { followCamera: true };
            this.scene.add(stationSign);

            const stationData = {
                name: feature.name,
                position: {
                    x: elevatedPosition.x,
                    y: elevatedPosition.y,
                    z: elevatedPosition.z
                },
                positionVector: elevatedPosition.clone(),
                color: feature.color,
                platform,
                pillar,
                marker,
                sign: stationSign,
                trackT: feature.t
            };

            this.subwayStations.push(stationData);
        });

        console.log('🚉 Created elevated NYC subway stations for Jules features');
    }
    
    createSubwayTrain() {
        // Create realistic NYC subway train
        const trainGroup = new THREE.Group();
        trainGroup.castShadow = true;
        trainGroup.receiveShadow = true;

        // Main train car body
        const carGeometry = new THREE.BoxGeometry(25, 8, 60);
        const carMaterial = new THREE.MeshPhongMaterial({
            color: 0x2C3E50,
            shininess: 100,
            emissive: 0x1A252F,
            emissiveIntensity: 0.1
        });
        const trainCar = new THREE.Mesh(carGeometry, carMaterial);
        trainCar.position.y = 4;
        trainGroup.add(trainCar);
        
        // Train roof
        const roofGeometry = new THREE.BoxGeometry(26, 2, 61);
        const roofMaterial = new THREE.MeshPhongMaterial({
            color: 0x34495E
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 9;
        trainGroup.add(roof);
        
        // Train windows (front and sides)
        const windowGeometry = new THREE.PlaneGeometry(8, 4);
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.7,
            emissive: 0x4169E1,
            emissiveIntensity: 0.2
        });
        
        // Front window
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(0, 6, 30.5);
        trainGroup.add(frontWindow);
        
        // Side windows
        for (let i = -20; i <= 20; i += 10) {
            const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            leftWindow.position.set(-12.5, 6, i);
            leftWindow.rotation.y = Math.PI / 2;
            trainGroup.add(leftWindow);
            
            const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            rightWindow.position.set(12.5, 6, i);
            rightWindow.rotation.y = -Math.PI / 2;
            trainGroup.add(rightWindow);
        }
        
        // Train wheels
        const wheelGeometry = new THREE.CylinderGeometry(2, 2, 3);
        const wheelMaterial = new THREE.MeshPhongMaterial({
            color: 0x444444,
            shininess: 50
        });
        
        const wheelPositions = [
            { x: -10, z: -20 }, { x: 10, z: -20 },
            { x: -10, z: 0 }, { x: 10, z: 0 },
            { x: -10, z: 20 }, { x: 10, z: 20 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, -2, pos.z);
            wheel.rotation.z = Math.PI / 2;
            trainGroup.add(wheel);
        });
        
        // Train headlights
        const headlightGeometry = new THREE.SphereGeometry(1.5);
        const headlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.8
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-6, 4, 31);
        trainGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(6, 4, 31);
        trainGroup.add(rightHeadlight);
        
        // Add directional light from headlights
        const headlight = new THREE.SpotLight(0xFFFFFF, 1, 100, Math.PI / 6, 0.5);
        headlight.position.set(0, 4, 32);
        headlight.target.position.set(0, 0, 50);
        trainGroup.add(headlight);
        trainGroup.add(headlight.target);
        
        // Jules AI branding on the side
        const brandingCanvas = document.createElement('canvas');
        const brandingContext = brandingCanvas.getContext('2d');
        brandingCanvas.width = 256;
        brandingCanvas.height = 64;
        
        brandingContext.fillStyle = '#0039A6';
        brandingContext.fillRect(0, 0, brandingCanvas.width, brandingCanvas.height);
        brandingContext.fillStyle = '#FFFFFF';
        brandingContext.font = 'bold 20px Arial';
        brandingContext.textAlign = 'center';
        brandingContext.fillText('JULES AI EXPRESS', brandingCanvas.width / 2, brandingCanvas.height / 2 + 8);
        
        const brandingTexture = new THREE.CanvasTexture(brandingCanvas);
        const brandingMaterial = new THREE.MeshBasicMaterial({
            map: brandingTexture,
            transparent: true
        });
        
        const brandingGeometry = new THREE.PlaneGeometry(20, 5);
        const branding = new THREE.Mesh(brandingGeometry, brandingMaterial);
        branding.position.set(13, 4, 0);
        branding.rotation.y = -Math.PI / 2;
        trainGroup.add(branding);
        
        // Position train at starting point of the curve
        if (this.trackCurve) {
            const startPosition = this.trackCurve.getPointAt(0);
            trainGroup.position.copy(startPosition);

            const lookAhead = this.trackCurve.getPointAt(0.01);
            trainGroup.lookAt(lookAhead);
        }

        this.subwayTrain = trainGroup;
        this.scene.add(trainGroup);

        console.log('🚆 Created Jules AI subway train');
    }
    
    updateTrainMovement() {
        if (!this.subwayTrain || !this.trackCurve) return;

        this.trainProgress = (this.trainProgress + this.trainSpeed) % 1;

        const currentPosition = this.trackCurve.getPointAt(this.trainProgress);
        this.subwayTrain.position.copy(currentPosition);

        const lookAhead = this.trackCurve.getPointAt((this.trainProgress + 0.01) % 1);
        this.subwayTrain.lookAt(lookAhead);

        this.checkStationArrivals(currentPosition);
    }

    checkStationArrivals(position) {
        if (!this.subwayStations.length) return;

        this.subwayStations.forEach((station, index) => {
            const stationPosition = station.positionVector.clone().setY(position.y);
            const distance = position.distanceTo(stationPosition);

            if (distance < 20 && this.lastArrivedStationIndex !== index) {
                this.lastArrivedStationIndex = index;
                this.createStationArrivalEffect(index);

                setTimeout(() => {
                    if (this.lastArrivedStationIndex === index) {
                        this.lastArrivedStationIndex = null;
                    }
                }, 1500);
            }
        });
    }
    
    createStationArrivalEffect(stationIndex) {
        if (!this.subwayStations[stationIndex]) return;

        const station = this.subwayStations[stationIndex];
        const stationPosition = station.positionVector.clone();
        
        // Create arrival particle burst
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.5),
                new THREE.MeshBasicMaterial({
                    color: station.color,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            particle.position.set(
                stationPosition.x + (Math.random() - 0.5) * 20,
                stationPosition.y + Math.random() * 12,
                stationPosition.z + (Math.random() - 0.5) * 20
            );
            
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 2
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate and remove particles
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.05; // gravity
                particle.material.opacity -= 0.02;
                
                if (particle.material.opacity <= 0) {
                    this.scene.remove(particle);
                    particles.splice(index, 1);
                }
            });
            
            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
        
        console.log(`🚉 Train arrived at ${station.name}`);
    }
    
    createTrainParticleTrail() {
        if (!this.subwayTrain) return;
        
        // Create particle trail behind the train
        const trailParticles = [];
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.3),
                new THREE.MeshBasicMaterial({
                    color: 0x4169E1,
                    transparent: true,
                    opacity: 0.6 - (i * 0.1)
                })
            );
            
            // Position particles behind the train
            particle.position.copy(this.subwayTrain.position);

            this.scene.add(particle);
            trailParticles.push(particle);
        }

        // Animate trail particles to follow train
        const updateTrail = () => {
            if (!this.subwayTrain || !this.trackCurve) return;

            trailParticles.forEach((particle, index) => {
                // Move particles towards train position with delay
                const tangent = this.trackCurve.getTangentAt(this.trainProgress).normalize();
                const backwardVector = tangent.clone().multiplyScalar(-1);
                const offsetDistance = (index + 1) * 8;
                const targetPos = this.subwayTrain.position.clone().add(backwardVector.multiplyScalar(offsetDistance));
                targetPos.y -= 3;

                particle.position.lerp(targetPos, 0.1);
                
                // Add some randomness for realistic effect
                particle.position.x += (Math.random() - 0.5) * 0.5;
                particle.position.y += (Math.random() - 0.5) * 0.5;
                
                // Fade particles over time
                particle.material.opacity = Math.max(0, 0.6 - (index * 0.1) - Math.random() * 0.1);
            });
            
            requestAnimationFrame(updateTrail);
        };
        
        updateTrail();
    }
    
    enhanceStationLighting() {
        this.subwayStations.forEach((station, index) => {
            // Add dynamic lighting to stations
            const stationLight = new THREE.PointLight(station.color, 2, 100);
            stationLight.position.set(
                station.positionVector.x,
                station.positionVector.y + 25,
                station.positionVector.z
            );
            
            // Add pulsing effect
            stationLight.userData = {
                originalIntensity: 2,
                pulseSpeed: 0.02 + index * 0.005
            };
            
            this.scene.add(stationLight);
            station.light = stationLight;
            
            // Add station platform lighting strips
            const lightStrip = new THREE.Mesh(
                new THREE.BoxGeometry(30, 0.5, 2),
                new THREE.MeshBasicMaterial({
                    color: station.color,
                    emissive: station.color,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.8
                })
            );
            lightStrip.position.set(
                station.positionVector.x,
                this.mapElevation + 6,
                station.positionVector.z + 4
            );
            this.scene.add(lightStrip);
            station.lightStrip = lightStrip;
        });
    }
    
    addTrainSounds() {
        // Create audio context for train sounds (visual representation)
        const trainSoundVisualizer = () => {
            if (!this.subwayTrain) return;
            
            // Create sound wave visualization around train
            const soundWaves = [];
            const waveCount = 3;
            
            for (let i = 0; i < waveCount; i++) {
                const wave = new THREE.Mesh(
                    new THREE.RingGeometry(5 + i * 3, 6 + i * 3, 16),
                    new THREE.MeshBasicMaterial({
                        color: 0x00FFFF,
                        transparent: true,
                        opacity: 0.3 - i * 0.1,
                        side: THREE.DoubleSide
                    })
                );
                
                wave.position.copy(this.subwayTrain.position);
                wave.position.y += 5;
                wave.rotation.x = Math.PI / 2;
                
                this.scene.add(wave);
                soundWaves.push(wave);
                
                // Animate wave expansion
                const expandWave = () => {
                    wave.scale.multiplyScalar(1.02);
                    wave.material.opacity *= 0.98;
                    
                    if (wave.material.opacity < 0.01) {
                        this.scene.remove(wave);
                    } else {
                        requestAnimationFrame(expandWave);
                    }
                };
                
                setTimeout(() => expandWave(), i * 200);
            }
        };
        
        // Create sound waves periodically
        setInterval(trainSoundVisualizer, 1000);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize, false);
        window.addEventListener('mousemove', this.onMouseMove, false);
        
        // Add scroll-based camera movement
        window.addEventListener('scroll', () => {
            const scrollPercent = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight);
            this.cameraTarget.z = this.cameraBasePosition.z - scrollPercent * 160;
            this.cameraTarget.y = this.cameraBasePosition.y + scrollPercent * 80;
            this.camera.rotation.x = -0.25 + scrollPercent * 0.35;
        });
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Adjust performance based on screen size
        this.optimizePerformance();
    }
    
    optimizePerformance() {
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth < 1024 && window.innerWidth >= 768;
        
        // Adjust renderer settings for mobile
        if (isMobile) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            
            // Reduce particle count on mobile
            if (this.particleSystem) {
                this.particleSystem.geometry.setDrawRange(0, Math.floor(this.particleSystem.geometry.attributes.position.count * 0.3));
            }
            
            // Reduce subway lines complexity
            this.subwayLines.forEach(line => {
                if (line.material) {
                    line.material.transparent = true;
                    line.material.opacity = 0.5;
                }
            });
            
        } else if (isTablet) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Medium performance for tablets
            if (this.particleSystem) {
                this.particleSystem.geometry.setDrawRange(0, Math.floor(this.particleSystem.geometry.attributes.position.count * 0.6));
            }
        } else {
            // Full performance for desktop
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
        
        console.log(`🎯 Performance optimized for ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`);
    }
    
    reduceMotionForAccessibility() {
        // Check if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Reduce animation speed
            this.trainProgress = 0;
            this.trainSpeed = 0.0002;
            
            // Simplify particle effects
            if (this.particleSystem) {
                this.particleSystem.visible = false;
            }
            
            // Reduce station lighting effects
            this.subwayStations.forEach(station => {
                if (station.light) {
                    station.light.userData.pulseSpeed = 0.001; // Very slow pulse
                }
            });
            
            console.log('🎯 Reduced motion enabled for accessibility');
        }
    }
    
    onMouseMove(event) {
        this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    animate() {
        if (!this.isInitialized) return;
        
        this.animationId = requestAnimationFrame(this.animate);
        
        const time = Date.now() * 0.001;
        
        // Animate subway lines and track glow
        this.subwayLines.forEach((line, index) => {
            if (line.userData && typeof line.userData.rotationSpeed !== 'undefined') {
                line.rotation.z += line.userData.rotationSpeed;
                line.position.y = Math.sin(time + index) * 10;
            } else if (line.userData && typeof line.userData.baseOpacity !== 'undefined') {
                const material = Array.isArray(line.material) ? line.material[0] : line.material;
                if (material && typeof material.opacity === 'number') {
                    const pulse = Math.sin(time * 1.5 + index) * 0.05;
                    material.opacity = THREE.MathUtils.clamp(line.userData.baseOpacity + pulse, 0.1, 0.4);
                }
            }
        });
        
        // Update subway train movement
        this.updateTrainMovement();
        
        // Animate station lights pulsing
        this.subwayStations.forEach(station => {
            if (station.light) {
                const pulse = Math.sin(time * station.light.userData.pulseSpeed) * 0.5 + 1;
                station.light.intensity = station.light.userData.originalIntensity * pulse;
            }
            if (station.lightStrip) {
                const stripPulse = Math.sin(time * 2) * 0.3 + 0.7;
                station.lightStrip.material.emissiveIntensity = 0.5 * stripPulse;
            }
        });
        
        // Animate particles
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const velocities = this.particleSystem.geometry.attributes.velocity.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];
                
                // Wrap particles around
                if (Math.abs(positions[i]) > 500) velocities[i] *= -1;
                if (Math.abs(positions[i + 1]) > 500) velocities[i + 1] *= -1;
                if (Math.abs(positions[i + 2]) > 250) velocities[i + 2] *= -1;
            }
            
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.rotation.y += 0.001;
        }
        
        // Mouse-based camera movement
        const targetX = this.mousePosition.x * 40;
        const targetY = this.cameraTarget.y + this.mousePosition.y * 20;

        this.camera.position.x += (targetX - this.camera.position.x) * 0.05;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;
        this.camera.position.z += (this.cameraTarget.z - this.camera.position.z) * 0.05;
        this.camera.lookAt(new THREE.Vector3(0, this.mapElevation, 0));
        
        // Animate station signs
        this.scene.children.forEach(child => {
            if (child.userData.floatSpeed) {
                child.position.y = child.userData.originalY + Math.sin(time * child.userData.floatSpeed) * 20;
                child.rotation.y += child.userData.rotationSpeed;
            }
            if (child.userData.followCamera) {
                child.lookAt(this.camera.position);
            }
        });
        
        this.renderer.render(this.scene, this.camera);
    }
    
    startAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.animate();
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('mousemove', this.onMouseMove);
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.isInitialized = false;
        console.log('🚇 Jules AI 3D Engine destroyed');
    }
}

// ===== ENHANCED 3D PARTICLE SYSTEM =====
class EnhancedParticleSystem {
    constructor() {
        this.container = document.getElementById('particle-container');
        this.particles = [];
        this.animationId = null;
        this.colors = ['subway-red', 'subway-blue', 'subway-green', 'subway-orange', 'subway-purple', 'subway-yellow'];
    }
    
    init() {
        if (!this.container) return;
        
        this.createParticles();
        this.animate();
        console.log('🎆 Enhanced Particle System initialized!');
    }
    
    createParticles() {
        const particleCount = 100;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${this.colors[Math.floor(Math.random() * this.colors.length)]}`;
            
            // Random starting position
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = '100%';
            
            // Random animation duration and delay
            const duration = Math.random() * 15 + 10; // 10-25 seconds
            const delay = Math.random() * 20; // 0-20 seconds delay
            
            particle.style.animationDuration = duration + 's';
            particle.style.animationDelay = delay + 's';
            
            // Random size variation
            const size = Math.random() * 4 + 2; // 2-6px
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            this.container.appendChild(particle);
            this.particles.push(particle);
        }
    }
    
    animate() {
        // Continuous particle generation
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Occasionally add new particles
        if (Math.random() < 0.02 && this.particles.length < 150) {
            this.addParticle();
        }
    }
    
    addParticle() {
        const particle = document.createElement('div');
        particle.className = `particle ${this.colors[Math.floor(Math.random() * this.colors.length)]}`;
        
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '100%';
        
        const duration = Math.random() * 15 + 10;
        particle.style.animationDuration = duration + 's';
        
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        this.container.appendChild(particle);
        this.particles.push(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
                this.particles = this.particles.filter(p => p !== particle);
            }
        }, duration * 1000);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.particles.forEach(particle => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
        
        this.particles = [];
    }
}

// ===== GSAP-POWERED 3D ANIMATIONS =====
class GSAPAnimationController {
    constructor() {
        this.isGSAPAvailable = typeof gsap !== 'undefined';
        this.scrollTriggerAvailable = typeof ScrollTrigger !== 'undefined';
        
        if (this.scrollTriggerAvailable) {
            gsap.registerPlugin(ScrollTrigger);
        }
    }
    
    init() {
        if (!this.isGSAPAvailable) {
            console.warn('GSAP not available, using fallback animations');
            return;
        }
        
        this.setupHeroAnimations();
        this.setupFeatureAnimations();
        this.setupNavigationAnimations();
        this.setupScrollAnimations();
        
        console.log('🎬 GSAP Animation Controller initialized!');
    }
    
    setupHeroAnimations() {
        // Epic hero title entrance
        gsap.fromTo('.hero-title', 
            {
                y: 100,
                opacity: 0,
                rotationX: -90,
                scale: 0.5
            },
            {
                y: 0,
                opacity: 1,
                rotationX: 0,
                scale: 1,
                duration: 2,
                ease: "back.out(1.7)",
                delay: 0.5
            }
        );
        
        // Hero subtitle with typewriter effect
        gsap.fromTo('.hero-subtitle',
            {
                y: 50,
                opacity: 0,
                rotationY: -45
            },
            {
                y: 0,
                opacity: 1,
                rotationY: 0,
                duration: 1.5,
                ease: "power3.out",
                delay: 1.2
            }
        );
        
        // Continuous floating animation for hero elements
        gsap.to('.hero-title', {
            y: -10,
            duration: 4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1
        });
        
        gsap.to('.hero-subtitle', {
            y: -5,
            duration: 6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 1
        });
    }
    
    setupFeatureAnimations() {
        // 3D feature card animations
        gsap.utils.toArray('.jules-feature-item').forEach((card, index) => {
            // Initial state
            gsap.set(card, {
                y: 100,
                opacity: 0,
                rotationY: -45,
                scale: 0.8
            });
            
            // Entrance animation
            gsap.to(card, {
                y: 0,
                opacity: 1,
                rotationY: 0,
                scale: 1,
                duration: 1,
                ease: "back.out(1.7)",
                delay: 0.2 * index,
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
            
            // Hover animation
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    scale: 1.05,
                    rotationY: 5,
                    z: 20,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    scale: 1,
                    rotationY: 0,
                    z: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
        });
    }
    
    setupNavigationAnimations() {
        // 3D navigation enhancement
        gsap.utils.toArray('.main-nav a').forEach(link => {
            link.addEventListener('mouseenter', () => {
                gsap.to(link, {
                    scale: 1.1,
                    rotationX: -5,
                    z: 10,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            link.addEventListener('mouseleave', () => {
                gsap.to(link, {
                    scale: 1,
                    rotationX: 0,
                    z: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
        });
        
        // CTA button epic animation
        const ctaButton = document.querySelector('.nav-cta-button');
        if (ctaButton) {
            gsap.to(ctaButton, {
                rotationY: 360,
                duration: 20,
                ease: "none",
                repeat: -1
            });
        }
    }
    
    setupScrollAnimations() {
        if (!this.scrollTriggerAvailable) return;
        
        // Parallax background animation
        gsap.to('.hero-section', {
            yPercent: -50,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero-section",
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
        
        // FAQ items staggered animation
        gsap.utils.toArray('.faq-item').forEach((item, index) => {
            gsap.fromTo(item,
                {
                    x: index % 2 === 0 ? -100 : 100,
                    opacity: 0,
                    rotationY: index % 2 === 0 ? -30 : 30
                },
                {
                    x: 0,
                    opacity: 1,
                    rotationY: 0,
                    duration: 1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: item,
                        start: "top 80%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });
        
        // Stats counter animation
        gsap.utils.toArray('.stat-number').forEach(stat => {
            const finalValue = parseInt(stat.textContent);
            const suffix = stat.textContent.replace(/\d/g, '');
            
            gsap.fromTo({ value: 0 }, 
                { value: finalValue },
                {
                    duration: 2,
                    ease: "power2.out",
                    onUpdate: function() {
                        stat.textContent = Math.floor(this.targets()[0].value) + suffix;
                    },
                    scrollTrigger: {
                        trigger: stat,
                        start: "top 80%",
                        toggleActions: "play none none none"
                    }
                }
            );
        });
    }
}

// ===== INITIALIZATION =====
let julesEngine = null;
let particleSystem = null;
let animationController = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Three.js to load
    setTimeout(() => {
        if (typeof THREE !== 'undefined') {
            julesEngine = new JulesAI3DEngine();
            julesEngine.init();
        } else {
            console.warn('Three.js not loaded, skipping 3D engine');
        }
        
        particleSystem = new EnhancedParticleSystem();
        particleSystem.init();
        
        animationController = new GSAPAnimationController();
        animationController.init();
        
        console.log('🎉 All 3D systems initialized!');
    }, 500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (julesEngine) julesEngine.destroy();
    if (particleSystem) particleSystem.destroy();
});

// Export for external use
window.JulesAI3D = {
    engine: julesEngine,
    particles: particleSystem,
    animations: animationController
};
