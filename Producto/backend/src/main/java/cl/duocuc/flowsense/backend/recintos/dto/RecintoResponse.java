package cl.duocuc.flowsense.backend.recintos.dto;

import cl.duocuc.flowsense.backend.recintos.Recinto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RecintoResponse {
    private Long id;
    private String nombre;
    private Recinto.TipoRecinto tipo;
    private String direccion;
    private String imagenPlanoBase64;
    private LocalDateTime fechaCreacion;
}
