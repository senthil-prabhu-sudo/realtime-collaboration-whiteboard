# =========================
# BUILD STAGE (Java 21)
# =========================
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests


# =========================
# RUNTIME STAGE (Java 21)
# =========================
FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Copy the built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# 🔴 IMPORTANT: run app.jar, NOT target/*.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
