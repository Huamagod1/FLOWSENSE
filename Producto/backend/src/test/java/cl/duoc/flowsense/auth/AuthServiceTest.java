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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private OrganizacionRepository organizacionRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private Organizacion organizacion;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        organizacion = Organizacion.builder()
                .id(1L)
                .nombre("Juan Perez")
                .build();

        usuario = Usuario.builder()
                .id(1L)
                .organizacion(organizacion)
                .email("juan@example.com")
                .passwordHash("$2a$10$hashed")
                .nombre("Juan")
                .apellido("Perez")
                .activo(true)
                .build();
    }

    @Test
    void registrar_exitoso_devuelveTokenYUsuarioAnidado() {
        RegistroRequest req = new RegistroRequest();
        req.setEmail("  Juan@Example.COM  ");
        req.setPassword("password123");
        req.setNombre("Juan");
        req.setApellido("Perez");

        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.empty());
        when(organizacionRepository.save(any())).thenReturn(organizacion);
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$hashed");
        when(usuarioRepository.save(any())).thenReturn(usuario);
        when(jwtService.generarToken(any())).thenReturn("jwt.token.here");

        AuthResponse response = authService.registrar(req);

        assertThat(response.getToken()).isEqualTo("jwt.token.here");
        assertThat(response.getUsuario().getId()).isEqualTo(1L);
        assertThat(response.getUsuario().getEmail()).isEqualTo("juan@example.com");
        assertThat(response.getUsuario().getNombre()).isEqualTo("Juan");
        assertThat(response.getUsuario().getApellido()).isEqualTo("Perez");
        // Verificar que el email normalizado se pasó al repositorio
        verify(usuarioRepository).findByEmail("juan@example.com");
        verify(passwordEncoder).encode("password123");
    }

    @Test
    void registrar_emailDuplicado_lanzaConflictException() {
        RegistroRequest req = new RegistroRequest();
        req.setEmail("juan@example.com");
        req.setPassword("password123");
        req.setNombre("Juan");
        req.setApellido("Perez");

        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.of(usuario));

        assertThatThrownBy(() -> authService.registrar(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ya está registrado");

        verify(usuarioRepository, never()).save(any());
        verify(organizacionRepository, never()).save(any());
    }

    @Test
    void login_exitoso_actualizaUltimoLoginYDevuelveToken() {
        LoginRequest req = new LoginRequest();
        req.setEmail("juan@example.com");
        req.setPassword("password123");

        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("password123", "$2a$10$hashed")).thenReturn(true);
        when(usuarioRepository.save(any())).thenReturn(usuario);
        when(jwtService.generarToken(any())).thenReturn("jwt.token.here");

        AuthResponse response = authService.login(req);

        assertThat(response.getToken()).isEqualTo("jwt.token.here");
        assertThat(response.getUsuario().getEmail()).isEqualTo("juan@example.com");

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        assertThat(captor.getValue().getUltimoLogin()).isNotNull();
    }

    @Test
    void login_passwordIncorrecto_lanzaAccesoDenegadoConMensajeGenerico() {
        LoginRequest req = new LoginRequest();
        req.setEmail("juan@example.com");
        req.setPassword("wrong_password");

        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("wrong_password", "$2a$10$hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(AccesoDenegadoException.class)
                .hasMessage("Credenciales inválidas");

        verify(jwtService, never()).generarToken(any());
        verify(usuarioRepository, never()).save(any());
    }
}
