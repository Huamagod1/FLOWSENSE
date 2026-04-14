# Importación de la biblioteca math para cálculos de distancia
import math

# Clase Tracker para seguimiento de objetos basado en centro de masa
class Tracker:
    def __init__(self):
        # Diccionario para almacenar los puntos centrales de los objetos rastreados
        self.center_points = {}
        # Contador para asignar IDs únicos a nuevos objetos
        self.id_count = 0

    def update(self, objects_rect):
        # Lista para almacenar bounding boxes con IDs asignados
        objects_bbs_ids = []

        # Procesar cada rectángulo detectado
        for rect in objects_rect:
            x, y, w, h = rect
            # Calcular el centro del rectángulo (punto central)
            cx, cy = (x + x + w) // 2, (y + y + h) // 2

            # Bandera para verificar si el objeto ya está siendo rastreado
            same_object_detected = False
            # Verificar distancia con objetos existentes
            for id, pt in self.center_points.items():
                # Calcular distancia euclidiana entre centros
                if math.hypot(cx - pt[0], cy - pt[1]) < 35:  # Umbral de distancia
                    # Actualizar posición del objeto existente
                    self.center_points[id] = (cx, cy)
                    objects_bbs_ids.append([x, y, w, h, id])
                    same_object_detected = True
                    break

            # Si es un objeto nuevo, asignar ID y agregar
            if not same_object_detected:
                self.center_points[self.id_count] = (cx, cy)
                objects_bbs_ids.append([x, y, w, h, self.id_count])
                self.id_count += 1

        # Limpiar objetos que ya no están presentes (solo mantener los actuales)
        self.center_points = {obj_bb_id[4]: self.center_points[obj_bb_id[4]] for obj_bb_id in objects_bbs_ids}
        # Retornar lista de bounding boxes con IDs
        return objects_bbs_ids