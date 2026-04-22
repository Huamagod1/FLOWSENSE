from pathlib import Path

from ultralytics import YOLO

_MODELO_PATH = Path(__file__).parent.parent / "modelos" / "yolov8n.pt"


class Detector:
    def __init__(self, conf, iou, imgsz):
        self.conf = conf
        self.iou = iou
        self.imgsz = imgsz
        self.model = YOLO(str(_MODELO_PATH))

    def detectar_frame(self, frame):
        results = self.model.predict(
            frame,
            classes=[0],
            conf=self.conf,
            iou=self.iou,
            imgsz=self.imgsz,
            verbose=False,
        )
        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return []

        xywhn = boxes.xywhn.cpu().numpy()
        confs = boxes.conf.cpu().numpy()

        return [
            {
                "x_centro_norm": float(x_c),
                "y_centro_norm": float(y_c),
                "ancho_norm": float(w),
                "alto_norm": float(h),
                "confianza": float(conf),
            }
            for (x_c, y_c, w, h), conf in zip(xywhn, confs)
        ]
