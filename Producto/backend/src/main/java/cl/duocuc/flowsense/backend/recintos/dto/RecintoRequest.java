package cl.duocuc.flowsense.backend.recintos.dto;

import cl.duocuc.flowsense.backend.recintos.Recinto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RecintoRequest {
    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotNull(message = "El tipo de recinto es obligatorio")
    private Recinto.TipoRecinto tipo;

    private String direccion;

    private String imagenPlanoBase64;
}
