import { useEffect, useState } from "react";
import { Hud } from "./ui/Hud";
import { useOverlayStore } from "./store/overlayStore";
import { startWsClient } from "./ws/wsClient";

export default function App() {

  const toggleLocked = useOverlayStore((s) => s.toggleLocked);

  const [panelOpen, setPanelOpen] = useState(false);

  startWsClient({ url: "ws://127.0.0.1:8080/overlay/ws" });

  // 단축키: G (패널 토글), Ctrl+Shift+O (잠금 토글)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setPanelOpen((v) => !v);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        toggleLocked();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleLocked]);

  return (
    <div className="w-full h-full">
      <Hud />
      {/* 패널은 다음 단계에서 실제 컴포넌트로 연결 */}
      {panelOpen && (
        <div className="mt-2">
          {/* TODO: Panel 컴포넌트 연결 */}
        </div>
      )}
    </div>
  );
}