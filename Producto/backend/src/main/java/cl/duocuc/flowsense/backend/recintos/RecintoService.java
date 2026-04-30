package cl.duocuc.flowsense.backend.recintos;

import cl.duocuc.flowsense.backend.common.security.CurrentUser;
import cl.duocuc.flowsense.backend.recintos.dto.RecintoRequest;
import cl.duocuc.flowsense.backend.recintos.dto.RecintoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecintoService {
    private final RecintoRepository recintoRepository;
    private final CurrentUser currentUser;

    public List<RecintoResponse> listarTodos() {
        return recintoRepository.findByOrganizacionId(currentUser.getOrganizacionId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public RecintoResponse obtenerPorId(Long id) {
        return recintoRepository.findByIdAndOrganizacionId(id, currentUser.getOrganizacionId())
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));
    }

    @Transactional
    public RecintoResponse crear(RecintoRequest request) {
        Recinto recinto = Recinto.builder()
                .nombre(request.getNombre())
                .tipo(request.getTipo())
                .direccion(request.getDireccion())
                .imagenPlanoBase64(request.getImagenPlanoBase64())
                .organizacion(currentUser.get().getOrganizacion())
                .build();
        
        return mapToResponse(recintoRepository.save(recinto));
    }

    @Transactional
    public RecintoResponse actualizar(Long id, RecintoRequest request) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(id, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));
        
        recinto.setNombre(request.getNombre());
        recinto.setTipo(request.getTipo());
        recinto.setDireccion(request.getDireccion());
        if (request.getImagenPlanoBase64() != null) {
            recinto.setImagenPlanoBase64(request.getImagenPlanoBase64());
        }
        
        return mapToResponse(recintoRepository.save(recinto));
    }

    @Transactional
    public void eliminar(Long id) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(id, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));
        recintoRepository.delete(recinto);
    }

    private RecintoResponse mapToResponse(Recinto recinto) {
        return RecintoResponse.builder()
                .id(recinto.getId())
                .nombre(recinto.getNombre())
                .tipo(recinto.getTipo())
                .direccion(recinto.getDireccion())
                .imagenPlanoBase64(recinto.getImagenPlanoBase64())
                .fechaCreacion(recinto.getFechaCreacion())
                .build();
    }
}
