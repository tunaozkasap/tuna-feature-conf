package com.tuna.feature.conf.service.seed;

import com.jayway.jsonpath.JsonPath;
import com.tuna.feature.conf.service.seed.DemoData.FeatureData;
import com.tuna.feature.conf.service.seed.DemoData.ProjectData;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The demo data is seeded at startup, also in the test context. Other tests add their own projects next to it, so
 * these tests look the seeded projects up by name and count only what belongs to them.
 */
@SpringBootTest
@AutoConfigureMockMvc
class DemoDataSeederIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DemoDataSeeder seeder;

    @Test
    @DisplayName("Every project in the data file is in the database with all its environments, qualifiers, features and rules")
    void seedsEveryEntryOfTheDataFile() throws Exception {
        List<ProjectData> projects = seeder.read().projects();
        assertThat(projects).isNotEmpty();
        for (ProjectData project : projects) {
            long projectId = projectId(project.name());
            int rules = 0;
            for (FeatureData feature : project.features()) {
                rules += feature.rules().size();
            }
            assertThat(count("/api/environments/search", "project.id", projectId)).as(project.name() + " environments")
                    .isEqualTo(project.environments().size());
            assertThat(count("/api/qualifiers/search", "project.id", projectId)).as(project.name() + " qualifiers")
                    .isEqualTo(project.qualifiers().size());
            assertThat(count("/api/features/search", "project.id", projectId)).as(project.name() + " features")
                    .isEqualTo(project.features().size());
            assertThat(count("/api/rules/search", "feature.project.id", projectId)).as(project.name() + " rules")
                    .isEqualTo(rules);
        }
    }

    @Test
    @DisplayName("Seeded rules evaluate as described: roll-out, scheduled roll-out, opt-out by priority, tier before country")
    void seededRulesEvaluate() throws Exception {
        long storefront = projectId("Storefront Web");

        assertThat(evaluate(storefront, "NEW_CHECKOUT", "PROD", "{\"COUNTRY\":\"TR\"}"))
                .isEqualTo(List.of("true", "RULE_MATCH"));
        // Germany's rule only starts in ten days
        assertThat(evaluate(storefront, "NEW_CHECKOUT", "PROD", "{\"COUNTRY\":\"DE\"}"))
                .isEqualTo(List.of("false", "DEFAULT_FALLBACK"));
        // USER_ID has the highest qualifier priority, so the opt-out wins over the country roll-out
        assertThat(evaluate(storefront, "NEW_CHECKOUT", "PROD", "{\"USER_ID\":\"cust-20417\",\"COUNTRY\":\"TR\"}"))
                .isEqualTo(List.of("false", "RULE_MATCH"));
        assertThat(evaluate(storefront, "FREE_SHIPPING_THRESHOLD", "PROD", "{\"CUSTOMER_TIER\":\"PLATINUM\",\"COUNTRY\":\"TR\"}"))
                .isEqualTo(List.of("0", "RULE_MATCH"));
    }

    private long projectId(String name) throws Exception {
        String body = search("/api/projects/search", "name", name);
        List<Number> ids = JsonPath.read(body, "$.items[*].id");
        assertThat(ids).as("projects named " + name).hasSize(1);
        return ids.get(0).longValue();
    }

    private int count(String url, String field, Object value) throws Exception {
        return ((Number) JsonPath.read(search(url, field, value), "$.page.totalElements")).intValue();
    }

    private String search(String url, String field, Object value) throws Exception {
        String filterValue = value instanceof String ? "\"" + value + "\"" : String.valueOf(value);
        String request = "{\"filters\":[{\"field\":\"" + field + "\",\"operator\":\"EQUALS\",\"value\":" + filterValue
                + "}],\"page\":{\"pageNumber\":0,\"pageSize\":500}}";
        return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    /** The resolved value and its source. */
    private List<String> evaluate(long projectId, String featureCode, String environmentCode, String context)
            throws Exception {
        String request = "{\"data\":{\"featureCode\":\"" + featureCode + "\",\"projectId\":" + projectId
                + ",\"environmentCode\":\"" + environmentCode + "\",\"requestContext\":" + context + "}}";
        String body = mockMvc.perform(post("/api/evaluations/evaluate").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return List.of(JsonPath.read(body, "$.data.resolvedValue"), JsonPath.read(body, "$.data.source"));
    }
}
