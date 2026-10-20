package com.jobportal.modules.auth.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class GoogleLoginRequest {
    @NotBlank(message = "Thiếu Google idToken")
    @Size(max = 8192, message = "Google idToken quá dài")
    private String idToken;

    public String getIdToken() {
        return idToken;
    }

    public void setIdToken(String idToken) {
        this.idToken = idToken;
    }
}
