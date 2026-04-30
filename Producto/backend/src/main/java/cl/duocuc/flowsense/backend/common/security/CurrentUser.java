package cl.duocuc.flowsense.backend.common.security;

import cl.duocuc.flowsense.backend.usuarios.Usuario;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    
    public Usuario get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return (Usuario) authentication.getPrincipal();
    }

    public Long getId() {
        Usuario usuario = get();
        return usuario != null ? usuario.getId() : null;
    }

    public Long getOrganizacionId() {
        Usuario usuario = get();
        return (usuario != null && usuario.getOrganizacion() != null) ? usuario.getOrganizacion().getId() : null;
    }
}
