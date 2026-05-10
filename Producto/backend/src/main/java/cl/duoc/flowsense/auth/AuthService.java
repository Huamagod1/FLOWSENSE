package cl.duoc.flowsense.auth;

import cl.duoc.flowsense.auth.dto.AuthResponse;
import cl.duoc.flowsense.auth.dto.LoginRequest;
import cl.duoc.flowsense.auth.dto.RegistroRequest;
import cl.duoc.flowsense.common.exceptions.AccesoDenegadoException;
import cl.duoc.flowsense.common.exceptions.ConflictException;
import cl.duoc.flowsense.organizaciones.Organizacion;
import cl.duoc.flowsense.organizaciones.OrganizacionRepository;
import cl.duoc.flowsense.usuarios.Usuario;
import cl.duoc.flowsense.usuarios.UsuarioRepository;
import cl.duoc.flowsense.usuarios.dto.UsuarioDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String CREDENCIALES_INVALIDAS = "Credenciales inválidas";

    private final UsuarioRepository usuarioRepository;
    private final OrganizacionRepository organizacionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository,
                       OrganizacionRepository organizacionRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.organizacionRepository = organizacionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse registrar(RegistroRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (usuarioRepository.findByEmail(email).isPresent()) {
            log.warn("Intento de registro con email duplicado: {}", email);
            throw new ConflictException("El email ya está registrado");
        }

        Organizacion organizacion = organizacionRepository.save(
                Organizacion.builder()
                        .nombre(request.getNombre().trim() + " " + request.getApellido().trim())
                        .build()
        );

        Usuario usuario = usuarioRepository.save(
                Usuario.builder()
                        .organizacion(organizacion)
                        .email(email)
                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                        .nombre(request.getNombre().trim())
                        .apellido(request.getApellido().trim())
                        .build()
        );

        log.info("Nuevo usuario registrado: id={}, email={}", usuario.getId(), email);

        return AuthResponse.builder()
                .token(jwtService.generarToken(usuario))
                .usuario(toDto(usuario))
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Login fallido: credenciales inválidas");
                    return new AccesoDenegadoException(CREDENCIALES_INVALIDAS);
                });

        if (!usuario.isActivo()) {
            log.error("Login fallido: credenciales inválidas");
            throw new AccesoDenegadoException(CREDENCIALES_INVALIDAS);
        }

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            log.error("Login fallido: credenciales inválidas");
            throw new AccesoDenegadoException(CREDENCIALES_INVALIDAS);
        }

        usuario.setUltimoLogin(LocalDateTime.now());
        usuarioRepository.save(usuario);

        log.info("Login exitoso: id={}", usuario.getId());

        return AuthResponse.builder()
                .token(jwtService.generarToken(usuario))
                .usuario(toDto(usuario))
                .build();
    }

    private UsuarioDTO toDto(Usuario usuario) {
        return UsuarioDTO.builder()
                .id(usuario.getId())
                .email(usuario.getEmail())
                .nombre(usuario.getNombre())
                .apellido(usuario.getApellido())
                .build();
    }
}
