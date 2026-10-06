FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

COPY /target/quarkus-map-parser.jar .

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "quarkus-map-parser.jar"]
