package cl.duoc.flowsense.recintos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecintoRepository extends JpaRepository<Recinto, Long> {

    Optional<Recinto> findByIdAndOrganizacionId(Long id, Long idOrganizacion);

    List<Recinto> findByOrganizacionIdAndActivoTrueOrderByNombre(Long idOrganizacion);

    boolean existsByIdAndOrganizacionId(Long id, Long idOrganizacion);
}
