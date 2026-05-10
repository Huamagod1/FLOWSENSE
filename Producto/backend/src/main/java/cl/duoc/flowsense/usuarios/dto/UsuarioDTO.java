package cl.duoc.flowsense.usuarios.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UsuarioDTO {
    private Long id;
    private String email;
    private String nombre;
    private String apellido;
}
