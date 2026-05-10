package cl.duoc.flowsense.videos.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PrecioSugeridoRequest {

    @NotNull(message = "El precio base es obligatorio")
    @Min(value = 0, message = "El precio base debe ser mayor o igual a 0")
    private Integer precioBase;
}
