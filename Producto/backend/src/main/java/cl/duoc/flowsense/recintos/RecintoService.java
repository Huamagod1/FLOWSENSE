package cl.duoc.flowsense.recintos;

import cl.duoc.flowsense.common.exceptions.RecursoNoEncontradoException;
import cl.duoc.flowsense.organizaciones.Organizacion;
import cl.duoc.flowsense.organizaciones.OrganizacionRepository;
import cl.duoc.flowsense.recintos.dto.RecintoRequest;
import cl.duoc.flowsense.recintos.dto.RecintoResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecintoService {

    private final RecintoRepository recintoRepository;
    private final ZonaRepository zonaRepository;
    private final OrganizacionRepository organizacionRepository;

    public RecintoService(RecintoRepository recintoRepository,
                          ZonaRepository zonaRepository,
                          OrganizacionRepository organizacionRepository) {
        this.recintoRepository = recintoRepository;
        this.zonaRepository = zonaRepository;
        this.organizacionRepository = organizacionRepository;
    }

    @Transactional(readOnly = true)
    public List<RecintoResponse> listar(Long idOrg) {
        return recintoRepository.findByOrganizacionIdAndActivoTrueOrderByNombre(idOrg)
                .stream()
                .map(r -> toResponse(r, zonaRepository.countByRecintoId(r.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public RecintoResponse obtener(Long id, Long idOrg) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(id, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Recinto no encontrado"));
        return toResponse(recinto, zonaRepository.countByRecintoId(recinto.getId()));
    }

    @Transactional
    public RecintoResponse crear(RecintoRequest request, Long idOrg) {
        Organizacion organizacion = organizacionRepository.findById(idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Organización no encontrada"));

        Recinto recinto = recintoRepository.save(
                Recinto.builder()
                        .organizacion(organizacion)
                        .nombre(request.getNombre())
                        .direccion(request.getDireccion())
                        .descripcion(request.getDescripcion())
                        .precioBaseClp(request.getPrecioBaseClp())
                        .build()
        );

        return toResponse(recinto, 0);
    }

    @Transactional
    public RecintoResponse actualizar(Long id, RecintoRequest request, Long idOrg) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(id, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Recinto no encontrado"));

        recinto.setNombre(request.getNombre());
        recinto.setDireccion(request.getDireccion());
        recinto.setDescripcion(request.getDescripcion());
        recinto.setPrecioBaseClp(request.getPrecioBaseClp());

        recintoRepository.save(recinto);
        return toResponse(recinto, zonaRepository.countByRecintoId(recinto.getId()));
    }

    @Transactional
    public void desactivar(Long id, Long idOrg) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(id, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Recinto no encontrado"));
        recinto.setActivo(false);
        recintoRepository.save(recinto);
    }

    private RecintoResponse toResponse(Recinto recinto, long cantidadZonas) {
        return RecintoResponse.builder()
                .id(recinto.getId())
                .nombre(recinto.getNombre())
                .direccion(recinto.getDireccion())
                .descripcion(recinto.getDescripcion())
                .precioBaseClp(recinto.getPrecioBaseClp())
                .activo(recinto.isActivo())
                .fechaCreacion(recinto.getFechaCreacion())
                .cantidadZonas((int) cantidadZonas)
                .build();
    }
}
