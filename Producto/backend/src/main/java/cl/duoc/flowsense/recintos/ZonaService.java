package cl.duoc.flowsense.recintos;

import cl.duoc.flowsense.common.exceptions.RecursoNoEncontradoException;
import cl.duoc.flowsense.recintos.dto.ZonaRequest;
import cl.duoc.flowsense.recintos.dto.ZonaResponse;
import cl.duoc.flowsense.recintos.dto.ZonasGuardarRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ZonaService {

    private final ZonaRepository zonaRepository;
    private final RecintoRepository recintoRepository;

    public ZonaService(ZonaRepository zonaRepository, RecintoRepository recintoRepository) {
        this.zonaRepository = zonaRepository;
        this.recintoRepository = recintoRepository;
    }

    @Transactional(readOnly = true)
    public List<ZonaResponse> listarPorRecinto(Long idRecinto, Long idOrg) {
        if (!recintoRepository.existsByIdAndOrganizacionId(idRecinto, idOrg)) {
            throw new RecursoNoEncontradoException("Recinto no encontrado");
        }
        return zonaRepository.findByRecintoIdOrderByOrdenAsc(idRecinto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<ZonaResponse> guardarZonas(Long idRecinto, ZonasGuardarRequest request, Long idOrg) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(idRecinto, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Recinto no encontrado"));

        zonaRepository.deleteByRecintoId(idRecinto);
        zonaRepository.flush();

        List<Zona> nuevasZonas = request.getZonas().stream()
                .map(zonaReq -> toEntity(zonaReq, recinto))
                .toList();

        return zonaRepository.saveAll(nuevasZonas)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Zona toEntity(ZonaRequest request, Recinto recinto) {
        return Zona.builder()
                .recinto(recinto)
                .nombre(request.getNombre())
                .colorHex(request.getColorHex() != null ? request.getColorHex() : "#3498db")
                .xNorm(request.getXNorm())
                .yNorm(request.getYNorm())
                .anchoNorm(request.getAnchoNorm())
                .altoNorm(request.getAltoNorm())
                .orden(request.getOrden())
                .build();
    }

    private ZonaResponse toResponse(Zona zona) {
        return ZonaResponse.builder()
                .id(zona.getId())
                .idRecinto(zona.getRecinto().getId())
                .nombre(zona.getNombre())
                .colorHex(zona.getColorHex())
                .xNorm(zona.getXNorm())
                .yNorm(zona.getYNorm())
                .anchoNorm(zona.getAnchoNorm())
                .altoNorm(zona.getAltoNorm())
                .orden(zona.getOrden())
                .fechaCreacion(zona.getFechaCreacion())
                .build();
    }
}
