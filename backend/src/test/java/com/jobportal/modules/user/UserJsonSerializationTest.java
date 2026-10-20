package com.jobportal.modules.user;

import com.jobportal.modules.application.Application;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

/** Defense in depth: even if a User entity leaks into a response, its password hash must not. */
class UserJsonSerializationTest {

    private static final String PASSWORD_HASH = "$2a$10$super-secret-bcrypt-hash";

    @Test
    void userEntityNeverSerializesPassword() throws Exception {
        User user = user();

        String json3 = JsonMapper.builder().build().writeValueAsString(user);
        String json2 = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(user);

        for (String json : new String[] {json3, json2}) {
            assertThat(json).contains("\"email\"").doesNotContain("password").doesNotContain(PASSWORD_HASH);
        }
    }

    @Test
    void applicationEntityDoesNotEmbedUser() throws Exception {
        Application application = new Application();
        application.setId(1L);
        application.setUser(user());

        String json = JsonMapper.builder().build().writeValueAsString(application);

        assertThat(json).doesNotContain("\"user\"").doesNotContain(PASSWORD_HASH);
    }

    private static User user() {
        User user = new User();
        user.setId(1L);
        user.setEmail("a@example.com");
        user.setPassword(PASSWORD_HASH);
        return user;
    }
}
