package cl.duoc.flowsense.common.exceptions;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ApiErrorResponse {

    private String error;
    private String mensaje;
    private Map<String, Object> detalles;
}
