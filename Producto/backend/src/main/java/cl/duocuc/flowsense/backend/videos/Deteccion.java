package cl.duocuc.flowsense.backend.videos;

import cl.duocuc.flowsense.backend.recintos.Zona;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "detecciones")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deteccion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_zona", nullable = false)
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
