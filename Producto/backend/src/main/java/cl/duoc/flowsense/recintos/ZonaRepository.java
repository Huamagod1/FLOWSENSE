package cl.duoc.flowsense.recintos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ZonaRepository extends JpaRepository<Zona, Long> {

    List<Zona> findByRecintoIdOrderByOrdenAsc(Long idRecinto);

    @Transactional
    void deleteByRecintoId(Long idRecinto);

    long countByRecintoId(Long idRecinto);
}
