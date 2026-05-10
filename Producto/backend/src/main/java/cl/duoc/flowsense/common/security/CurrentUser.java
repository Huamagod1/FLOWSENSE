package cl.duoc.flowsense.common.security;

import cl.duoc.flowsense.usuarios.Usuario;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

    public Long getIdUsuario() {
        return getUsuario().getId();
    }

    public Long getIdOrganizacion() {
        return getUsuario().getOrganizacion().getId();
    }

    private Usuario getUsuario() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Usuario usuario)) {
            throw new IllegalStateException("No hay usuario autenticado en el contexto");
        }
        return usuario;
    }
}
