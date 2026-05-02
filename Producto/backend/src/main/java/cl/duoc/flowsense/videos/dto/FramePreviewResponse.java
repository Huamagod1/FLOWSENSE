package cl.duoc.flowsense.videos.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FramePreviewResponse {

    private Long idVideo;
    private String urlFrame;
    private Integer anchoFrame;
    private Integer altoFrame;
}
