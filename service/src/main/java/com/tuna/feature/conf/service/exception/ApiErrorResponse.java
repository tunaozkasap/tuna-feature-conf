package com.tuna.feature.conf.service.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * The JSON body of every error response. {@code technicalMessage} and {@code context} are left out entirely when
 * {@code app.errors.include-technical-message} is false.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
        int status,
        String module,
        String message,
        String technicalMessage,
        ObjectNode context,
        String requestId,
        String timestamp) {
}
