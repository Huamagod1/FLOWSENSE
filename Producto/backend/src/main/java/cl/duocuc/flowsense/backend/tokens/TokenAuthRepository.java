package cl.duocuc.flowsense.backend.tokens;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TokenAuthRepository extends JpaRepository<TokenAuth, Long> {
    Optional<TokenAuth> findByToken(String token);
}
