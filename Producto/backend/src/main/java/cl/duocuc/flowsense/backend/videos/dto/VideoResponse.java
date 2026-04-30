package cl.duocuc.flowsense.backend.videos.dto;

import cl.duocuc.flowsense.backend.videos.Video;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VideoResponse {
    private Long id;
    private String nombreOriginal;
    private Video.EstadoVideo estado;
    private String rutaFramePreview;
    private BigDecimal confUsado;
    private Integer framesProcesados;
    private LocalDateTime fechaSubida;
    private LocalDateTime fechaCompletado;
    private String mensajeError;
}
