package cl.duoc.flowsense.auth.dto;

import cl.duoc.flowsense.usuarios.dto.UsuarioDTO;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private UsuarioDTO usuario;
}
