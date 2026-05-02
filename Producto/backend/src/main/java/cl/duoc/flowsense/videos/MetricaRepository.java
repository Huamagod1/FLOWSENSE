package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MetricaRepository extends JpaRepository<Metrica, Long> {

    @Query("SELECT m FROM Metrica m JOIN FETCH m.zona WHERE m.video.id = :idVideo ORDER BY m.totalDetecciones DESC")
    List<Metrica> findByVideoIdWithZonaOrderByTotalDeteccionesDesc(@Param("idVideo") Long idVideo);

    @Transactional
    @Modifying
    @Query("DELETE FROM Metrica m WHERE m.video.id = :idVideo")
    void deleteByVideoId(@Param("idVideo") Long idVideo);
}
