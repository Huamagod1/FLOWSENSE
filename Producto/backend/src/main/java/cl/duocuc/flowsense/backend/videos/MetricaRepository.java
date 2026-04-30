package cl.duocuc.flowsense.backend.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MetricaRepository extends JpaRepository<Metrica, Long> {
    List<Metrica> findByVideoId(Long videoId);
    Optional<Metrica> findByVideoIdAndZonaId(Long videoId, Long zonaId);
    void deleteByVideoId(Long videoId);
}
