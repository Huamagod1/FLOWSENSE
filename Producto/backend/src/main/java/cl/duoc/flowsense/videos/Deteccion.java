package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.recintos.Zona;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "DETECCIONES")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deteccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_zona")
    private Zona zona;

    @Column(name = "frame_numero", nullable = false)
    private Integer frameNumero;

    @Column(name = "x_centro_norm", nullable = false, precision = 6, scale = 4)
    private BigDecimal xCentroNorm;

    @Column(name = "y_centro_norm", nullable = false, precision = 6, scale = 4)
    private BigDecimal yCentroNorm;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal confianza;
}
