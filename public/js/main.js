document.addEventListener('DOMContentLoaded', () => {
    // --- 1. iOS Permissions for Sensors ---
    const permissionsBtn = document.getElementById('permissions-btn');
    
    // Check if we need to request permissions (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        permissionsBtn.classList.remove('hidden');
        permissionsBtn.addEventListener('click', async () => {
            try {
                let orientationPerm = 'granted';
                let motionPerm = 'granted';

                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    orientationPerm = await DeviceOrientationEvent.requestPermission();
                }
                if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
                    motionPerm = await DeviceMotionEvent.requestPermission();
                }
                
                if (orientationPerm === 'granted' || motionPerm === 'granted') {
                    permissionsBtn.classList.add('hidden');
                    initSensors();
                } else {
                    alert(`Permisos denegados (Orientación: ${orientationPerm}, Movimiento: ${motionPerm}).\nAsegúrate de usar HTTPS o verifica la configuración de Safari (Settings > Safari > Motion & Orientation Access).`);
                }
            } catch (err) {
                alert(`Error al solicitar permisos: ${err.message}\n(Asegúrate de acceder mediante HTTPS)`);
                console.error('Error requesting sensor permissions:', err);
            }
        });
    } else {
        // Non-iOS 13+ devices, init sensors directly
        initSensors();
    }

    // --- 2. Camera & Shape Detection (Face / Barcode) ---
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('overlay-canvas');
    const ctx = canvas.getContext('2d');
    const barcodeResult = document.getElementById('barcode-result');
    const unsupportedMsg = document.getElementById('unsupported-msg');
    
    const faceToggle = document.getElementById('face-toggle');
    const barcodeToggle = document.getElementById('barcode-toggle');

    let faceDetector = null;
    let barcodeDetector = null;
    let animationFrameId = null;

    // Check Support
    const supportsFaceDetection = 'FaceDetector' in window;
    const supportsBarcodeDetection = 'BarcodeDetector' in window;

    if (supportsFaceDetection) {
        faceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
    }
    if (supportsBarcodeDetection) {
        // You can specify formats: new BarcodeDetector({ formats: ['qr_code', 'ean_13'] })
        barcodeDetector = new BarcodeDetector();
    }

    if (!supportsFaceDetection && !supportsBarcodeDetection) {
        unsupportedMsg.classList.remove('hidden');
        unsupportedMsg.innerHTML = 'Shape Detection API is not supported in this browser. <br><small>Try Chrome with experimental flags enabled.</small>';
    }

    // Initialize Camera
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    advanced: [{ focusMode: "continuous" }]
                }
            });
            video.srcObject = stream;
            
            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                processVideoFrame();
            });
        } catch (err) {
            console.error('Error accessing camera:', err);
            unsupportedMsg.classList.remove('hidden');
            unsupportedMsg.textContent = 'Camera access denied or unavailable.';
        }
    }

    async function processVideoFrame() {
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 2a. Face Detection
        if (supportsFaceDetection && faceToggle.checked) {
            try {
                const faces = await faceDetector.detect(video);
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'red';
                faces.forEach(face => {
                    const { top, left, width, height } = face.boundingBox;
                    ctx.strokeRect(left, top, width, height);
                });
            } catch (err) {
                console.error('Face detection error:', err);
            }
        }

        // 2b. Barcode Detection
        if (supportsBarcodeDetection && barcodeToggle.checked) {
            try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes.length > 0) {
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = '#10b981'; // Success Green
                    barcodes.forEach(barcode => {
                        const { top, left, width, height } = barcode.boundingBox;
                        ctx.strokeRect(left, top, width, height);
                        barcodeResult.textContent = barcode.rawValue;
                        barcodeResult.classList.remove('hidden');
                    });
                } else {
                    barcodeResult.classList.add('hidden');
                }
            } catch (err) {
                console.error('Barcode detection error:', err);
            }
        } else {
            barcodeResult.classList.add('hidden');
        }

        animationFrameId = requestAnimationFrame(processVideoFrame);
    }

    // Start camera only if toggles are used to save battery
    faceToggle.addEventListener('change', handleCameraState);
    barcodeToggle.addEventListener('change', handleCameraState);

    let isCameraRunning = false;
    function handleCameraState() {
        if ((faceToggle.checked || barcodeToggle.checked) && !isCameraRunning) {
            isCameraRunning = true;
            initCamera();
        } else if (!faceToggle.checked && !barcodeToggle.checked && isCameraRunning) {
            isCameraRunning = false;
            cancelAnimationFrame(animationFrameId);
            const stream = video.srcObject;
            if (stream) {
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
            video.srcObject = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // --- 3. Orientation & 4. Motion ---
    const alphaVal = document.getElementById('alpha-val');
    const betaVal = document.getElementById('beta-val');
    const gammaVal = document.getElementById('gamma-val');
    const compassIndicator = document.getElementById('compass-indicator');

    const accX = document.getElementById('acc-x');
    const accY = document.getElementById('acc-y');
    const accZ = document.getElementById('acc-z');
    const motionBubble = document.getElementById('motion-bubble');

    function initSensors() {
        // Device Orientation
        window.addEventListener('deviceorientation', (event) => {
            if (event.alpha === null) return; // No hardware support
            
            const alpha = event.alpha.toFixed(1); // Z-axis
            const beta = event.beta.toFixed(1);   // X-axis
            const gamma = event.gamma.toFixed(1); // Y-axis

            // Format with fixed zeros to guarantee consistent length
            const formatAngle = (val) => (val >= 0 ? '+' : '-') + Math.abs(val).toFixed(1).padStart(5, '0') + '°';
            alphaVal.textContent = formatAngle(event.alpha);
            betaVal.textContent = formatAngle(event.beta);
            gammaVal.textContent = formatAngle(event.gamma);

            // Rotate compass indicator (subtracting from 360 to act like a real compass pointing North)
            compassIndicator.style.transform = `rotate(${360 - event.alpha}deg)`;
        });

        // Device Motion
        window.addEventListener('devicemotion', (event) => {
            // Prefer pure acceleration (no gravity) for true "motion" feeling
            let source = event.acceleration;
            
            // Fallback to including gravity if device lacks linear accelerometer
            if (!source || source.x === null) {
                source = event.accelerationIncludingGravity;
            }
            if (!source || source.x === null) return;
            
            const x = source.x || 0;
            const y = source.y || 0;
            const z = source.z || 0;

            // Format with padding to prevent layout shifts (e.g., +05.23, -15.22)
            const formatMotion = (val) => (val >= 0 ? '+' : '-') + Math.abs(val).toFixed(2).padStart(5, '0');
            accX.textContent = formatMotion(x);
            accY.textContent = formatMotion(y);
            accZ.textContent = formatMotion(z);

            // Move bubble based ONLY on pure motion spikes
            let posX = 50 + (x * 10); // Higher multiplier since pure acceleration values are smaller
            let posY = 50 - (y * 10); 

            // Constrain bubble within container
            posX = Math.max(10, Math.min(posX, 90));
            posY = Math.max(10, Math.min(posY, 90));

            motionBubble.style.left = `${posX}%`;
            motionBubble.style.top = `${posY}%`;
            
            // Visual effect: change bubble scale based on Z-axis movement
            const scale = 1 + Math.abs(z / 10);
            motionBubble.style.transform = `translate(-50%, -50%) scale(${scale})`;
        });
    }

    // --- 5. PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered with scope:', registration.scope);
                })
                .catch(err => {
                    console.error('SW registration failed:', err);
                });
        });
    }
});
