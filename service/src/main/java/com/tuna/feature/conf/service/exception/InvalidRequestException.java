package com.tuna.feature.conf.service.exception;

/**
 * Signals a client error (HTTP 400) detected by the service, such as an invalid search filter.
 * <p>
 * Deliberately not an {@link IllegalArgumentException}: Spring's persistence exception
 * translation wraps those when they are thrown inside repository calls, which would hide
 * the original message.
 */
public class InvalidRequestException extends RuntimeException {
    public InvalidRequestException(String message) {
        super(message);
    }
}
