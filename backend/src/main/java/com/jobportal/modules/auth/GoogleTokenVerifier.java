package com.jobportal.modules.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobportal.common.exception.ApiException;
import com.jobportal.common.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

/** Verifies a Google ID token via Google's tokeninfo endpoint and returns the verified email. */
@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final String googleClientId;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GoogleTokenVerifier(@Value("${google.client-id:}") String googleClientId) {
        this.googleClientId = googleClientId;
    }

    /**
     * @return the verified email of the token's owner
     * @throws UnauthorizedException when the token is invalid, expired, unverified or issued for another client
     * @throws ApiException 503 when Google login is not configured, 500 when Google cannot be reached
     */
    public String verifyAndGetEmail(String idToken) {
        // Không có client ID thì không kiểm tra được aud: token cấp cho app khác cũng sẽ lọt qua
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Đăng nhập Google chưa được cấu hình");
        }

        JsonNode tokenInfo = fetchTokenInfo(idToken);
        String email = tokenInfo.path("email").asText(null);
        String aud = tokenInfo.path("aud").asText("");
        boolean emailVerified = "true".equalsIgnoreCase(tokenInfo.path("email_verified").asText("false"));

        if (email == null || !emailVerified) {
            throw new UnauthorizedException("Không xác minh được email Google");
        }
        // Token phải được cấp cho chính client ID của JobPilot
        if (!googleClientId.equals(aud)) {
            log.warn("Google token audience mismatch (aud={})", aud);
            throw new UnauthorizedException("Google client id không khớp");
        }
        return email;
    }

    private JsonNode fetchTokenInfo(String idToken) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TOKEN_INFO_URL + URLEncoder.encode(idToken, StandardCharsets.UTF_8)))
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.info("Google tokeninfo rejected token (status {})", response.statusCode());
                throw new UnauthorizedException("Google token không hợp lệ hoặc đã hết hạn");
            }
            return objectMapper.readTree(response.body());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Đăng nhập Google thất bại", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Đăng nhập Google thất bại", ex);
        }
    }
}
