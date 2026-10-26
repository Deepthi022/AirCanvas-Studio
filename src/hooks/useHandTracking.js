import { useEffect, useRef, useState } from "react";
import { initHandTracker, detect } from "../services/handTrackingService";

export function useHandTracking(videoRef, cameraReady, onFrame) {
  const [modelReady, setModelReady] = useState(false);
  const cb = useRef(onFrame);
  cb.current = onFrame; // always call the latest callback

  useEffect(() => {
    if (!cameraReady) return;
    let raf;
    let lastTime = -1;
    let stopped = false;

    initHandTracker().then(() => {
      if (stopped) return;
      setModelReady(true);

      const loop = () => {
        if (stopped) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const res = detect(v, performance.now());
          const hands = res.handedness ?? res.handednesses;
          cb.current?.({
            landmarks: res.landmarks[0] ?? null,
            confidence: hands?.[0]?.[0]?.score ?? 0,
          });
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [cameraReady]);

  return { modelReady };
}