package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.recintos.Recinto;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
