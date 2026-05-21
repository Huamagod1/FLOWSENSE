import cv2


def extraer_frame(video_path, output_path, segundo=5):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "frame_extraido": False,
            "status": "ERROR",
            "mensaje": f"No se pudo abrir el video: {video_path}",
        }

    fps_video = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duracion_video_seg = int(total_frames / fps_video) if fps_video > 0 else 0

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
        "duracion_seg": duracion_video_seg,
        "status": "OK",
    }
