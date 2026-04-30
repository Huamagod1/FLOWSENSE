package cl.duocuc.flowsense.backend.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeteccionRepository extends JpaRepository<Deteccion, Long> {
    List<Deteccion> findByVideoId(Long videoId);
    List<Deteccion> findByVideoIdAndZonaId(Long videoId, Long zonaId);
    void deleteByVideoId(Long videoId);
}
