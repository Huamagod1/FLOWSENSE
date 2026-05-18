package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface MetricaTrackingRepository extends JpaRepository<MetricaTracking, Long> {

    List<MetricaTracking> findByVideoIdOrderByIdZonaAscSegundosDesc(Long videoId);

    @Modifying
    @Transactional
    @Query("DELETE FROM MetricaTracking mt WHERE mt.video.id = :videoId")
    void deleteByVideoId(Long videoId);
}
