package cl.duocuc.flowsense.backend.videos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MetricaResponse {
    private Long id;
    private Long zonaId;
    private String nombreZona;
    private Integer totalDetecciones;
    private BigDecimal porcentajeDelTotal;
    private BigDecimal densidadPromedio;
    private Integer picoMaximo;
    private Integer framesConActividad;
    private BigDecimal confianzaPromedio;
    private BigDecimal areaZona;
    private BigDecimal densidadPorArea;
    private BigDecimal indiceValorRelativo;
}
