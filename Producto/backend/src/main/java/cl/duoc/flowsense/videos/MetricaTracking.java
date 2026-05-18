package cl.duoc.flowsense.videos;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "METRICAS_TRACKING")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricaTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @Column(name = "id_zona", nullable = false)
    private Long idZona;

    @Column(name = "track_id", nullable = false)
    private Integer trackId;

    @Column(name = "segundos", nullable = false)
    private Double segundos;

    @CreationTimestamp
    @Column(name = "fecha_calculo", nullable = false, updatable = false)
    private LocalDateTime fechaCalculo;
}
