package cl.duoc.flowsense.recintos;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ZONAS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Zona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_recinto", nullable = false)
    private Recinto recinto;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "color_hex", nullable = false, length = 7)
    @Builder.Default
    private String colorHex = "#3498db";

    @Column(name = "x_norm", nullable = false, precision = 6, scale = 4)
    private BigDecimal xNorm;

    @Column(name = "y_norm", nullable = false, precision = 6, scale = 4)
    private BigDecimal yNorm;

    @Column(name = "ancho_norm", nullable = false, precision = 6, scale = 4)
    private BigDecimal anchoNorm;

    @Column(name = "alto_norm", nullable = false, precision = 6, scale = 4)
    private BigDecimal altoNorm;

    @Column(nullable = false)
    @Builder.Default
    private int orden = 0;

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;
}
