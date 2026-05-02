package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.EstadoVideo;
import cl.duoc.flowsense.videos.Video;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class VideoResponse {

    private Long id;
    private Long idRecinto;
    private String nombreArchivo;
    private Long tamanoBytes;
    private Integer duracionSegundos;
    private Integer anchoFrame;
    private Integer altoFrame;
    private EstadoVideo estado;
    private String mensajeError;
    private LocalDateTime fechaSubida;
    private LocalDateTime fechaActualizacion;

    public static VideoResponse from(Video video) {
        return VideoResponse.builder()
                .id(video.getId())
                .idRecinto(video.getRecinto().getId())
                .nombreArchivo(video.getNombreArchivo())
                .tamanoBytes(video.getTamanoBytes())
                .duracionSegundos(video.getDuracionSegundos())
                .anchoFrame(video.getAnchoFrame())
                .altoFrame(video.getAltoFrame())
                .estado(video.getEstado())
                .mensajeError(video.getMensajeError())
                .fechaSubida(video.getFechaSubida())
                .fechaActualizacion(video.getFechaActualizacion())
                .build();
    }
}
