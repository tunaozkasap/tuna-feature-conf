package com.tuna.feature.conf.service.exception;

import org.springframework.http.HttpStatus;

/**
 * Signals that a resource looked up by one of its fields does not exist (HTTP 404). The context holds the lookup
 * {@code field} and its {@code value}; the messages are {@code <module>.notFound.technical} and
 * {@code <module>.notFound.customer}.
 */
public class ResourceNotFoundException extends ServiceException {

    public ResourceNotFoundException(String module, String field, Object value) {
        super(moduleKey(module), technicalKey(module, "notFound"), customerKey(module, "notFound"));
        status(HttpStatus.NOT_FOUND);
        with("field", field);
        with("value", value);
    }
}
