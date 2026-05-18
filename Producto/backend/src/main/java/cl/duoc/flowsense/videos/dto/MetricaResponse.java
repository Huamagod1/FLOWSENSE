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
    private BigDecimal tasaDetencion;
    private BigDecimal scoreCompuesto;

    // ── Campos de tracking (null si el video se procesó sin tracker) ──────────
    private Integer personasUnicas;
    private Double tiempoPermanenciaProm;
    private Integer entradas;
    private Integer salidas;
    private Double otsTracking;
    private Double velocidadFlujoProm;
    private Double tasaConversion;
    private Double scoreCompuestoV2;

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
                .tasaDetencion(m.getTasaDetencion())
                .scoreCompuesto(m.getScoreCompuesto())
                .personasUnicas(m.getPersonasUnicas())
                .tiempoPermanenciaProm(m.getTiempoPermanenciaProm())
                .entradas(m.getEntradas())
                .salidas(m.getSalidas())
                .otsTracking(m.getOtsTracking())
                .velocidadFlujoProm(m.getVelocidadFlujoProm())
                .tasaConversion(m.getTasaConversion())
                .scoreCompuestoV2(m.getScoreCompuestoV2())
                .build();
    }
}
