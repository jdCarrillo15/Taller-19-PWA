let currentFileHandle = null;

document.getElementById("btn-open-dir").addEventListener("click", async () => {
  try {
    // Pide permiso para abrir un directorio
    const dirHandle = await window.showDirectoryPicker();
    const container = document.getElementById("file-tree-container");
    container.innerHTML = "";

    // Usa el Web Component file-tree de DannyMoerkerke
    const fileTree = document.createElement("file-tree");
    fileTree.setAttribute("dir", "");
    container.appendChild(fileTree);
    fileTree.setDirectory(dirHandle); // método del Web Component

    // Escucha cuando el usuario selecciona un archivo
    fileTree.addEventListener("file-open", async (e) => {
      currentFileHandle = e.detail.fileHandle;
      const file = await currentFileHandle.getFile();

      if (file.type.startsWith("image/")) {
        // Mostrar imagen
        const url = URL.createObjectURL(file);
        container.innerHTML += `<img src="${url}" style="max-width:100%">`;
      } else {
        // Mostrar texto editable
        const text = await file.text();
        document.getElementById("file-content").value = text;
        document.getElementById("file-editor").style.display = "block";
      }
    });
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
