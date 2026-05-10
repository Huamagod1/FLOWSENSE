package cl.duoc.flowsense.auth;

import cl.duoc.flowsense.usuarios.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-hours}")
    private long expirationHours;

    public String generarToken(Usuario usuario) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationHours * 3_600_000L);

        return Jwts.builder()
                .subject(usuario.getId().toString())
                .claim("email", usuario.getEmail())
                .claim("org_id", usuario.getOrganizacion().getId())
                .claim("rol", usuario.getRol())
                .issuedAt(now)
                .expiration(exp)
                .signWith(getSigningKey())
                .compact();
    }

    public Long extraerIdUsuario(String token) {
        return Long.parseLong(getClaims(token).getSubject());
    }

    public Long extraerOrgId(String token) {
        return getClaims(token).get("org_id", Long.class);
    }

    public String extraerEmail(String token) {
        return getClaims(token).get("email", String.class);
    }

    public boolean validarToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public LocalDateTime calcularExpiracion() {
        return LocalDateTime.now().plusHours(expirationHours);
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
