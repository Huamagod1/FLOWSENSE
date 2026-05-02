package cl.duoc.flowsense.recintos;

import cl.duoc.flowsense.organizaciones.Organizacion;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "RECINTOS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recinto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_organizacion", nullable = false)
    private Organizacion organizacion;

    @Column(nullable = false)
    private String nombre;

    @Column(length = 500)
    private String direccion;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "precio_base_clp")
    private Integer precioBaseClp;

    @Column(nullable = false)
    @Builder.Default
    private boolean activo = true;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @OneToMany(mappedBy = "recinto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Zona> zonas = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;
}
