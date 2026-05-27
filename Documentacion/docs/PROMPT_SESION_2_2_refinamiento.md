# FlowSense — Sesión 2.2: Refinamiento final de visualizaciones

## CONTEXTO

Estamos en la rama feature/dashboard-redesign. El bug del naming
mismatch entre backend y frontend ya se arregló — las zonas ahora
llegan con coordenadas válidas (xNorm, yNorm).

Quedan 4 problemas visuales por refinar antes de cerrar esta fase
y pasar a validación con video real.

Antes de empezar, lee:
- Producto/frontend/src/components/AnalisisDetallado.jsx
- Producto/frontend/src/components/TrayectoriasCanvas.jsx
- Producto/frontend/src/pages/ResultadosPage.jsx
- Producto/frontend/src/api/tracking.js

---

## PROBLEMA 1 — Heatmap: zona con valor mínimo es invisible

### Síntoma
En análisis ID 15, hay 2 zonas:
- Zona 1 (izquierda): 17 personas únicas
- Zona 2 (derecha): 23 personas únicas

El heatmap dibuja UN solo círculo rojo en la zona derecha. La zona
izquierda no muestra nada visible, aunque sí debería verse como
"zona fría" (azul claro).

### Causa
El cálculo de valor normalizado da:
- Zona izquierda: (17-17)/6 = 0 → color con alpha 0 o muy bajo
- Zona derecha: (23-17)/6 = 1 → color con alpha 100% (visible)

Cuando el valor normalizado es 0, el gradiente radial probablemente
tiene alpha = 0 en el color inicial, lo que hace que el círculo sea
completamente transparente.

### Solución
Asegurar que TODAS las zonas se vean, incluso la de menor tráfico:

1. En el cálculo del color del heatmap, garantizar un alpha mínimo
   de 0.3 incluso para valor normalizado = 0:
   
   ```javascript
   const alphaMin = 0.3;
   const alphaMax = 0.85;
   const alpha = alphaMin + (alphaMax - alphaMin) * valorNormalizado;
   ```

2. La zona con valor 0 debe verse como un círculo azul claro tenue
   (no invisible), indicando "zona fría". Color sugerido para valor
   normalizado = 0: rgba(59, 130, 246, 0.3) — azul claro

3. Verificar que el gradiente radial use:
   - Centro: color con alpha calculado (mínimo 0.3)
   - Borde: color con alpha 0 (transparente para fade-out suave)
   - Esto crea círculos con bordes suaves

---

## PROBLEMA 2 — Heatmap: círculo no centrado en la zona

### Síntoma
El círculo rojo del heatmap está dibujado FUERA del rectángulo de
su zona. Debería estar centrado dentro del área que cubre cada zona.

### Causa
El cálculo de centro de zona probablemente está mal. Si el código
calcula:
- centroX = xNorm * canvasWidth

Eso pone el centro en el BORDE IZQUIERDO de la zona, no en el centro.
Lo correcto es:
- centroX = (xNorm + anchoNorm / 2) * canvasWidth
- centroY = (yNorm + altoNorm / 2) * canvasHeight

### Solución
Revisar en AnalisisDetallado.jsx el cálculo de cx y cy para el
heatmap. Cambiar a:

```javascript
const cx = (zona.xNorm + zona.anchoNorm / 2) * canvasWidth;
const cy = (zona.yNorm + zona.altoNorm / 2) * canvasHeight;
```

El radio del círculo debe ser proporcional al tamaño de la zona
para que el heatmap "cubra" visualmente cada zona:

```javascript
const radioBase = Math.min(zona.anchoNorm, zona.altoNorm) * 0.4;
const radiusPx = radioBase * Math.min(canvasWidth, canvasHeight);
const radio = radiusPx * (0.6 + valorNormalizado * 0.4);
```

Esto hace que:
- El radio dependa del tamaño de la zona (no un valor fijo)
- Zonas más grandes tengan círculos proporcionalmente más grandes
- El valor normalizado solo modula el tamaño entre 60% y 100% del base

---

## PROBLEMA 3 — Tab Flujo y Trayectorias: zonas dibujadas pero sin trayectorias

### Síntoma
La tab muestra:
- Frame del video atenuado ✓
- Dos rectángulos de zonas con burbujas centrales (17 y 23) ✓
- PERO no aparecen líneas de trayectorias ni flechas entre zonas

El análisis ID 15 tiene 40 personas únicas con tracking estable,
así que SÍ debe haber datos de trayectorias.

### Diagnóstico requerido (en este orden)

1. Verificar qué endpoint provee las trayectorias:
   - ¿Existe GET /api/videos/:id/tracks ?
   - ¿Existe GET /api/videos/:id/flujo-zonas ?
   - ¿Cómo se llaman las funciones en tracking.js?

2. Agregar console.log temporal al inicio de TrayectoriasCanvas:
   ```javascript
   console.log('[Trayectorias] tracks recibidos:', tracks);
   console.log('[Trayectorias] flujoZonas recibido:', flujoZonas);
   console.log('[Trayectorias] zonas recibidas:', zonas);
   console.log('[Trayectorias] dimensiones canvas:', 
     canvasRef.current?.width, 'x', canvasRef.current?.height);
   ```

3. Verificar en consola del navegador:
   - ¿Los tracks llegan o están vacíos?
   - ¿Tienen estructura esperada (array de puntos por track_id)?
   - ¿El canvas tiene dimensiones > 0?

### Solución según el caso

**Caso A — Los tracks NO llegan (array vacío):**
El componente padre (ResultadosPage o similar) no está pasándolos.
Revisar:
- ¿Se llama al endpoint correcto en useEffect del padre?
- ¿La respuesta del endpoint se asigna correctamente a un state?
- ¿Ese state se pasa como prop al componente TrayectoriasCanvas?

**Caso B — Los tracks SÍ llegan pero no se dibujan:**
Revisar el código de canvas que dibuja las líneas:
- ¿El forEach itera sobre los tracks correctamente?
- ¿Las coordenadas se calculan con (xNorm + anchoNorm/2) o similar?
- ¿ctx.stroke() se llama después de cada path?
- ¿Hay algún `if !isFinite return` que esté saltando todos los tracks?

**Caso C — Tracks con muy pocos puntos:**
Si un track tiene solo 1 punto, no se puede dibujar una línea
(necesita al menos 2 puntos). En este caso:
- Dibujar un círculo pequeño en el único punto
- Los tracks con 2+ puntos sí dibujan línea

### Verificación
Después del arreglo, deberían aparecer:
- Líneas con colores únicos por persona conectando sus posiciones
- Flechas indicando dirección de flujo entre zonas
- Las burbujas con conteo siguen apareciendo (no romperlas)

REMOVER los console.log al final.

---

## PROBLEMA 4 — Banner desactualizado en la cabecera

### Síntoma
En todas las tabs aparece arriba el banner azul:

> "Este reporte mide exposición comercial por zona usando la métrica
> OTS (Opportunity To See). Cada detección equivale a 1 segundo de
> presencia humana. Una zona con más detecciones tiene mayor valor
> comercial."

Esta información YA NO ES CORRECTA:
- El sistema ahora usa tracking ByteTrack, no solo OTS
- Las métricas principales son personas únicas y permanencia
- Una detección NO equivale a 1 segundo (eso era con el viejo sample
  rate de 1 fps; ahora es 10 fps)

### Solución
Reemplazar el texto del banner en ResultadosPage.jsx por uno
actualizado que refleje las métricas reales del sistema:

```jsx
<Alert
  type="info"
  showIcon
  closable
  message="Análisis de tráfico peatonal"
  description="Este reporte mide el comportamiento real de personas
  usando tracking individual (ByteTrack). Las métricas principales 
  son personas únicas (sin doble conteo), permanencia promedio por 
  zona y flujo entre zonas. Estos datos respaldan la recomendación 
  de precios por zona."
/>
```

Mantener el estilo visual (color azul, icono, botón de cerrar).

---

## VERIFICACIÓN FINAL

Después de aplicar los 4 fixes:

1. Recargar el navegador con Ctrl+Shift+R
2. Abrir el análisis ID 15
3. Verificar:

**Tab Análisis Detallado:**
- Ambas zonas tienen círculos de calor visibles
- La zona con menos tráfico (17) está en azul/cian
- La zona con más tráfico (23) está en naranja/rojo
- Los círculos están centrados DENTRO de los rectángulos de zonas
- Los círculos tienen tamaño proporcional a sus zonas

**Tab Flujo y Trayectorias:**
- Las zonas con rectángulos coloreados ✓ (ya funciona)
- Las burbujas con conteo de personas ✓ (ya funciona)
- LÍNEAS de trayectorias conectando puntos de movimiento ← NUEVO
- FLECHAS indicando dirección de flujo entre zonas ← NUEVO

**Banner superior:**
- Texto nuevo enfocado en tracking, no en OTS
- Sigue visible en todas las tabs

---

## ARCHIVOS A MODIFICAR

- Producto/frontend/src/components/AnalisisDetallado.jsx (problemas 1 y 2)
- Producto/frontend/src/components/TrayectoriasCanvas.jsx (problema 3)
- Producto/frontend/src/pages/ResultadosPage.jsx (problema 4)
- Probablemente Producto/frontend/src/api/tracking.js si hay
  llamadas de endpoint mal hechas

NO MODIFICAR:
- Backend Spring Boot
- Python detector
- Base de datos
- Otras tabs

---

## ORDEN DE COMMITS

- fix(frontend): heatmap visible para zonas con valor mínimo
- fix(frontend): centrar heatmap dentro del rectángulo de cada zona
- fix(frontend): trayectorias en tab Flujo (diagnóstico + arreglo)
- fix(frontend): actualizar banner principal con métricas de tracking

Al terminar, push a feature/dashboard-redesign.

---

## NOTA IMPORTANTE

Si durante el diagnóstico del Problema 3 descubres que los
endpoints de tracks o flujo-zonas no existen aún en el backend,
o devuelven respuestas vacías por una razón estructural, NO los
implementes en esta sesión. En su lugar:

1. Documenta qué endpoint falta
2. En el componente, muestra mensaje claro: "Sin datos de
   trayectorias disponibles para este análisis"
3. Reporta al final qué quedó pendiente para backend

Esto evita extender la sesión innecesariamente. Backend lo
podemos atacar después si es necesario.
