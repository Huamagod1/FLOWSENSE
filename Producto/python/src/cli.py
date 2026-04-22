import argparse


def parsear_args():
    p = argparse.ArgumentParser(description="FlowSense — detector de flujo peatonal")
    p.add_argument("--video",  required=True, help="Ruta al MP4 de entrada")
    p.add_argument("--output", required=True, help="Ruta del CSV a generar")
    p.add_argument("--zonas",  required=True, help="Ruta JSON con zonas del recinto")
    p.add_argument("--fps",    type=float, default=1.0,  help="Frames/s a muestrear (default: 1)")
    p.add_argument("--conf",   type=float, default=0.45, help="Umbral de confianza (default: 0.45)")
    p.add_argument("--iou",    type=float, default=0.7,  help="Umbral IoU para NMS (default: 0.7)")
    p.add_argument("--imgsz",  type=int,   default=640,  help="Tamaño de entrada del modelo (default: 640)")
    p.add_argument("--modelo",   default="yolov8n",
                   choices=["yolov8n", "yolov8s", "yolov8m"],
                   help="Modelo YOLOv8 a usar (default: yolov8n)")
    p.add_argument("--max-det",  type=int, default=300,
                   help="Máximo de detecciones por frame (default: 300, igual al default de ultralytics 8.3)")
    p.add_argument("--stub",    action="store_true", help="Usar detecciones ficticias sin cargar YOLO")
    p.add_argument("--preview", action="store_true", help="Mostrar ventana de visualización en vivo (solo desarrollo)")
    return p.parse_args()
