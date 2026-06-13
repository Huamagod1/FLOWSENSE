package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DeteccionRepository extends JpaRepository<Deteccion, Long> {

    long countByVideoId(Long idVideo);

    @Query("SELECT DISTINCT d.frameNumero FROM Deteccion d WHERE d.video.id = :idVideo")
    List<Integer> findDistinctFrameNumeroByVideoId(@Param("idVideo") Long idVideo);

    @Query(value = "SELECT x_centro_norm, y_centro_norm, id_zona FROM DETECCIONES WHERE id_video = :idVideo",
           nativeQuery = true)
    List<Object[]> findHeatmapRawByVideoId(@Param("idVideo") Long idVideo);

    @Query(value = "SELECT track_id, x_centro_norm, y_centro_norm, frame_numero " +
                   "FROM DETECCIONES WHERE id_video = :idVideo AND track_id <> -1 " +
                   "ORDER BY track_id, frame_numero",
           nativeQuery = true)
    List<Object[]> findTrayectoriasRawByVideoId(@Param("idVideo") Long idVideo);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM DETECCIONES WHERE id_video = :idVideo", nativeQuery = true)
    void deleteByVideoId(@Param("idVideo") Long idVideo);
}
