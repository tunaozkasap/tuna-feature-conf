package com.tuna.feature.conf.service.exception;

import org.springframework.http.HttpStatus;

/**
 * Signals a client error (HTTP 400) detected by the service, such as an invalid search filter. The messages are
 * {@code <module>.<error>.technical} and {@code <module>.<error>.customer}; the details go into the context with
 * {@link #with(String, Object)}.
 * <p>
 * Deliberately not an {@link IllegalArgumentException}: Spring's persistence exception
 * translation wraps those when they are thrown inside repository calls, which would hide
 * the original error.
 */
public class InvalidRequestException extends ServiceException {

    public InvalidRequestException(String module, String error) {
        super(moduleKey(module), technicalKey(module, error), customerKey(module, error));
        status(HttpStatus.BAD_REQUEST);
    }
}
