package cl.duocuc.flowsense.backend.recintos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecintoRepository extends JpaRepository<Recinto, Long> {
    List<Recinto> findByOrganizacionId(Long organizacionId);
    Optional<Recinto> findByIdAndOrganizacionId(Long id, Long organizacionId);
}
