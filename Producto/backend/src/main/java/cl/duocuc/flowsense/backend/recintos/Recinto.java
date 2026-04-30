package cl.duocuc.flowsense.backend.recintos;

import cl.duocuc.flowsense.backend.organizaciones.Organizacion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "recintos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recinto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_organizacion", nullable = false)
    private Organizacion organizacion;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoRecinto tipo;

    @Column(length = 255)
    private String direccion;

    @Column(name = "imagen_plano_base64", columnDefinition = "LONGTEXT")
    private String imagenPlanoBase64;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (tipo == null) {
            tipo = TipoRecinto.OTRO;
        }
    }

    public enum TipoRecinto {
        MALL, GALERIA, FERIA, OTRO
    }
}
