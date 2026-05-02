package cl.duoc.flowsense.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuthResponse {

    private String token;
    private Long idUsuario;
    private String email;
    private Long idOrganizacion;
    private String nombreOrganizacion;
    private String rol;
    private LocalDateTime expiraEn;
}
