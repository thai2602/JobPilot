package com.jobportal.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

/** Jackson 2 mapper used by LangChain4j-era modules on Spring Boot 4/Jackson 3. */
@Configuration
public class LegacyJacksonConfig {

    @Bean
    public ObjectMapper legacyObjectMapper() {
        return new ObjectMapper();
    }
}
