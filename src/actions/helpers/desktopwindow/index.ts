import { useEffect, useState } from "react";

// Tamanho da janela do app instalado na primeira abertura (depois, vale o tamanho que a pessoa deixar).
const WINDOW_WIDTH = 1600;
const WINDOW_HEIGHT = 900;
const SIZED_KEY = "tickflix-window-sized";

// Verdadeiro quando o TickFlix roda como app instalado (janela própria), e não numa aba do navegador.
const isInstalledApp = (): boolean => ["window-controls-overlay", "standalone", "fullscreen"].some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);

// Primeira abertura do app instalado: janela de 1600 x 900, centralizada (ou do tamanho da tela, se ela for menor).
const sizeWindowOnce = (): void => {
  try {
    if (localStorage.getItem(SIZED_KEY)) return;
    localStorage.setItem(SIZED_KEY, "1");
  } catch {
    return;
  }
  const width = Math.min(WINDOW_WIDTH, window.screen.availWidth);
  const height = Math.min(WINDOW_HEIGHT, window.screen.availHeight);
  window.resizeTo(width, height);
  window.moveTo(Math.round((window.screen.availWidth - width) / 2), Math.round((window.screen.availHeight - height) / 2));
};

// O app instalado: se está rodando como app, abre a janela no tamanho certo e dá o botão de tela cheia (F11 também funciona).
// usado em: AppNav
export const useDesktopWindow = () => {
  const [installed] = useState(isInstalledApp);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    if (installed) sizeWindowOnce();
  }, [installed]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return { installed, fullscreen, toggleFullscreen };
};
