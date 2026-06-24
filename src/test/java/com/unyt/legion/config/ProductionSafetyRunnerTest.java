package com.unyt.legion.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

class ProductionSafetyRunnerTest {

    private AppProperties propsWithSecret(String secret) {
        return new AppProperties(
                new AppProperties.Security(secret, 30, 14),
                null,
                "uploads",
                null);
    }

    private Environment env(String... activeProfiles) {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(activeProfiles);
        return environment;
    }

    @Test
    void nonProdProfileSkipsAllChecks() {
        var runner = new ProductionSafetyRunner(propsWithSecret(""), env());
        assertThatCode(() -> runner.run(null)).doesNotThrowAnyException();
    }

    @Test
    void prodWithBlankSecretFailsFast() {
        var runner = new ProductionSafetyRunner(propsWithSecret(""), env("prod"));
        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_JWT_SECRET must be set");
    }

    @Test
    void prodWithShortSecretFailsFast() {
        var runner = new ProductionSafetyRunner(propsWithSecret("too-short"), env("prod"));
        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }

    @Test
    void prodWithStrongSecretPasses() {
        var runner = new ProductionSafetyRunner(
                propsWithSecret("a-sufficiently-long-production-jwt-secret-value"), env("prod"));
        assertThatCode(() -> runner.run(null)).doesNotThrowAnyException();
    }
}
