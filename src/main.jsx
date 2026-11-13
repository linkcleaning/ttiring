import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 서비스 워커 등록 (빌드된 배포본에서만)
// 스토어 앱(Capacitor) 안에서는 서비스 워커가 필요 없어요 (파일이 이미 앱 안에 있음)
const inApp = !!window.Capacitor?.isNativePlatform?.();
if ('serviceWorker' in navigator && import.meta.env.PROD && !inApp) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW 등록 실패', e));
  });
}
