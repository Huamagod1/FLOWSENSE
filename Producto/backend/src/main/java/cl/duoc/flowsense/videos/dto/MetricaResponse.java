package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.Metrica;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class MetricaResponse {

    private Long idZona;
    private String nombreZona;
    private String colorHexZona;
    private Integer totalDetecciones;
    private BigDecimal porcentajeDelTotal;
    private BigDecimal densidadPromedio;
    private Integer picoMaximo;
    private Integer framesConActividad;
    private BigDecimal confianzaPromedio;
    private BigDecimal areaZona;
    private BigDecimal densidadPorArea;
    private BigDecimal indiceValorRelativo;

    public static MetricaResponse from(Metrica m) {
        return MetricaResponse.builder()
                .idZona(m.getZona().getId())
                .nombreZona(m.getZona().getNombre())
                .colorHexZona(m.getZona().getColorHex())
                .totalDetecciones(m.getTotalDetecciones())
                .porcentajeDelTotal(m.getPorcentajeDelTotal())
                .densidadPromedio(m.getDensidadPromedio())
                .picoMaximo(m.getPicoMaximo())
                .framesConActividad(m.getFramesConActividad())
                .confianzaPromedio(m.getConfianzaPromedio())
                .areaZona(m.getAreaZona())
                .densidadPorArea(m.getDensidadPorArea())
                .indiceValorRelativo(m.getIndiceValorRelativo())
                .build();
    }
}
