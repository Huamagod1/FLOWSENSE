package cl.duoc.flowsense.videos.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EventosResponse {
    private List<EventoDto> eventos;
    private int total;
    private Integer desde;
    private Integer hasta;
}
