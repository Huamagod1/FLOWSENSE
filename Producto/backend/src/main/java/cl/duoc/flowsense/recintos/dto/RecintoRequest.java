package cl.duoc.flowsense.recintos.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RecintoRequest {

    @NotBlank
    @Size(max = 255)
    private String nombre;

    @Size(max = 500)
    private String direccion;

    private String descripcion;

    @Min(0)
    private Integer precioBaseClp;
}
