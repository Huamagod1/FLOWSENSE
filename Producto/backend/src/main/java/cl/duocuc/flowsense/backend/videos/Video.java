package cl.duocuc.flowsense.backend.videos;

import cl.duocuc.flowsense.backend.recintos.Recinto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "videos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Video {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_recinto", nullable = false)
    private Recinto recinto;

    @Column(name = "nombre_original", nullable = false)
    private String nombreOriginal;

    @Column(nullable = false, length = 512)
    private String ruta;

    @Column(name = "ruta_frame_preview", length = 512)
    private String rutaFramePreview;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoVideo estado;

    @Column(name = "mensaje_error", columnDefinition = "TEXT")
    private String mensajeError;

    @Column(name = "conf_usado", precision = 3, scale = 2)
    private BigDecimal confUsado;

    @Column(name = "frames_procesados")
    private Integer framesProcesados;

    @Column(name = "duracion_proceso_seg")
    private Integer duracionProcesoSeg;

    @Column(name = "fecha_subida", nullable = false, updatable = false)
    private LocalDateTime fechaSubida;

    @Column(name = "fecha_completado")
    private LocalDateTime fechaCompletado;

    @PrePersist
    protected void onCreate() {
        fechaSubida = LocalDateTime.now();
        if (estado == null) {
            estado = EstadoVideo.PENDIENTE;
        }
    }

    public enum EstadoVideo {
        PENDIENTE, FRAME_LISTO, ESPERANDO_ZONAS, PROCESANDO, COMPLETADO, ERROR
    }
}
