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
            this.createSubwayNetwork();
            this.createFloatingParticles();
            this.createInteractiveElements();
            this.setupEventListeners();
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
    }
    
    setupCamera() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 2000);
        this.camera.position.set(0, 0, 100);
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
    
    createSubwayNetwork() {
        // Create 3D subway line network
        const lineColors = Object.values(this.colors);
        
        for (let i = 0; i < 8; i++) {
            const points = [];
            const numPoints = 20;
            
            for (let j = 0; j < numPoints; j++) {
                const angle = (j / numPoints) * Math.PI * 2;
                const radius = 200 + Math.sin(j * 0.5) * 50;
                const x = Math.cos(angle + i * 0.3) * radius;
                const y = Math.sin(angle + i * 0.3) * radius;
                const z = Math.sin(j * 0.2 + i) * 30;
                points.push(new THREE.Vector3(x, y, z));
            }
            
            const curve = new THREE.CatmullRomCurve3(points, true);
            const geometry = new THREE.TubeGeometry(curve, 100, 2, 8, true);
            const material = new THREE.MeshPhongMaterial({
                color: lineColors[i % lineColors.length],
                transparent: true,
                opacity: 0.7,
                emissive: lineColors[i % lineColors.length],
                emissiveIntensity: 0.1
            });
            
            const tube = new THREE.Mesh(geometry, material);
            tube.userData = { 
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                originalOpacity: 0.7
            };
            
            this.subwayLines.push(tube);
            this.scene.add(tube);
        }
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
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize, false);
        window.addEventListener('mousemove', this.onMouseMove, false);
        
        // Add scroll-based camera movement
        window.addEventListener('scroll', () => {
            const scrollPercent = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight);
            this.camera.position.z = 100 + scrollPercent * 200;
            this.camera.rotation.x = scrollPercent * 0.2;
        });
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onMouseMove(event) {
        this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    animate() {
        if (!this.isInitialized) return;
        
        this.animationId = requestAnimationFrame(this.animate);
        
        const time = Date.now() * 0.001;
        
        // Animate subway lines
        this.subwayLines.forEach((line, index) => {
            line.rotation.z += line.userData.rotationSpeed;
            line.position.y = Math.sin(time + index) * 10;
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
        this.camera.position.x += (this.mousePosition.x * 20 - this.camera.position.x) * 0.05;
        this.camera.position.y += (this.mousePosition.y * 20 - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);
        
        // Animate station signs
        this.scene.children.forEach(child => {
            if (child.userData.floatSpeed) {
                child.position.y = child.userData.originalY + Math.sin(time * child.userData.floatSpeed) * 20;
                child.rotation.y += child.userData.rotationSpeed;
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
