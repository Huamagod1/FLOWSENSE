package cl.duoc.flowsense.videos;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "FLUJO_ENTRE_ZONAS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlujoEntreZonas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @Column(name = "zona_origen_id", nullable = false)
    private Long zonaOrigenId;

    @Column(name = "zona_destino_id", nullable = false)
    private Long zonaDestinoId;

    @Column(name = "conteo_tracks", nullable = false)
    private Integer conteoTracks;

    @CreationTimestamp
    @Column(name = "fecha_calculo", nullable = false, updatable = false)
    private LocalDateTime fechaCalculo;
}
