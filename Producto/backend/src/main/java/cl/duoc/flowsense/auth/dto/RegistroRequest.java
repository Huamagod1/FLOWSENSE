package cl.duoc.flowsense.auth.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegistroRequest {

    @NotBlank
    private String nombreOrganizacion;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    @Pattern(
        regexp = "^(?=.*[a-zA-Z])(?=.*\\d).+$",
        message = "La contraseña debe contener al menos una letra y un número"
    )
    private String password;

    @NotBlank
    private String nombre;

    @NotBlank
    private String apellido;
}
