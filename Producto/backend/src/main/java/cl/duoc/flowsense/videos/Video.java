package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.recintos.Recinto;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "VIDEOS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_recinto", nullable = false)
    private Recinto recinto;

    @Column(name = "nombre_archivo", nullable = false, length = 500)
    private String nombreArchivo;

    @Column(name = "ruta_archivo", nullable = false, length = 1000)
    private String rutaArchivo;

    @Column(name = "ruta_frame_preview", length = 1000)
    private String rutaFramePreview;

    @Column(name = "tamano_bytes", nullable = false)
    private Long tamanoBytes;

    @Column(name = "duracion_segundos")
    private Integer duracionSegundos;

    @Column(name = "ancho_frame")
    private Integer anchoFrame;

    @Column(name = "alto_frame")
    private Integer altoFrame;

    @Column(name = "frames_procesados")
    private Integer framesProcesados;

    @Column(name = "detecciones_totales")
    private Integer deteccionesTotales;

    @Column(name = "conf_usado", precision = 4, scale = 3)
    private BigDecimal confUsado;

    @Column(name = "modelo_usado", length = 20)
    private String modeloUsado;

    @Column(name = "fps_procesamiento")
    private Integer fpsProcesamiento;

    @Column(name = "confianza_promedio")
    private Double confianzaPromedio;

    @Column(name = "calidad_tracking")
    private Double calidadTracking;

    @Column(name = "score_confiabilidad")
    private Double scoreConfiabilidad;

    @Column(name = "nivel_confiabilidad", length = 10)
    private String nivelConfiabilidad;

    @Column(name = "video_overlay_path", length = 500)
    private String videoOverlayPath;

    @Column(name = "eventos_json_path", length = 500)
    private String eventosJsonPath;

    @Builder.Default
    @Column(name = "video_original_disponible", nullable = false)
    private Boolean videoOriginalDisponible = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EstadoVideo estado = EstadoVideo.PENDIENTE;

    @Column(name = "mensaje_error", columnDefinition = "TEXT")
    private String mensajeError;

    @CreationTimestamp
    @Column(name = "fecha_subida", nullable = false, updatable = false)
    private LocalDateTime fechaSubida;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;
}
