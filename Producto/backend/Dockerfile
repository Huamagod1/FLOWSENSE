# Etapa 1: compilar el JAR con Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: runtime con Java 21 + Python 3.12
FROM python:3.12-slim

# Instalar Java 21
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        wget \
        curl \
        libgl1 \
        libglib2.0-0 \
    && mkdir -p /opt/java \
    && wget -q https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_linux_hotspot_21.0.5_11.tar.gz -O /tmp/java.tar.gz \
    && tar -xzf /tmp/java.tar.gz -C /opt/java --strip-components=1 \
    && rm /tmp/java.tar.gz \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/opt/java
ENV PATH="$JAVA_HOME/bin:$PATH"

# Instalar dependencias Python
RUN pip install --no-cache-dir \
    ultralytics==8.3.* \
    opencv-python-headless==4.10.* \
    numpy==1.26.*

WORKDIR /app

# Copiar JAR compilado
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
