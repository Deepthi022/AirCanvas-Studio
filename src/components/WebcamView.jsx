import { forwardRef, useEffect } from "react";

const WebcamView = forwardRef(function WebcamView({ width, height, onReady }, ref) {
  useEffect(() => {
    let stream;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { width, height } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = ref.current;
        video.srcObject = s;
        video.onloadeddata = () => onReady?.();
        video.play();
      })
      .catch((e) => alert("Camera error: " + e.message));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <video
      ref={ref}
      playsInline
      muted
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        objectFit: "cover",
        transform: "scaleX(-1)",
        opacity: 0.55,
      }}
    />
  );
});

export default WebcamView;