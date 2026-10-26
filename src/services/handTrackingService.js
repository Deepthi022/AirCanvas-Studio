import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let landmarker = null;

export async function initHandTracker() {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks("/wasm");
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "/models/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
  return landmarker;
}

export function detect(video, timestamp) {
  return landmarker.detectForVideo(video, timestamp);
}