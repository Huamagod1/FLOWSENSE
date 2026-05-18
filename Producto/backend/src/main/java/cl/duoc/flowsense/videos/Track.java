package cl.duoc.flowsense.videos;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "TRACKS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Track {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @Column(name = "track_id", nullable = false)
    private Integer trackId;

    @Column(name = "zona_inicio_id")
    private Long zonaInicioId;

    @Column(name = "zona_fin_id")
    private Long zonaFinId;

    @Column(name = "primer_frame", nullable = false)
    private Integer primerFrame;

    @Column(name = "ultimo_frame", nullable = false)
    private Integer ultimoFrame;

    @Column(name = "frames_total", nullable = false)
    private Integer framesTotal;

    @Column(name = "segundos_total", nullable = false)
    private Double segundosTotal;

    @Column(name = "velocidad_prom")
    private Double velocidadProm;

    @CreationTimestamp
    @Column(name = "fecha_calculo", nullable = false, updatable = false)
    private LocalDateTime fechaCalculo;
}
