package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.EstadoVideo;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ResumenAnalisisResponse {

    private Long idVideo;
    private EstadoVideo estado;
    private Integer framesProcesados;
    private Integer deteccionesTotales;
    private Integer duracionSegundos;
    private LocalDateTime fechaCalculo;
    private List<MetricaResponse> metricas;
    private Integer precioBaseClp;
    private List<PrecioSugeridoZona> preciosSugeridos;
}
