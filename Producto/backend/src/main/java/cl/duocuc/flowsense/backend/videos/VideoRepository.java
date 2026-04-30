package cl.duocuc.flowsense.backend.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findByRecintoIdOrderByFechaSubidaDesc(Long recintoId);
    Optional<Video> findByIdAndRecintoOrganizacionId(Long id, Long organizacionId);
    List<Video> findByEstado(Video.EstadoVideo estado);
}
