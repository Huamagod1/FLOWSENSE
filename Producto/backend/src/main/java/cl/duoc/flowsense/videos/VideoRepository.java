package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    Optional<Video> findByIdAndRecintoOrganizacionId(Long id, Long idOrganizacion);

    List<Video> findByRecintoIdOrderByFechaSubidaDesc(Long idRecinto);
}
