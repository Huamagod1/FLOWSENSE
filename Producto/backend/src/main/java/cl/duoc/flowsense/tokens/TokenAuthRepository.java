package cl.duoc.flowsense.tokens;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface TokenAuthRepository extends JpaRepository<TokenAuth, Long> {

    Optional<TokenAuth> findByTokenAndUsadoFalse(String token);

    @Transactional
    void deleteByFechaExpiracionBeforeAndUsadoTrue(LocalDateTime fecha);
}
