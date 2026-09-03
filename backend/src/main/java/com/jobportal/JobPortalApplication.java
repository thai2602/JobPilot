package com.jobportal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.TimeZone;

@SpringBootApplication
public class JobPortalApplication {

    private static final String APPLICATION_TIME_ZONE = "Asia/Ho_Chi_Minh";

    public static void main(String[] args) {
        // Use the canonical IANA name. Some PostgreSQL distributions no longer
        // expose the legacy Asia/Saigon alias sent by the Windows JVM.
        TimeZone.setDefault(TimeZone.getTimeZone(APPLICATION_TIME_ZONE));
        loadDotEnv();
        SpringApplication.run(JobPortalApplication.class, args);
    }

    private static void loadDotEnv() {
        // Try to load .env from the current directory or parent directory
        Path envPath = Paths.get(".env");
        if (!Files.exists(envPath)) {
            envPath = Paths.get("../.env");
        }

        if (Files.exists(envPath)) {
            try {
                List<String> lines = Files.readAllLines(envPath);
                for (String line : lines) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eqIndex = line.indexOf('=');
                    if (eqIndex > 0) {
                        String key = line.substring(0, eqIndex).trim();
                        String value = line.substring(eqIndex + 1).trim();
                        // Strip quotes if present
                        if (value.startsWith("\"") && value.endsWith("\"")) {
                            value = value.substring(1, value.length() - 1);
                        } else if (value.startsWith("'") && value.endsWith("'")) {
                            value = value.substring(1, value.length() - 1);
                        }
                        // Only set if not already set by system environment/properties
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                }
            } catch (IOException e) {
                System.err.println("Warning: Could not read .env file: " + e.getMessage());
            }
        }
    }
}

