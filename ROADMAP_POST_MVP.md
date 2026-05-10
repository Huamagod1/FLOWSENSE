# FlowSense — Roadmap Post-MVP

Este documento lista funcionalidades **planificadas pero fuera del alcance del MVP académico**. Documentadas para mostrar visión de producto completo y dar contexto al jurado.

## Funcionalidades de autenticación avanzada

### Recuperación de contraseña por email
Flujo completo de "olvidé mi contraseña" con tokens de un solo uso enviados por Spring Mail. Requiere infraestructura de envío de emails.

### Edición de perfil y cambio de contraseña
Vistas para que el usuario actualice sus datos personales y cambie su contraseña estando logueado.

### Multi-organización con invitaciones
Permitir que un admin invite a otros admins a su organización para compartir gestión de recintos. Incluye flujo de aceptación de invitación con token por email.

### Roles diferenciados
Posibilidad de tener admins con permisos limitados (solo lectura, solo análisis específicos).

## Funcionalidades de análisis avanzado

### Comparativa entre análisis del mismo recinto
Vista lado a lado de dos análisis distintos del mismo recinto para evaluar cambios temporales (antes/después de remodelación, día de semana vs fin de semana).

### Alertas automáticas
Notificaciones al admin cuando una zona tiene actividad fuera del rango esperado (zona fría persistente, pico inusual, etc.).

### Detección de eventos atípicos
Identificar momentos del video donde el patrón rompe la normalidad (aglomeración inesperada, vacío total).

### Análisis demográfico
Estimación de edad y género por zona usando modelos complementarios. Requiere cuidadosa evaluación legal.

## Funcionalidades técnicas avanzadas

### Tracking individual entre frames
Implementación de DeepSORT o ByteTrack para seguir personas individuales. Permite calcular dwell time exacto.

### Procesamiento en tiempo real
Análisis de cámaras IP en streaming en lugar de videos pregrabados.

### Modelos personalizados
Entrenamiento de modelos específicos por recinto (mejora precisión en escenarios particulares).

### Múltiples cámaras del mismo recinto
Combinar análisis de varios ángulos para cobertura completa.

## Funcionalidades de negocio

### Integración con sistemas POS
Cruzar tráfico con datos de venta para calcular conversion rate real por local.

### Capture rate por local
Cámaras enfocadas en entradas de locales específicos para medir cuántas personas entran efectivamente.

### Benchmarking entre recintos
Comparar métricas de un recinto contra promedios de la industria o de recintos similares.

### Predicción de demanda
Modelo predictivo que estime tráfico futuro basado en histórico.

### Recomendaciones automáticas
"La zona X está subutilizada, considera reducir precio 15%" o "El patio de comidas requiere refuerzo de personal entre 12-14h".

## Mejoras de UX

### Onboarding guiado
Tour para admins nuevos explicando el flujo paso a paso.

### Plantillas de zonas
Diseños predefinidos para tipos comunes de recintos (mall, galería, feria) que el admin puede ajustar.

### Tutorial de grabación de video
Guía con buenas prácticas para que el admin grabe videos óptimos.

### Modo simulación
Sin video real, generar datos sintéticos para que el admin explore funcionalidades.

## Mejoras de infraestructura

### Cache distribuido
Redis para mejorar rendimiento de consultas frecuentes.

### Cola de procesamiento
RabbitMQ o similar para manejar múltiples videos simultáneos sin saturar el servidor.

### Almacenamiento en cloud
S3 o equivalente para videos grandes y frames extraídos.

### CI/CD completo
Tests automáticos en cada PR, deploy automático a staging.

## Funcionalidades de equipo

### Multi-tenant real
Soporte para múltiples organizaciones con aislamiento total de datos.

### Roles granulares por organización
Admin, analista, viewer con permisos específicos.

### Auditoría de acciones
Log de todas las acciones del usuario para compliance.

### Facturación SaaS
Sistema de planes (gratuito, pro, enterprise) con límites de uso.

## Notas finales

Este roadmap es **referencial**, no un compromiso. Cada funcionalidad post-MVP requiere validación de necesidad real con usuarios antes de priorizarse. La filosofía del proyecto es: **MVP funcional > Sistema complejo incompleto**.

Las funcionalidades aquí listadas deben evaluarse caso a caso según:
- Demanda real de usuarios
- Complejidad técnica
- Viabilidad legal (especialmente lo demográfico/biométrico)
- Disponibilidad de recursos del equipo
