package com.jobportal.modules.auth.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequest {
    @NotBlank(message = "Email is required")
    @Size(max = 255, message = "Email is too long")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(max = 255, message = "Password is too long")
    private String password;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
