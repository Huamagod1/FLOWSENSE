package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.MetricaTemporal;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class MetricaTemporalResponse {

    private Long idZona;
    private String nombreZona;
    private Integer franjaNumero;
    private Integer segundoInicio;
    private Integer segundoFin;
    private Integer totalDetecciones;
    private BigDecimal densidadRelativa;

    public static MetricaTemporalResponse from(MetricaTemporal mt) {
        return MetricaTemporalResponse.builder()
                .idZona(mt.getZona().getId())
                .nombreZona(mt.getZona().getNombre())
                .franjaNumero(mt.getFranjaNumero())
                .segundoInicio(mt.getSegundoInicio())
                .segundoFin(mt.getSegundoFin())
                .totalDetecciones(mt.getTotalDetecciones())
                .densidadRelativa(mt.getDensidadRelativa())
                .build();
    }
}
