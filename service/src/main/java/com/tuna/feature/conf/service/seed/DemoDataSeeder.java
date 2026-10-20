package com.tuna.feature.conf.service.seed;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuna.feature.conf.model.enums.FeatureQualifierValueType;
import com.tuna.feature.conf.persistence.entity.EnvironmentEntity;
import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import com.tuna.feature.conf.persistence.entity.FeatureRuleEntity;
import com.tuna.feature.conf.persistence.entity.ProductEntity;
import com.tuna.feature.conf.persistence.entity.ProjectEntity;
import com.tuna.feature.conf.persistence.entity.UserEntity;
import com.tuna.feature.conf.persistence.repository.EnvironmentRepository;
import com.tuna.feature.conf.persistence.repository.FeatureQualifierRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRuleRepository;
import com.tuna.feature.conf.persistence.repository.ProductRepository;
import com.tuna.feature.conf.persistence.repository.ProjectRepository;
import com.tuna.feature.conf.persistence.repository.UserRepository;
import com.tuna.feature.conf.service.seed.DemoData.EnvironmentData;
import com.tuna.feature.conf.service.seed.DemoData.FeatureData;
import com.tuna.feature.conf.service.seed.DemoData.ProductData;
import com.tuna.feature.conf.service.seed.DemoData.ProjectData;
import com.tuna.feature.conf.service.seed.DemoData.QualifierData;
import com.tuna.feature.conf.service.seed.DemoData.RuleData;
import com.tuna.feature.conf.service.seed.DemoData.UserData;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Fills the empty database with the demo data in {@value #DATA_FILE} when the application starts. The service is a
 * prototype on an in-memory database that starts empty every time, so this gives every start the same realistic data.
 * <p>
 * Writes one evidence line with {@code "execution":"seedData"}: what was inserted, or why nothing was. Skipped when
 * the database already has projects, so a persistent database is never filled twice. Turned off with
 * {@code app.seed.enabled=false}.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    static final String DATA_FILE = "seed/demo-data.json";

    /** {@code now}, {@code now+7d}, {@code now-3h}: a time relative to the startup, in days or hours. */
    private static final Pattern RELATIVE_TIME = Pattern.compile("now(?:([+-])(\\d+)([dh]))?");

    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;
    private final ProjectRepository projectRepository;
    private final EnvironmentRepository environmentRepository;
    private final FeatureQualifierRepository qualifierRepository;
    private final FeatureRepository featureRepository;
    private final FeatureRuleRepository ruleRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Override
    public void run(ApplicationArguments args) {
        s().kv("execution", "seedData").kv("dataFile", DATA_FILE);
        try {
            if (projectRepository.count() > 0) {
                s().kv("result", "skipped").kv("reason", "databaseNotEmpty");
                return;
            }
            DemoData data = read();
            Instant now = Instant.now();
            s().kv("startedAt", now.toString());
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> insert(data, now));
            s().kv("result", "seeded");
        } catch (RuntimeException ex) {
            // The startup fails on bad seed data; the evidence says which entry was wrong
            s().kv("result", "failed").kv("error", ex.getMessage());
            throw ex;
        } finally {
            s().logNow();
        }
    }

    DemoData read() {
        try (InputStream in = new ClassPathResource(DATA_FILE).getInputStream()) {
            return objectMapper.readerFor(DemoData.class)
                    .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .readValue(in);
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot read " + DATA_FILE + ": " + ex.getMessage(), ex);
        }
    }

    private void insert(DemoData data, Instant now) {
        Counts total = new Counts();
        List<Map<String, Object>> projectSummaries = new ArrayList<>();
        for (ProjectData project : listOrEmpty(data.projects())) {
            Counts counts = insertProject(project, now);
            total.add(counts);
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("name", project.name());
            summary.putAll(counts.toMap());
            projectSummaries.add(summary);
        }
        int users = insertUsers(listOrEmpty(data.users()));
        int products = insertProducts(listOrEmpty(data.products()));

        Map<String, Object> inserted = new LinkedHashMap<>();
        inserted.put("projects", projectSummaries.size());
        inserted.putAll(total.toMap());
        inserted.put("users", users);
        inserted.put("products", products);
        s().kv("inserted", inserted).kv("projects", projectSummaries);
    }

    private Counts insertProject(ProjectData data, Instant now) {
        Counts counts = new Counts();
        ProjectEntity project = new ProjectEntity();
        project.setName(required(data.name(), "project name"));
        project.setDescription(data.description());
        project = projectRepository.save(project);
        String where = "project '" + data.name() + "'";

        Map<String, EnvironmentEntity> environments = new HashMap<>();
        for (EnvironmentData environmentData : listOrEmpty(data.environments())) {
            EnvironmentEntity environment = new EnvironmentEntity();
            environment.setCode(code(environmentData.code(), where));
            environment.setName(required(environmentData.name(), "environment name in " + where));
            environment.setDescription(environmentData.description());
            environment.setProject(project);
            environments.put(environment.getCode(), environmentRepository.save(environment));
            counts.environments++;
        }

        Map<String, FeatureQualifierEntity> qualifiers = new HashMap<>();
        for (QualifierData qualifierData : listOrEmpty(data.qualifiers())) {
            FeatureQualifierEntity qualifier = new FeatureQualifierEntity();
            qualifier.setCode(code(qualifierData.code(), where));
            qualifier.setName(required(qualifierData.name(), "qualifier name in " + where));
            qualifier.setDescription(qualifierData.description());
            qualifier.setPriority(qualifierData.priority() != null ? qualifierData.priority() : 0);
            qualifier.setValueType(required(qualifierData.valueType(), "valueType of qualifier "
                    + qualifier.getCode() + " in " + where));
            qualifier.setProject(project);
            qualifiers.put(qualifier.getCode(), qualifierRepository.save(qualifier));
            counts.qualifiers++;
        }

        for (FeatureData featureData : listOrEmpty(data.features())) {
            FeatureEntity feature = new FeatureEntity();
            feature.setCode(code(featureData.code(), where));
            feature.setName(required(featureData.name(), "feature name in " + where));
            feature.setDescription(featureData.description());
            feature.setProject(project);
            feature = featureRepository.save(feature);
            counts.features++;

            String ruleWhere = "feature " + feature.getCode() + " in " + where;
            for (RuleData ruleData : listOrEmpty(featureData.rules())) {
                FeatureRuleEntity rule = toRule(ruleData, feature, environments, qualifiers, now, ruleWhere);
                ruleRepository.save(rule);
                counts.countRule(rule, now);
            }
        }
        return counts;
    }

    private FeatureRuleEntity toRule(RuleData data, FeatureEntity feature, Map<String, EnvironmentEntity> environments,
                                     Map<String, FeatureQualifierEntity> qualifiers, Instant now, String where) {
        EnvironmentEntity environment = environments.get(code(data.environment(), where));
        if (environment == null) {
            throw new IllegalStateException("Unknown environment '" + data.environment() + "' in a rule of " + where);
        }
        FeatureQualifierEntity qualifier = qualifiers.get(code(data.qualifier(), where));
        if (qualifier == null) {
            throw new IllegalStateException("Unknown qualifier '" + data.qualifier() + "' in a rule of " + where);
        }
        String qualifierValue = required(data.qualifierValue(), "qualifierValue in a rule of " + where);
        checkValueType(qualifier, qualifierValue, where);

        FeatureRuleEntity rule = new FeatureRuleEntity();
        rule.setFeature(feature);
        rule.setEnvironment(environment);
        rule.setQualifier(qualifier);
        rule.setQualifierValue(qualifierValue);
        rule.setFeatureValue(required(data.featureValue(), "featureValue in a rule of " + where));
        rule.setPriority(data.priority() != null ? data.priority() : 0);
        rule.setEnabled(data.enabled() != null ? data.enabled() : true);
        rule.setEffectiveFrom(resolveTime(data.effectiveFrom(), now));
        rule.setEffectiveTo(resolveTime(data.effectiveTo(), now));
        rule.setDescription(data.description());
        return rule;
    }

    /** A rule's qualifier value must be something a request of that qualifier type can send. */
    private void checkValueType(FeatureQualifierEntity qualifier, String value, String where) {
        FeatureQualifierValueType type = qualifier.getValueType();
        boolean valid = true;
        if (type == FeatureQualifierValueType.BOOLEAN) {
            valid = "true".equalsIgnoreCase(value.trim()) || "false".equalsIgnoreCase(value.trim());
        } else if (type == FeatureQualifierValueType.NUMERIC) {
            try {
                new BigDecimal(value.trim());
            } catch (NumberFormatException ex) {
                valid = false;
            }
        } else if (type == FeatureQualifierValueType.JSON) {
            try {
                objectMapper.readTree(value);
            } catch (JsonProcessingException ex) {
                valid = false;
            }
        }
        if (!valid) {
            throw new IllegalStateException("Value '" + value + "' is not " + type + " for qualifier "
                    + qualifier.getCode() + " in a rule of " + where);
        }
    }

    private int insertUsers(List<UserData> users) {
        for (UserData data : users) {
            UserEntity user = new UserEntity();
            user.setUsername(required(data.username(), "username"));
            user.setEmail(required(data.email(), "email of user " + data.username()));
            userRepository.save(user);
        }
        return users.size();
    }

    private int insertProducts(List<ProductData> products) {
        for (ProductData data : products) {
            ProductEntity product = new ProductEntity();
            product.setName(required(data.name(), "product name"));
            product.setPrice(required(data.price(), "price of product " + data.name()));
            productRepository.save(product);
        }
        return products.size();
    }

    /**
     * {@code now}, {@code now+7d} or {@code now-3h} relative to {@code now}, an ISO instant as is, or {@code null}
     * when the value is missing (no limit).
     */
    static Instant resolveTime(String value, Instant now) {
        if (value == null || value.isBlank()) {
            return null;
        }
        Matcher relative = RELATIVE_TIME.matcher(value.trim());
        if (relative.matches()) {
            if (relative.group(1) == null) {
                return now;
            }
            long amount = Long.parseLong(relative.group(2));
            Duration offset = "d".equals(relative.group(3)) ? Duration.ofDays(amount) : Duration.ofHours(amount);
            return "+".equals(relative.group(1)) ? now.plus(offset) : now.minus(offset);
        }
        try {
            return Instant.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalStateException("Time '" + value + "' is neither now, now+Nd, now-Nh nor an ISO instant");
        }
    }

    /** Codes are stored upper case, as the services store them. */
    private static String code(String code, String where) {
        return required(code, "code in " + where).trim().toUpperCase();
    }

    private static <T> T required(T value, String what) {
        if (value == null || (value instanceof String text && text.isBlank())) {
            throw new IllegalStateException("Missing " + what + " in " + DATA_FILE);
        }
        return value;
    }

    private static <T> List<T> listOrEmpty(List<T> list) {
        return list != null ? list : List.of();
    }

    /** What was inserted, per project and in total; rules are also counted by their state at startup. */
    private static final class Counts {
        int environments;
        int qualifiers;
        int features;
        int rules;
        int rulesDisabled;
        int rulesScheduled;
        int rulesExpired;

        void countRule(FeatureRuleEntity rule, Instant now) {
            rules++;
            if (!Boolean.TRUE.equals(rule.getEnabled())) {
                rulesDisabled++;
            } else if (rule.getEffectiveFrom() != null && now.isBefore(rule.getEffectiveFrom())) {
                rulesScheduled++;
            } else if (rule.getEffectiveTo() != null && now.isAfter(rule.getEffectiveTo())) {
                rulesExpired++;
            }
        }

        void add(Counts other) {
            environments += other.environments;
            qualifiers += other.qualifiers;
            features += other.features;
            rules += other.rules;
            rulesDisabled += other.rulesDisabled;
            rulesScheduled += other.rulesScheduled;
            rulesExpired += other.rulesExpired;
        }

        Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("environments", environments);
            map.put("qualifiers", qualifiers);
            map.put("features", features);
            map.put("rules", rules);
            map.put("rulesDisabled", rulesDisabled);
            map.put("rulesScheduled", rulesScheduled);
            map.put("rulesExpired", rulesExpired);
            return map;
        }
    }
}
