package com.unyt.legion;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

public class HealthControllerTest {

    @Test
    void healthReturnsOk() {
        HealthController controller = new HealthController();
        assertThat(controller.health()).isEqualTo("OK");
    }
}
