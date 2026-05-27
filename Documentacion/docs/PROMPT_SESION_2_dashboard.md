# FlowSense — Sesión 2: Mejoras visuales del dashboard

## CONTEXTO

Continuamos en la rama feature/dashboard-redesign. Las 5 tabs ya están
implementadas y funcionando. La tab de Validación ya tiene cajas
interpoladas, panel narrativo y tooltips de confiabilidad.

Esta sesión arregla 4 problemas visuales reportados por el usuario tras
probar el dashboard en navegador.

Antes de empezar, lee:
- Producto/frontend/src/components/VideoValidacion.jsx
- Producto/frontend/src/components/TrayectoriasCanvas.jsx
- Producto/frontend/src/components/FlujoSankeyChart.jsx
- Producto/frontend/src/components/MetricasTrackingPanel.jsx
- Si existe algún componente de heatmap en src/components/

---

## PROBLEMA 1 — Auto-scroll molesto en panel de eventos

### Síntoma
En la tab Validación, mientras se reproduce el video, la tabla de eventos
hace scrollIntoView() automático en cada cambio de frame. Esto empuja la
página hacia abajo constantemente y el usuario no puede ver el video
fluidamente.

### Solución
Eliminar el auto-scroll automático. Mantener el highlight visual de la
fila actual (fondo amarillo) pero NO hacer scroll del navegador.

En VideoValidacion.jsx:
- Eliminar el useEffect que llama a scrollIntoView() cuando cambia currentTime
- Mantener el cálculo de qué eventos pertenecen al frame actual
- Mantener el rowClassName que marca el fondo amarillo
- Solo si el usuario quiere ver eventos, puede hacer scroll manual

ADEMÁS, hacer el scroll de la tabla **interna a su contenedor**, no del
viewport completo:
- La tabla de eventos debe estar dentro de un div con max-height
  (por ejemplo 400px) y overflow-y: auto
- Así el usuario ve la tabla sin que ocupe toda la página
- Si después decidimos volver a habilitar scroll automático, sería SOLO
  dentro del contenedor de la tabla, NO del documento completo

---

## PROBLEMA 2 — Heatmap con escala incorrecta

### Síntoma
El heatmap muestra todas las zonas con intensidad de color similar,
aunque visualmente unas tengan claramente más tráfico que otras. No es
informativo.

### Solución
Recalcular la escala del heatmap basándose en el rango real de valores
de cada análisis.

Pasos:
1. Identifica el componente actual del heatmap (probablemente está
   dentro de AnalisisDetallado.jsx o un componente Heatmap separado)
2. Verifica qué dato se está usando para calcular intensidad. Si está
   usando detecciones_totales por zona, mejor cambiarlo a personas_unicas
   por zona (más fiel al tráfico real ahora que tenemos tracking)
3. Calcula el rango: min = menor valor de personas_unicas entre las zonas,
   max = mayor valor
4. Normaliza cada zona en el rango [0, 1] usando (valor - min) / (max - min)
5. Mapea ese valor normalizado a colores usando una escala de calor real:
   - 0.0–0.2: azul claro (#3b82f6 con opacity 0.3)
   - 0.2–0.4: cian (#06b6d4 con opacity 0.5)
   - 0.4–0.6: amarillo (#facc15 con opacity 0.7)
   - 0.6–0.8: naranja (#f97316 con opacity 0.8)
   - 0.8–1.0: rojo (#dc2626 con opacity 0.9)

6. ADICIONALMENTE, el tamaño del overlay del heatmap (radio del círculo
   o intensidad del relleno) también debe ser proporcional al valor
   normalizado. Las zonas con más tráfico se ven más "calientes" tanto
   en color como en tamaño visual.

7. Si el heatmap actualmente usa círculos en posiciones específicas,
   considerar que el radio sea: radio_base * (0.5 + valor_normalizado).
   Así la zona con menos tráfico tiene radio del 50% del base, y la de
   más tráfico tiene radio completo.

8. Mostrar una leyenda al lado del heatmap con la escala de colores:
   "Bajo tráfico → Alto tráfico" con los colores correspondientes.

---

## PROBLEMA 3 — Frame de fondo muy visible en visualizaciones

### Síntoma
En componentes como TrayectoriasCanvas y heatmap, el frame del video
de fondo se ve con 100% de opacidad. Eso compite visualmente con las
overlays (trayectorias, cajas, heatmap) que se dibujan encima.

### Solución
Reducir la opacidad del frame de fondo a 50-60% para que las
visualizaciones encima resalten.

En TrayectoriasCanvas.jsx y en cualquier otro componente que use frame
de fondo:
- Si el frame se dibuja como <img> de fondo: aplicar opacity: 0.55
- Si se dibuja en canvas con ctx.drawImage: aplicar
  ctx.globalAlpha = 0.55 antes de dibujar la imagen, luego
  ctx.globalAlpha = 1.0 antes de dibujar las visualizaciones
- Después de dibujar el frame, dibujar un overlay blanco con opacity 0.2
  para "aclarar" el fondo si es muy oscuro

El objetivo: el frame se ve pero pasa a segundo plano. Lo que destaca
son las trayectorias, cajas, zonas y heatmap superpuestos.

---

## PROBLEMA 4 — Tab Flujo y Trayectorias no muestra las trayectorias

### Síntoma
En la tab "Flujo y trayectorias" solo se aprecia el frame del video pero
las líneas de trayectorias no aparecen. Verificar si es bug del
componente o por falta de data del video específico.

### Solución
Debug guiado:

1. Verificar primero en consola del navegador qué data está recibiendo
   TrayectoriasCanvas:
   - ¿La prop `tracks` o `trayectorias` está llegando con datos?
   - ¿Tiene la estructura esperada?
   - Agregar un console.log temporal al inicio del componente para
     diagnosticar

2. Si la data llega correctamente pero no se dibuja:
   - Revisar el código de canvas: ¿el ctx.stroke() se llama después de
     definir el path?
   - Revisar si las coordenadas normalizadas se multiplican correctamente
     por width y height del canvas
   - Revisar si el color de las líneas no es transparente o del mismo
     color que el fondo

3. Si la data NO llega:
   - Verificar la llamada al endpoint /api/videos/:id/tracks o similar
   - Verificar que el endpoint devuelve datos
   - Verificar que el componente padre pasa la prop correctamente

4. Manejar el caso de pocas detecciones:
   - Si hay menos de 2 puntos para un track, no se puede dibujar línea
     (necesita al menos 2 puntos)
   - En ese caso, dibujar un círculo en el único punto detectado
   - Mostrar mensaje sutil: "Datos limitados de tracking — se muestran
     las posiciones detectadas"

5. Si el video tiene 0 tracks completos (todos con 1 detección):
   - Mostrar mensaje claro: "Este análisis no tiene trayectorias
     suficientes para visualizar. Las trayectorias requieren al menos
     2 puntos de detección por persona."
   - Sugerir aumentar fps del análisis para mejor tracking

REMOVER cualquier console.log después de diagnosticar y corregir.

---

## VERIFICACIÓN

Después de aplicar los 4 cambios:

1. Recargar el navegador con Ctrl+Shift+R
2. Abrir el análisis ID 9 (o el más reciente)
3. Tab Validación:
   - El video se reproduce sin que la página haga scroll automático
   - Las filas de eventos se highlightean pero el viewport no se mueve
   - La tabla tiene scroll interno cuando hay muchos eventos
4. Tab Análisis detallado (heatmap):
   - Las zonas con más tráfico se ven claramente más calientes
   - Hay leyenda visible con escala de colores
   - El frame de fondo está atenuado
5. Tab Flujo y trayectorias:
   - Las trayectorias aparecen sobre el frame
   - O si no hay data suficiente, aparece mensaje claro explicando por qué
   - El frame está atenuado

Si algo no funciona como esperado, diagnosticar antes de modificar más
código. NO hacer cambios "por si acaso".

---

## ARCHIVOS A MODIFICAR

Probablemente:
- Producto/frontend/src/components/VideoValidacion.jsx
- Producto/frontend/src/components/TrayectoriasCanvas.jsx
- Componente de heatmap (identificar primero dónde está)
- Componente de AnalisisDetallado.jsx si es donde vive el heatmap

NO modificar:
- Backend Spring Boot
- Migraciones SQL
- Python (excepto si se requiere algo de los endpoints)

---

## ORDEN DE COMMITS

- fix(frontend): eliminar auto-scroll molesto en tab Validación
- fix(frontend): heatmap con escala proporcional al tráfico real
- fix(frontend): atenuar frame de fondo en visualizaciones
- fix(frontend): debug y arreglo de trayectorias en tab Flujo

Al terminar, hacer push a feature/dashboard-redesign.
