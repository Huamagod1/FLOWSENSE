from pathlib import Path

from ultralytics import YOLO

from src.tracker import ByteTracker

_MODELOS_DIR = Path(__file__).parent.parent / "modelos"


class Detector:
    def __init__(self, conf, iou, imgsz, modelo="yolov8n", tracker="bytetrack"):
        self.conf = conf
        self.iou = iou
        self.imgsz = imgsz
        modelo_path = _MODELOS_DIR / f"{modelo}.pt"
        self.model = YOLO(str(modelo_path))
        self._tracker = ByteTracker(self.model, conf, iou, imgsz) if tracker != "none" else None

    def detectar_frame(self, frame, max_det=300):
        if self._tracker is not None:
            return [
                {
                    "track_id": d.track_id,
                    "x_centro_norm": d.x_centro_norm,
                    "y_centro_norm": d.y_centro_norm,
                    "ancho_norm": d.ancho_norm,
                    "alto_norm": d.alto_norm,
                    "confianza": d.confianza,
                }
                for d in self._tracker.track(frame, max_det)
            ]

        # tracker="none": fallback a predict sin track_id
        results = self.model.predict(
            frame,
            classes=[0],
            conf=self.conf,
            iou=self.iou,
            imgsz=self.imgsz,
            max_det=max_det,
            verbose=False,
        )
        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return []

        xywhn = boxes.xywhn.cpu().numpy()
        confs = boxes.conf.cpu().numpy()

        return [
            {
                "track_id": -1,
                "x_centro_norm": float(x_c),
                "y_centro_norm": float(y_c),
                "ancho_norm": float(w),
                "alto_norm": float(h),
                "confianza": float(conf),
            }
            for (x_c, y_c, w, h), conf in zip(xywhn, confs)
        ]
