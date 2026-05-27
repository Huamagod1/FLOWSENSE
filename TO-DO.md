# FlowSense — TO-DO

Estado al 2026-05-27. Tareas completadas eliminadas de la lista.

---

## En curso — Sprint 5 (cierre académico)

- [ ] Grabación de video controlado (experimento con guión y ground truth conocido)
- [ ] Grabación de video real (galería, café o pasillo, 3–15 minutos)
- [ ] Procesamiento de ambos videos con el sistema y comparación manual
- [ ] Documento técnico de validación empírica (Word, 5–7 páginas)
- [ ] Exportación de reporte PDF desde el dashboard
- [ ] Documentación final del proyecto
- [ ] Preparación de la presentación académica

---

## Pendientes técnicos menores

- [ ] Exportación PDF del dashboard (jsPDF + html2canvas) — HU-06
- [ ] Tests unitarios backend: AuthService, CalculadoraMetricasService
- [ ] Tests Python: test_metricas_tracking.py (parcialmente cubierto)
- [ ] Validar comportamiento del overlay en Safari/iOS (codec H.264 avc1)

---

## Conocidos / No bloqueantes

- El modo `--preview` no está disponible en Docker (headless). Funciona solo localmente.
- El video overlay puede tardar varios minutos para videos > 10 minutos.
- Las trayectorias en el canvas muestran arcos zona→zona (no coordenadas frame a frame, el backend no persiste posiciones individuales por frame).
