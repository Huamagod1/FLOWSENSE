import time

import cv2


def extraer_frame(video_path, output_path, segundo=5):
    inicio = time.time()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "frame_extraido": False,
            "status": "ERROR",
            "mensaje": f"No se pudo abrir el video: {video_path}",
        }

    cap.set(cv2.CAP_PROP_POS_MSEC, segundo * 1000)
    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        return {
            "frame_extraido": False,
            "status": "ERROR",
            "mensaje": f"No se pudo leer frame en segundo {segundo} (video muy corto o corrupto)",
        }

    alto, ancho = frame.shape[:2]
    cv2.imwrite(output_path, frame)

    return {
        "frame_extraido": True,
        "ruta": output_path,
        "ancho": ancho,
        "alto": alto,
        "duracion_seg": round(time.time() - inicio, 2),
        "status": "OK",
    }
