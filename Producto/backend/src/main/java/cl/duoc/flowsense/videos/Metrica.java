package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.recintos.Zona;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "METRICAS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Metrica {

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

    @Column(name = "total_detecciones", nullable = false)
    private Integer totalDetecciones;

    @Column(name = "porcentaje_del_total", nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentajeDelTotal;

    @Column(name = "densidad_promedio", nullable = false, precision = 8, scale = 4)
    private BigDecimal densidadPromedio;

    @Column(name = "pico_maximo", nullable = false)
    private Integer picoMaximo;

    @Column(name = "frames_con_actividad", nullable = false)
    private Integer framesConActividad;

    @Column(name = "confianza_promedio", nullable = false, precision = 4, scale = 3)
    private BigDecimal confianzaPromedio;

    @Column(name = "area_zona", nullable = false, precision = 8, scale = 6)
    private BigDecimal areaZona;

    @Column(name = "densidad_por_area", nullable = false, precision = 10, scale = 4)
    private BigDecimal densidadPorArea;

    @Column(name = "indice_valor_relativo", nullable = false, precision = 6, scale = 3)
    private BigDecimal indiceValorRelativo;

    @CreationTimestamp
    @Column(name = "fecha_calculo", nullable = false, updatable = false)
    private LocalDateTime fechaCalculo;
}
