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

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM DETECCIONES WHERE id_video = :idVideo", nativeQuery = true)
    void deleteByVideoId(@Param("idVideo") Long idVideo);
}
