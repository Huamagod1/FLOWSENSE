package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MetricaTemporalRepository extends JpaRepository<MetricaTemporal, Long> {

    @Query("SELECT mt FROM MetricaTemporal mt JOIN FETCH mt.zona " +
           "WHERE mt.video.id = :idVideo ORDER BY mt.zona.id, mt.franjaNumero")
    List<MetricaTemporal> findByVideoIdWithZonaOrderByZonaAndFranja(@Param("idVideo") Long idVideo);

    @Transactional
    @Modifying
    @Query("DELETE FROM MetricaTemporal mt WHERE mt.video.id = :idVideo")
    void deleteByVideoId(@Param("idVideo") Long idVideo);
}
