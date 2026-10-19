package com.tuna.feature.conf.service.util;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Masks values before they are written to the execution evidence, so secrets and personal data never reach the logs.
 */
public final class EvidenceMasking {

    public static final String MASK = "***";

    private static final String[] SECRET_NAME_PARTS = {"password", "pwd", "secret", "token", "apikey", "api-key",
            "api_key", "authorization", "cookie", "credential"};
    private static final Pattern JDBC_PASSWORD = Pattern.compile("(?i)(password|pwd)=[^;&]*");
    private static final Pattern URL_USER_INFO = Pattern.compile("//([^:/@]+):[^@/]*@");

    private EvidenceMasking() {}

    /**
     * The value to write for a named input (header, query parameter, filter field, qualifier code): secrets are
     * replaced by {@link #MASK}, e-mail addresses keep only their first character and domain.
     */
    public static Object maskValue(String name, Object value) {
        if (value == null || name == null) {
            return value;
        }
        String lowerName = name.toLowerCase(Locale.ROOT);
        if (isSecretName(lowerName)) {
            return MASK;
        }
        if (lowerName.contains("mail")) {
            return value instanceof String text ? maskEmail(text) : MASK;
        }
        return value;
    }

    /**
     * {@code john.doe@example.com} becomes {@code j***@example.com}; anything that is not an address is fully masked.
     */
    public static String maskEmail(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return MASK;
        }
        return email.charAt(0) + MASK + email.substring(at);
    }

    /**
     * Removes passwords from a JDBC/URL connection string, both {@code password=...} parameters and
     * {@code user:password@host} user info.
     */
    public static String maskUrl(String url) {
        if (url == null) {
            return null;
        }
        String masked = JDBC_PASSWORD.matcher(url).replaceAll("$1=" + MASK);
        return URL_USER_INFO.matcher(masked).replaceAll("//$1:" + MASK + "@");
    }

    private static boolean isSecretName(String lowerName) {
        for (String part : SECRET_NAME_PARTS) {
            if (lowerName.contains(part)) {
                return true;
            }
        }
        return false;
    }
}
