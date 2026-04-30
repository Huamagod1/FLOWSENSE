package cl.duocuc.flowsense.backend.procesamiento;

import cl.duocuc.flowsense.backend.videos.Video;
import cl.duocuc.flowsense.backend.videos.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class PythonOrchestratorService {
    private final VideoRepository videoRepository;

    @Value("${python.bin:python3}")
    private String pythonBin;

    @Value("${python.script:Producto/python/detector.py}")
    private String pythonScript;

    @Value("${upload.dir:uploads/}")
    private String uploadDir;

    @Value("${results.dir:results/}")
    private String resultsDir;

    public String extraerFrame(Video video) {
        String framePath = resultsDir + video.getId() + "_preview.png";
        try {
            List<String> command = new ArrayList<>();
            command.add(pythonBin);
            command.add(pythonScript);
            command.add("--modo");
            command.add("extraer-frame");
            command.add("--video");
            command.add(video.getRuta());
            command.add("--frame-output");
            command.add(framePath);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.debug("Python output: {}", line);
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                return framePath;
            } else {
                throw new RuntimeException("Error al extraer frame. Exit code: " + exitCode);
            }
        } catch (Exception e) {
            log.error("Error ejecutando Python para extraer frame", e);
            throw new RuntimeException("Error al extraer frame: " + e.getMessage());
        }
    }

    @Async
    public CompletableFuture<Void> procesarVideo(Video video, String zonasJsonPath) {
        String csvOutput = resultsDir + video.getId() + "_detecciones.csv";
        video.setEstado(Video.EstadoVideo.PROCESANDO);
        videoRepository.save(video);

        try {
            List<String> command = new ArrayList<>();
            command.add(pythonBin);
            command.add(pythonScript);
            command.add("--video");
            command.add(video.getRuta());
            command.add("--output");
            command.add(csvOutput);
            command.add("--zonas");
            command.add(zonasJsonPath);
            command.add("--fps");
            command.add("1");

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("Python processing [Video {}]: {}", video.getId(), line);
                    // Aquí se podría parsear el progreso si Python lo imprime en JSON
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("Procesamiento completado exitosamente para video {}", video.getId());
                // El VideoService se encargará de leer el CSV y calcular métricas
            } else {
                video.setEstado(Video.EstadoVideo.ERROR);
                video.setMensajeError("Python exit code: " + exitCode);
                videoRepository.save(video);
            }
        } catch (Exception e) {
            log.error("Error procesando video {}", video.getId(), e);
            video.setEstado(Video.EstadoVideo.ERROR);
            video.setMensajeError(e.getMessage());
            videoRepository.save(video);
        }
        return CompletableFuture.completedFuture(null);
    }
}
