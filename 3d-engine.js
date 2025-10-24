/* global THREE */

class JulesSubwayScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.stageElement = canvas ? canvas.parentElement : null;

        this.renderer = null;
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
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerLeave = this.onPointerLeave.bind(this);
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
        this.renderer.setClearColor(0x010409, 0);
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
                    metalness: 0.5,
                    roughness: 0.35
                })
            );
            lightStrip.position.set(
                station.positionVector.x,
                this.mapElevation + 6,
                station.positionVector.z + 4
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

    setRendererSize() {
        if (!this.renderer || !this.camera) return;
        const { width, height } = this.getCanvasSize();
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
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
