// ─────────────────────────────────────────────────────────────
//  얼굴 좌표 뽑기 (MediaPipe Face Landmarker)
//
//  · 모델은 처음 한 번만 내려받고(약 3MB), 그 뒤로는 서비스 워커가 캐시해요.
//  · 사진과 분석은 전부 휴대폰 안에서 끝나요. 어디로도 올라가지 않아요.
//  · 인터넷이 없거나 모델을 못 받으면 솔직하게 알려 주고 멈춰요 (지어내지 않아요).
// ─────────────────────────────────────────────────────────────
const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise = null;

async function loadLandmarker() {
  const vision = await import(/* @vite-ignore */ VISION);
  const fileset = await vision.FilesetResolver.forVisionTasks(`${VISION}/wasm`);
  return vision.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
    runningMode: 'IMAGE',
    numFaces: 1,
  });
}

/** 모델 준비 (한 번만 받아 두고 재사용) */
export function prepare() {
  if (!landmarkerPromise) {
    landmarkerPromise = loadLandmarker().catch((e) => {
      landmarkerPromise = null; // 다음에 다시 시도할 수 있게
      throw e;
    });
  }
  return landmarkerPromise;
}

/** 모델이 GPU로 안 되면 CPU로 한 번 더 */
async function getLandmarker() {
  try {
    return await prepare();
  } catch {
    landmarkerPromise = (async () => {
      const vision = await import(/* @vite-ignore */ VISION);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${VISION}/wasm`);
      return vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    })().catch((e) => { landmarkerPromise = null; throw e; });
    return landmarkerPromise;
  }
}

export const FACE_ERR = {
  model: '얼굴 분석 기능을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
  none: '사진에서 얼굴을 찾지 못했어요. 얼굴이 화면에 크게, 정면으로 나오게 다시 찍어 주세요.',
  read: '사진을 여는 데 실패했어요. 다른 사진으로 시도해 주세요.',
};

/**
 * 이미지 → 얼굴 좌표 468개
 * @param {HTMLImageElement|HTMLCanvasElement} image
 * @returns {Promise<Array<{x:number,y:number,z:number}>>}
 */
export async function detectFace(image) {
  let landmarker;
  try {
    landmarker = await getLandmarker();
  } catch {
    const err = new Error(FACE_ERR.model);
    err.code = 'model';
    throw err;
  }
  const out = landmarker.detect(image);
  const pts = out?.faceLandmarks?.[0];
  if (!pts || pts.length < 400) {
    const err = new Error(FACE_ERR.none);
    err.code = 'none';
    throw err;
  }
  return pts;
}

// ── 앱 안 카메라 (얼굴 가이드를 그리려면 기본 카메라 앱이 아니라 여기서 찍어야 해요) ──
export const cameraSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export const CAM_ERR = {
  denied: '카메라를 쓸 수 없어요. 브라우저 설정에서 카메라 권한을 허용하거나, 앨범에서 사진을 골라 주세요.',
  none: '이 기기에서는 앱 안 카메라를 열 수 없어요. 앨범에서 사진을 골라 주세요.',
};

/** 전면 카메라 열기 */
export async function openCamera() {
  if (!cameraSupported()) {
    const e = new Error(CAM_ERR.none); e.code = 'none'; throw e;
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
  } catch (err) {
    const e = new Error(err?.name === 'NotAllowedError' ? CAM_ERR.denied : CAM_ERR.none);
    e.code = err?.name === 'NotAllowedError' ? 'denied' : 'none';
    throw e;
  }
}

export function closeCamera(stream) {
  try { stream?.getTracks?.().forEach((t) => t.stop()); } catch { /* 이미 닫힘 */ }
}

/**
 * 화면에 보이던 그대로 한 장 찍기. 거울 반전은 하지 않아요 — 좌우 광대를 가려야 하니까요.
 * @param video  <video> 요소
 * @param aspect 화면에 보이던 가로÷세로 (object-cover로 잘린 영역을 그대로 재현)
 */
export function captureFrame(video, aspect = 3 / 4, maxSide = 640) {
  const vw = video?.videoWidth;
  const vh = video?.videoHeight;
  if (!vw || !vh) {
    const e = new Error(FACE_ERR.read); e.code = 'read'; throw e;
  }
  let sw = vw;
  let sh = vh;
  if (vw / vh > aspect) sw = vh * aspect; else sh = vw / aspect;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return { canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height };
}

/** 업로드한 파일 → 화면에 그릴 수 있는 이미지 (긴 변 640px로 줄여서 분석) */
export function fileToImage(file, maxSide = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({ canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: w, height: h });
      } catch (e) {
        URL.revokeObjectURL(url);
        const err = new Error(FACE_ERR.read);
        err.code = 'read';
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const err = new Error(FACE_ERR.read);
      err.code = 'read';
      reject(err);
    };
    img.src = url;
  });
}
