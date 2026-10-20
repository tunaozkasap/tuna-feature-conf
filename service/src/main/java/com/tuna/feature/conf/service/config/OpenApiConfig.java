package com.tuna.feature.conf.service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuna.feature.conf.service.exception.ApiErrorResponse;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.core.jackson.TypeNameResolver;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.media.Schema;
import org.springdoc.core.customizers.OpenApiCustomizer;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Tuna Feature Configuration API")
                        .version("0.0.1")
                        .description("REST API documentation for Tuna Feature Configuration and Evaluation Service")
                        .contact(new Contact()
                                .name("Tuna Feature Conf Team"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }

    /**
     * Names the schemas of the nested DTO classes after their outer class, e.g. {@code FeatureDto.Response} becomes
     * {@code FeatureResponse} and {@code CrudResponse<FeatureDto.Response>} becomes
     * {@code CrudResponseFeatureResponse}. By default they are all called {@code Response}, {@code CreateRequest},
     * ..., so one overwrites the other and the generated UI types would be wrong.
     */
    @Bean
    public ModelResolver dtoNamingModelResolver(ObjectMapper objectMapper) {
        return new ModelResolver(objectMapper, new DtoTypeNameResolver());
    }

    /**
     * Adds the unified error body to the spec's schemas. No operation declares it, so springdoc would leave it out,
     * and the UI's generated types need it to read error responses.
     */
    @Bean
    public OpenApiCustomizer errorResponseSchema() {
        return openApi -> {
            Map<String, Schema> schemas = ModelConverters.getInstance().readAll(ApiErrorResponse.class);
            for (Map.Entry<String, Schema> schema : schemas.entrySet()) {
                openApi.getComponents().addSchemas(schema.getKey(), schema.getValue());
            }
        };
    }

    static class DtoTypeNameResolver extends TypeNameResolver {

        private static final String DTO_SUFFIX = "Dto";

        @Override
        protected String getNameOfClass(Class<?> cls) {
            Class<?> outer = cls.getEnclosingClass();
            if (outer != null && outer.getSimpleName().endsWith(DTO_SUFFIX)) {
                String outerName = outer.getSimpleName();
                return outerName.substring(0, outerName.length() - DTO_SUFFIX.length()) + cls.getSimpleName();
            }
            return super.getNameOfClass(cls);
        }
    }
}
