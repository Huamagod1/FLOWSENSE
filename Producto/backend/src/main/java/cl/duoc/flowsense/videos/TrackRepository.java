package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TrackRepository extends JpaRepository<Track, Long> {

    List<Track> findByVideoIdOrderBySegundosTotalDesc(Long videoId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Track t WHERE t.video.id = :videoId")
    void deleteByVideoId(Long videoId);
}
