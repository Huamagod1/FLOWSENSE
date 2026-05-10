package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.EstadoVideo;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EstadoVideoResponse {

    private Long id;
    private EstadoVideo estado;
    private String mensajeError;
}
