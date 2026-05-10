package cl.duoc.flowsense.recintos.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RecintoResponse {

    private Long id;
    private String nombre;
    private String direccion;
    private String descripcion;
    private Integer precioBaseClp;
    private boolean activo;
    private LocalDateTime fechaCreacion;
    private int cantidadZonas;
}
