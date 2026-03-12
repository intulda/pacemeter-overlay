import { useEffect, useRef } from "react";
import { getInputMode, getServerBaseUrl, getSessionId, toOverlayWsUrl } from "./config/runtime";
import { Hud } from "./ui/Hud";
import { useOverlayStore } from "./store/overlayStore";
import { startActRelayClient } from "./ws/actRelay";
import { startWsClient } from "./ws/wsClient";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const serverBaseUrl = useOverlayStore((s) => s.serverBaseUrl);
  const sessionId = useOverlayStore((s) => s.sessionId);
  const inputMode = useOverlayStore((s) => s.inputMode);
  const connection = useOverlayStore((s) => s.connection);
  const showParty = useOverlayStore((s) => s.showParty);
  const showDebug = useOverlayStore((s) => s.showDebug);
  const toggleLocked = useOverlayStore((s) => s.toggleLocked);
  const toggleShowDebug = useOverlayStore((s) => s.toggleShowDebug);
  const setActRelayConnection = useOverlayStore((s) => s.setActRelayConnection);
  const setInputMode = useOverlayStore((s) => s.setInputMode);
  const setServerBaseUrl = useOverlayStore((s) => s.setServerBaseUrl);
  const setSessionId = useOverlayStore((s) => s.setSessionId);

  useEffect(() => {
    setInputMode(getInputMode());
    setServerBaseUrl(getServerBaseUrl());
    setSessionId(getSessionId());
  }, [setInputMode, setServerBaseUrl, setSessionId]);

  useEffect(() => {
    const wsClient = startWsClient({
      url: toOverlayWsUrl(serverBaseUrl, inputMode === "LIVE" ? sessionId : undefined),
    });
    const relayClient = inputMode === "LIVE"
      ? startActRelayClient({
          serverBaseUrl,
          sessionId,
          onStatusChange: setActRelayConnection,
        })
      : null;
    if (inputMode !== "LIVE") {
      setActRelayConnection("DISCONNECTED");
    }

    return () => {
      wsClient.stop();
      relayClient?.stop();
    };
  }, [inputMode, serverBaseUrl, sessionId, setActRelayConnection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        toggleLocked();
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        toggleShowDebug();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleLocked, toggleShowDebug]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let frame = 0;
    let lastHeight = -1;
    const requestResize = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextHeight = Math.ceil(element.getBoundingClientRect().height);
        if (nextHeight <= 0 || nextHeight === lastHeight) {
          return;
        }
        lastHeight = nextHeight;
        void window.ipcRenderer.invoke("overlay:resize", nextHeight);
      });
    };

    const observer = new ResizeObserver(() => {
      requestResize();
    });
    observer.observe(element);
    requestResize();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [connection, showDebug, showParty]);

  return (
    <div ref={containerRef} className="w-full h-auto">
      <Hud />
    </div>
  );
}
