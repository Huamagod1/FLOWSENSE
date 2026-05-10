package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.recintos.Zona;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "METRICAS_TEMPORALES")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricaTemporal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_zona", nullable = false)
    private Zona zona;

    @Column(name = "franja_numero", nullable = false)
    private Integer franjaNumero;

    @Column(name = "segundo_inicio", nullable = false)
    private Integer segundoInicio;

    @Column(name = "segundo_fin", nullable = false)
    private Integer segundoFin;

    @Column(name = "total_detecciones", nullable = false)
    private Integer totalDetecciones;

    @Column(name = "densidad_relativa", precision = 6, scale = 3)
    private BigDecimal densidadRelativa;
}
