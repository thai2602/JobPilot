# ==========================================
# STAGE 1: Build the application using Maven
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Sao chép pom.xml trước để tận dụng cache Docker layer cho dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Sao chép mã nguồn và đóng gói JAR
COPY src ./src
RUN mvn package -DskipTests -B

# ==========================================
# STAGE 2: Runtime với JRE siêu nhẹ
# ==========================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Thiết lập múi giờ Việt Nam và hỗ trợ Tiếng Việt UTF-8
RUN apk add --no-cache tzdata
ENV TZ=Asia/Ho_Chi_Minh
ENV LANG=vi_VN.UTF-8
ENV LANGUAGE=vi_VN:vi
ENV LC_ALL=vi_VN.UTF-8

# Sao chép file JAR đã build từ Stage 1
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Cấu hình cổng chạy mặc định (Render sẽ ghi đè biến PORT này)
ENV PORT=8080
EXPOSE 8080

# Các tham số tối ưu hóa bộ nhớ JVM cho môi trường Container
ENV JAVA_OPTS="-Dfile.encoding=UTF-8 -XX:+UseG1GC -XX:+UseStringDeduplication -XX:MaxRAMPercentage=75.0"

# Khởi chạy ứng dụng
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=$PORT -jar app.jar"]
