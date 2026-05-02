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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

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
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ConflictException("El email ya está registrado");
        }

        Organizacion organizacion = organizacionRepository.save(
                Organizacion.builder()
                        .nombre(request.getNombreOrganizacion())
                        .build()
        );

        Usuario usuario = usuarioRepository.save(
                Usuario.builder()
                        .organizacion(organizacion)
                        .email(request.getEmail())
                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                        .nombre(request.getNombre())
                        .apellido(request.getApellido())
                        .build()
        );

        String token = jwtService.generarToken(usuario);

        return AuthResponse.builder()
                .token(token)
                .idUsuario(usuario.getId())
                .email(usuario.getEmail())
                .idOrganizacion(organizacion.getId())
                .nombreOrganizacion(organizacion.getNombre())
                .rol(usuario.getRol())
                .expiraEn(jwtService.calcularExpiracion())
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AccesoDenegadoException(CREDENCIALES_INVALIDAS));

        if (!usuario.isActivo()) {
            throw new AccesoDenegadoException(CREDENCIALES_INVALIDAS);
        }

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            throw new AccesoDenegadoException(CREDENCIALES_INVALIDAS);
        }

        String token = jwtService.generarToken(usuario);

        return AuthResponse.builder()
                .token(token)
                .idUsuario(usuario.getId())
                .email(usuario.getEmail())
                .idOrganizacion(usuario.getOrganizacion().getId())
                .nombreOrganizacion(usuario.getOrganizacion().getNombre())
                .rol(usuario.getRol())
                .expiraEn(jwtService.calcularExpiracion())
                .build();
    }
}
