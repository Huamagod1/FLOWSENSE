package cl.duocuc.flowsense.backend.recintos;

import cl.duocuc.flowsense.backend.common.security.CurrentUser;
import cl.duocuc.flowsense.backend.recintos.dto.ZonaRequest;
import cl.duocuc.flowsense.backend.recintos.dto.ZonaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ZonaService {
    private final ZonaRepository zonaRepository;
    private final RecintoRepository recintoRepository;
    private final CurrentUser currentUser;

    public List<ZonaResponse> listarPorRecinto(Long recintoId) {
        // Verificar que el recinto pertenezca a la organización
        recintoRepository.findByIdAndOrganizacionId(recintoId, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));
        
        return zonaRepository.findByRecintoId(recintoId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ZonaResponse crear(Long recintoId, ZonaRequest request) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(recintoId, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));
        
        Zona zona = Zona.builder()
                .nombre(request.getNombre())
                .x(request.getX())
                .y(request.getY())
                .ancho(request.getAncho())
                .alto(request.getAlto())
                .colorHex(request.getColorHex())
                .recinto(recinto)
                .build();
        
        return mapToResponse(zonaRepository.save(zona));
    }

    @Transactional
    public void eliminar(Long id) {
        Zona zona = zonaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zona no encontrada"));
        
        // Verificar pertenencia vía recinto
        if (!zona.getRecinto().getOrganizacion().getId().equals(currentUser.getOrganizacionId())) {
            throw new RuntimeException("Acceso denegado");
        }
        
        zonaRepository.delete(zona);
    }

    private ZonaResponse mapToResponse(Zona zona) {
        return ZonaResponse.builder()
                .id(zona.getId())
                .nombre(zona.getNombre())
                .x(zona.getX())
                .y(zona.getY())
                .ancho(zona.getAncho())
                .alto(zona.getAlto())
                .colorHex(zona.getColorHex())
                .build();
    }
}
