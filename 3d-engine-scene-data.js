/* eslint-disable no-unused-vars */

const sceneData = {
    map: {
        imageUrl: 'nyc_subway_map_optimized.jpg',
        width: 820,
        height: 520,
        elevation: -18,
        floatAmplitude: 4.2
    },
    track: {
        elevation: 22,
        points: [
            { x: -320, z: 190 }, { x: -220, z: 120 }, { x: -160, z: 30 },
            { x: -90, z: -60 }, { x: 0, z: -150 }, { x: 120, z: -200 },
            { x: 240, z: -120 }, { x: 260, z: 20 }, { x: 210, z: 160 },
            { x: 80, z: 220 }, { x: -120, z: 220 }
        ],
        color: 0x2563EB,
        emissive: 0x2563EB,
        emissiveIntensity: 0.6
    },
    stations: [
        { name: 'BUG FIXING', t: 0.03, color: 'red' },
        { name: 'VERSION BUMPS', t: 0.2, color: 'blue' },
        { name: 'AUTOMATED TESTS', t: 0.36, color: 'green' },
        { name: 'FEATURE BUILDING', t: 0.52, color: 'orange' },
        { name: 'GITHUB INTEGRATION', t: 0.68, color: 'purple' },
        { name: 'GEMINI 2.5 POWERED', t: 0.84, color: 'yellow' }
    ],
    train: {
        speed: 0.00065,
        bodyColor: 0x1F2937,
        windowColor: 0x0F172A,
        headlightColor: 0xFACC15
    },
    particles: {
        count: 180,
        color: 0xffffff,
        size: 5
    },
    camera: {
        basePosition: { x: 0, y: 220, z: 360 }
    },
    colors: {
        red: 0xEE352E,
        blue: 0x0039A6,
        green: 0x00933C,
        orange: 0xFF6319,
        purple: 0xB933AD,
        yellow: 0xFCCC0A
    }
};
