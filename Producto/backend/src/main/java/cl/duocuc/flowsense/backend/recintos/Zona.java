package cl.duocuc.flowsense.backend.recintos;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "zonas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Zona {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_recinto", nullable = false)
    private Recinto recinto;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal x;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal y;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal ancho;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal alto;

    @Column(name = "color_hex", length = 7)
    private String colorHex;
}
