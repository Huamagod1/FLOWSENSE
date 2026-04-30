package cl.duocuc.flowsense.backend.videos;

import cl.duocuc.flowsense.backend.recintos.Zona;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "metricas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Metrica {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_video", nullable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_zona", nullable = false)
    private Zona zona;

    @Column(name = "total_detecciones", nullable = false)
    private Integer totalDetecciones;

    @Column(name = "porcentaje_del_total", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeDelTotal;

    @Column(name = "densidad_promedio", nullable = false, precision = 6, scale = 3)
    private BigDecimal densidadPromedio;

    @Column(name = "pico_maximo", nullable = false)
    private Integer picoMaximo;

    @Column(name = "frames_con_actividad", nullable = false)
    private Integer framesConActividad;

    @Column(name = "confianza_promedio", nullable = false, precision = 4, scale = 3)
    private BigDecimal confianzaPromedio;

    @Column(name = "area_zona", precision = 8, scale = 6)
    private BigDecimal areaZona;

    @Column(name = "densidad_por_area", precision = 8, scale = 3)
    private BigDecimal densidadPorArea;

    @Column(name = "indice_valor_relativo", precision = 5, scale = 2)
    private BigDecimal indiceValorRelativo;

    @Column(name = "calculado_at", nullable = false)
    private LocalDateTime calculadoAt;

    @PrePersist
    protected void onCreate() {
        calculadoAt = LocalDateTime.now();
    }
}
