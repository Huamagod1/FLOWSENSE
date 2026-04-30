package cl.duocuc.flowsense.backend.auth;

import cl.duocuc.flowsense.backend.auth.dto.AuthResponse;
import cl.duocuc.flowsense.backend.auth.dto.LoginRequest;
import cl.duocuc.flowsense.backend.auth.dto.RegisterRequest;
import cl.duocuc.flowsense.backend.organizaciones.Organizacion;
import cl.duocuc.flowsense.backend.organizaciones.OrganizacionRepository;
import cl.duocuc.flowsense.backend.usuarios.Usuario;
import cl.duocuc.flowsense.backend.usuarios.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UsuarioRepository usuarioRepository;
    private final OrganizacionRepository organizacionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        Organizacion organizacion = Organizacion.builder()
                .nombre(request.getNombreOrganizacion())
                .activo(true)
                .build();
        organizacion = organizacionRepository.save(organizacion);

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .organizacion(organizacion)
                .rol(Usuario.Rol.ADMIN)
                .activo(true)
                .build();
        usuarioRepository.save(usuario);

        return generateAuthResponse(usuario);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return generateAuthResponse(usuario);
    }

    private AuthResponse generateAuthResponse(Usuario usuario) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("org_id", usuario.getOrganizacion().getId());
        extraClaims.put("rol", usuario.getRol().name());
        extraClaims.put("email", usuario.getEmail());

        String jwtToken = jwtService.generateToken(extraClaims, usuario);
        return AuthResponse.builder()
                .token(jwtToken)
                .usuarioId(usuario.getId())
                .email(usuario.getEmail())
                .nombre(usuario.getNombre())
                .apellido(usuario.getApellido())
                .organizacionId(usuario.getOrganizacion().getId())
                .rol(usuario.getRol().name())
                .build();
    }
}
