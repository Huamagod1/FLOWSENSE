package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface FlujoEntreZonasRepository extends JpaRepository<FlujoEntreZonas, Long> {

    List<FlujoEntreZonas> findByVideoIdOrderByConteoTracksDesc(Long videoId);

    @Modifying
    @Transactional
    @Query("DELETE FROM FlujoEntreZonas f WHERE f.video.id = :videoId")
    void deleteByVideoId(Long videoId);
}
