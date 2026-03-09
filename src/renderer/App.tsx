import { useEffect } from "react";
import { Hud } from "./ui/Hud";
import { useOverlayStore } from "./store/overlayStore";
import { startWsClient } from "./ws/wsClient";

export default function App() {
  const toggleLocked = useOverlayStore((s) => s.toggleLocked);

  // WebSocket 연결 시작
  useEffect(() => {
    const client = startWsClient({ url: "ws://127.0.0.1:8080/overlay/ws" });

    return () => {
      client.stop();
    };
  }, []);

  // 단축키: Ctrl+Shift+O (잠금 토글)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        toggleLocked();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleLocked]);

  return (
    <div className="w-full h-auto">
      <Hud />
    </div>
  );
}