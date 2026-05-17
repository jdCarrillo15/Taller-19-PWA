let currentFileHandle = null;

document.getElementById("btn-open-dir").addEventListener("click", async () => {
  try {
    // Pide permiso para abrir un directorio
    const dirHandle = await window.showDirectoryPicker();
    const container = document.getElementById("file-tree-container");
    container.innerHTML = "<ul id='file-list' style='list-style:none; padding:0; margin-top:10px;'></ul><div id='media-preview'></div>";
    const ul = document.getElementById("file-list");
    const mediaPreview = document.getElementById("media-preview");

    // Iterar manualmente sobre los archivos usando Vanilla JS (Mucho más seguro que usar librerías externas)
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = `📄 ${entry.name}`;
        btn.style.margin = "4px 0";
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.backgroundColor = "#e2e8f0";
        btn.style.color = "#0f172a";

        btn.addEventListener("click", async () => {
          currentFileHandle = entry;
          const file = await currentFileHandle.getFile();
          
          // Limpiar vistas previas anteriores
          mediaPreview.innerHTML = "";
          document.getElementById("file-editor").style.display = "none";

          if (file.type.startsWith("image/")) {
            // Mostrar imagen
            const url = URL.createObjectURL(file);
            mediaPreview.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px; margin-top:10px;">`;
          } else {
            // Mostrar texto editable
            const text = await file.text();
            document.getElementById("file-content").value = text;
            document.getElementById("file-content").style.width = "100%";
            document.getElementById("file-content").style.minHeight = "150px";
            document.getElementById("file-editor").style.display = "flex";
            document.getElementById("file-editor").style.flexDirection = "column";
            document.getElementById("file-editor").style.gap = "10px";
            document.getElementById("file-editor").style.marginTop = "10px";
          }
        });

        li.appendChild(btn);
        ul.appendChild(li);
      }
    }
    
    if (ul.children.length === 0) {
      ul.innerHTML = "<li style='color: #64748b; font-size: 0.9rem;'>La carpeta está vacía.</li>";
    }
  } catch (err) {
    if (err.name !== "AbortError") console.error(err);
  }
});

document.getElementById("btn-save").addEventListener("click", async () => {
  if (!currentFileHandle) return;
  const writable = await currentFileHandle.createWritable();
  await writable.write(document.getElementById("file-content").value);
  await writable.close();
  alert("Archivo guardado!");
});

let credentialId = null;

document.getElementById("btn-register").addEventListener("click", async () => {
  const status = document.getElementById("auth-status");
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Taller PWA - UPTC" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "estudiante@uptc.edu.co",
          displayName: "Estudiante UPTC",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          userVerification: "required",
        },
        timeout: 60000,
      },
    });

    // Guardamos el ID para usarlo en el login
    credentialId = credential.rawId;
    localStorage.setItem(
      "credentialId",
      btoa(String.fromCharCode(...new Uint8Array(credentialId))),
    );
    status.textContent = "Biométrica registrada correctamente!";
    status.style.color = "green";
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    status.style.color = "red";
  }
});

document.getElementById("btn-login").addEventListener("click", async () => {
  const status = document.getElementById("auth-status");
  const savedId = localStorage.getItem("credentialId");

  if (!savedId) {
    status.textContent = "Primero regístrate!";
    return;
  }

  try {
    const idBytes = Uint8Array.from(atob(savedId), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            id: idBytes.buffer,
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    status.textContent = "Autenticación exitosa!";
    status.style.color = "green";
  } catch (err) {
    status.textContent = `Falló: ${err.message}`;
    status.style.color = "red";
  }
});

let screenStream;
let screenRecorder;
let screenChunks = [];

const btnStartScreen = document.getElementById("btn-start-screen");
const btnStopScreen = document.getElementById("btn-stop-screen");
const screenPreview = document.getElementById("screen-preview");
const downloadScreen = document.getElementById("download-screen");

btnStartScreen.addEventListener("click", async () => {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    screenPreview.srcObject = screenStream;

    screenChunks = [];
    screenRecorder = new MediaRecorder(screenStream);

    screenRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) screenChunks.push(e.data);
    };

    screenRecorder.onstop = () => {
      const blob = new Blob(screenChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      downloadScreen.href = url;
      downloadScreen.style.display = "inline-block";
      downloadScreen.textContent = "Descargar video grabado";
    };

    screenRecorder.start();

    btnStartScreen.disabled = true;
    btnStopScreen.disabled = false;
  } catch (err) {
    console.error("Error al capturar pantalla:", err);
    alert("No se pudo capturar pantalla");
  }
});

btnStopScreen.addEventListener("click", () => {
  if (screenRecorder && screenRecorder.state !== "inactive") {
    screenRecorder.stop();
  }

  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
  }

  btnStartScreen.disabled = false;
  btnStopScreen.disabled = true;
});

let audioStream;
let audioRecorder;
let audioChunks = [];

const btnStartAudio = document.getElementById("btn-start-audio");
const btnStopAudio = document.getElementById("btn-stop-audio");
const audioPreview = document.getElementById("audio-preview");
const downloadAudio = document.getElementById("download-audio");

btnStartAudio.addEventListener("click", async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    audioChunks = [];
    audioRecorder = new MediaRecorder(audioStream);

    audioRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    audioRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      audioPreview.src = url;

      downloadAudio.href = url;
      downloadAudio.style.display = "inline-block";
      downloadAudio.textContent = "Descargar audio grabado";
    };

    audioRecorder.start();

    btnStartAudio.disabled = true;
    btnStopAudio.disabled = false;
  } catch (err) {
    console.error("Error al grabar audio:", err);
    alert("No se pudo acceder al micrófono");
  }
});

btnStopAudio.addEventListener("click", () => {
  if (audioRecorder && audioRecorder.state !== "inactive") {
    audioRecorder.stop();
  }

  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
  }

  btnStartAudio.disabled = false;
  btnStopAudio.disabled = true;
});

// =========================================
// NUEVAS FUNCIONALIDADES DEL TALLER
// =========================================

// --- 1. Face Detection ---
const faceInput = document.getElementById("face-input");
const faceCanvas = document.getElementById("face-canvas");

faceInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  faceCanvas.width = img.width;
  faceCanvas.height = img.height;
  const ctx = faceCanvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  if (!("FaceDetector" in window)) {
    alert("La imagen se cargó, pero la Face Detection API no está soportada nativamente en este navegador de PC para buscar rostros.");
    return;
  }

  try {
    const detector = new FaceDetector();
    const faces = await detector.detect(img);
    
    if (faces.length === 0) {
      alert("El código funcionó, pero el navegador devolvió 0 rostros. (Nota: En PC, esta API experimental suele no tener motor de búsqueda. ¡Pruébalo en Android para ver el cuadro verde!)");
    }
    
    ctx.strokeStyle = "#10b981"; // Borde verde
    ctx.lineWidth = 5;
    faces.forEach(face => {
      const { top, left, width, height } = face.boundingBox;
      ctx.strokeRect(left, top, width, height);
    });
  } catch (err) {
    console.error("Error detectando rostros:", err);
    alert("Error en el detector: " + err.message);
  }
});

// --- 2. Barcode Detection ---
const barcodeInput = document.getElementById("barcode-input");
const barcodeResult = document.getElementById("barcode-result");

barcodeInput.addEventListener("change", async (e) => {
  if (!("BarcodeDetector" in window)) {
    alert("Barcode Detection API no está soportada en este navegador.");
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  try {
    const detector = new BarcodeDetector();
    const barcodes = await detector.detect(img);
    
    if (barcodes.length > 0) {
      barcodeResult.textContent = "Resultado: " + barcodes.map(b => b.rawValue).join(", ");
      barcodeResult.style.color = "green";
    } else {
      barcodeResult.textContent = "Resultado: No se encontraron códigos.";
      barcodeResult.style.color = "red";
    }
  } catch (err) {
    console.error("Error leyendo código de barras:", err);
  }
});

// --- 3. Orientation ---
window.addEventListener("deviceorientation", (e) => {
  document.getElementById("ori-alpha").textContent = e.alpha ? Math.round(e.alpha) : 0;
  document.getElementById("ori-beta").textContent = e.beta ? Math.round(e.beta) : 0;
  document.getElementById("ori-gamma").textContent = e.gamma ? Math.round(e.gamma) : 0;
  
  // Rotar visualmente un cuadradito
  document.getElementById("ori-box").style.transform = 
    `rotateZ(${e.alpha || 0}deg) rotateX(${e.beta || 0}deg) rotateY(${e.gamma || 0}deg)`;
});

// --- 4. Motion ---
window.addEventListener("devicemotion", (e) => {
  if (e.acceleration) {
    document.getElementById("mot-x").textContent = e.acceleration.x ? e.acceleration.x.toFixed(2) : 0;
    document.getElementById("mot-y").textContent = e.acceleration.y ? e.acceleration.y.toFixed(2) : 0;
    document.getElementById("mot-z").textContent = e.acceleration.z ? e.acceleration.z.toFixed(2) : 0;
  }
});

// --- 5. Multitouch ---
const touchCanvas = document.getElementById("touch-canvas");
const touchCtx = touchCanvas.getContext("2d");

const drawTouches = (e) => {
  e.preventDefault(); // Evita que la pantalla haga scroll al tocar el canvas
  touchCtx.clearRect(0, 0, touchCanvas.width, touchCanvas.height);
  document.getElementById("touch-count").textContent = e.touches.length;

  const rect = touchCanvas.getBoundingClientRect();
  Array.from(e.touches).forEach(touch => {
    touchCtx.beginPath();
    touchCtx.arc(touch.clientX - rect.left, touch.clientY - rect.top, 25, 0, 2 * Math.PI);
    touchCtx.fillStyle = "rgba(59, 130, 246, 0.5)"; // Círculo azul semitransparente
    touchCtx.fill();
    touchCtx.stroke();
  });
};

touchCanvas.addEventListener("touchstart", drawTouches);
touchCanvas.addEventListener("touchmove", drawTouches);
touchCanvas.addEventListener("touchend", drawTouches);

// --- 6. ViewTransition ---
document.getElementById("btn-vt").addEventListener("click", () => {
  const box = document.getElementById("vt-box");
  
  // Si la API no está soportada, simplemente cambiamos la clase sin animación
  if (!document.startViewTransition) {
    box.classList.toggle("vt-box-alt");
    return;
  }

  // Inicia la transición nativa
  document.startViewTransition(() => {
    box.classList.toggle("vt-box-alt");
  });
});

// =========================================
// REGISTRO DEL SERVICE WORKER (Para hacerla instalable/descargable)
// =========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registrado con éxito en el alcance:', registration.scope);
      })
      .catch(error => console.error('Error al registrar el ServiceWorker:', error));
  });
}
