package cl.duoc.flowsense.videos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    Optional<Video> findByIdAndRecintoOrganizacionId(Long id, Long idOrganizacion);

    List<Video> findByRecintoIdOrderByFechaSubidaDesc(Long idRecinto);

    @Query("SELECT v FROM Video v JOIN FETCH v.recinto WHERE v.id = :id AND v.recinto.organizacion.id = :idOrg")
    Optional<Video> findByIdWithRecintoAndOrganizacionId(@Param("id") Long id, @Param("idOrg") Long idOrg);

    @Query("SELECT v FROM Video v JOIN FETCH v.recinto WHERE v.id = :id")
    Optional<Video> findByIdWithRecinto(@Param("id") Long id);
}
