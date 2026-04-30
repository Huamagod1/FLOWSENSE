package cl.duocuc.flowsense.backend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private Long usuarioId;
    private String email;
    private String nombre;
    private String apellido;
    private Long organizacionId;
    private String rol;
}
