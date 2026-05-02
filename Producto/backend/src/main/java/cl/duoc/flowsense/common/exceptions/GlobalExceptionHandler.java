package cl.duoc.flowsense.common.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidacion(MethodArgumentNotValidException ex) {
        Map<String, Object> detalles = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            detalles.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(
                ApiErrorResponse.builder()
                        .error("VALIDACION_FALLIDA")
                        .mensaje("Los datos enviados no son válidos")
                        .detalles(detalles)
                        .build()
        );
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                ApiErrorResponse.builder()
                        .error("CONFLICTO")
                        .mensaje(ex.getMessage())
                        .build()
        );
    }

    @ExceptionHandler(AccesoDenegadoException.class)
    public ResponseEntity<ApiErrorResponse> handleAccesoDenegado(AccesoDenegadoException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ApiErrorResponse.builder()
                        .error("NO_AUTORIZADO")
                        .mensaje(ex.getMessage())
                        .build()
        );
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ApiErrorResponse> handleNoEncontrado(RecursoNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                ApiErrorResponse.builder()
                        .error("NO_ENCONTRADO")
                        .mensaje(ex.getMessage())
                        .build()
        );
    }

    @ExceptionHandler(ValidacionException.class)
    public ResponseEntity<ApiErrorResponse> handleValidacionException(ValidacionException ex) {
        return ResponseEntity.badRequest().body(
                ApiErrorResponse.builder()
                        .error("VALIDACION_FALLIDA")
                        .mensaje(ex.getMessage())
                        .build()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenerico(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ApiErrorResponse.builder()
                        .error("ERROR_INTERNO")
                        .mensaje("Error interno del servidor")
                        .build()
        );
    }
}
