from dataclasses import dataclass
from typing import List


@dataclass
class Deteccion:
    track_id: int
    x_centro_norm: float
    y_centro_norm: float
    ancho_norm: float
    alto_norm: float
    confianza: float


class ByteTracker:
    """Wrapper de ByteTrack sobre un modelo YOLO ya cargado."""

    def __init__(self, model, conf: float, iou: float, imgsz: int):
        self._model = model
        self._conf = conf
        self._iou = iou
        self._imgsz = imgsz

    def track(self, frame, max_det: int = 300) -> List[Deteccion]:
        results = self._model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            classes=[0],
            conf=self._conf,
            iou=self._iou,
            imgsz=self._imgsz,
            max_det=max_det,
            verbose=False,
        )
        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0 or boxes.id is None:
            return []

        xywhn = boxes.xywhn.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        ids = boxes.id.cpu().numpy().astype(int)

        return [
            Deteccion(
                track_id=int(tid),
                x_centro_norm=float(x_c),
                y_centro_norm=float(y_c),
                ancho_norm=float(w),
                alto_norm=float(h),
                confianza=float(cf),
            )
            for (x_c, y_c, w, h), cf, tid in zip(xywhn, confs, ids)
        ]
