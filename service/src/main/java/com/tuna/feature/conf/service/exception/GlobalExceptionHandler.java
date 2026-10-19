package com.tuna.feature.conf.service.exception;

import com.github.tunaozkasap.execlog.ScopedEvidence.ExecutionFact;
import com.tuna.feature.conf.service.util.EvidenceMasking;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Maps exceptions to error responses and records each handled exception in the request's evidence under
 * {@code error}: its type, where it was thrown, the mapped status and, for server errors, the stack trace.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final int MAX_STACK_FRAMES = 25;
    private static final int MAX_CAUSE_DEPTH = 10;

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        ExecutionFact error = recordError(ex, HttpStatus.NOT_FOUND);
        if (ex.getResourceName() != null) {
            error.kv("resource", ex.getResourceName())
                 .kv("field", ex.getFieldName())
                 .kv("value", EvidenceMasking.maskValue(ex.getFieldName(), ex.getFieldValue()));
        }
        return error(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        recordError(ex, HttpStatus.NOT_FOUND)
                .kv("requestedMethod", ex.getHttpMethod().name())
                .kv("resourcePath", ex.getResourcePath());
        return error(HttpStatus.NOT_FOUND, "Not Found", "No endpoint " + ex.getHttpMethod() + " /" + ex.getResourcePath());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        Map<String, String> violatedConstraints = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
            violatedConstraints.put(error.getField(), error.getCode());
        }
        recordError(ex, HttpStatus.BAD_REQUEST)
                .kv("violationCount", violatedConstraints.size())
                .kv("violatedConstraints", violatedConstraints);
        ResponseEntity<Map<String, Object>> response =
                error(HttpStatus.BAD_REQUEST, "Validation Failed", "Request validation failed");
        response.getBody().put("validationErrors", errors);
        return response;
    }

    @ExceptionHandler({IllegalArgumentException.class, InvalidRequestException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(RuntimeException ex) {
        recordError(ex, HttpStatus.BAD_REQUEST);
        return error(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        recordError(ex, HttpStatus.BAD_REQUEST)
                .kv("rootCauseType", rootCause(ex).getClass().getName());
        return error(HttpStatus.BAD_REQUEST, "Bad Request", "Request body is missing or is not valid JSON for this endpoint");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException ex) {
        recordError(ex, HttpStatus.BAD_REQUEST)
                .kv("parameter", ex.getParameterName())
                .kv("parameterType", ex.getParameterType());
        return error(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        recordError(ex, HttpStatus.BAD_REQUEST)
                .kv("parameter", ex.getName())
                .kv("requiredType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : null)
                .kv("value", EvidenceMasking.maskValue(ex.getName(), String.valueOf(ex.getValue())));
        return error(HttpStatus.BAD_REQUEST, "Bad Request",
                String.format("Invalid value '%s' for parameter '%s'", ex.getValue(), ex.getName()));
    }

    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<Map<String, Object>> handleUnknownProperty(PropertyReferenceException ex) {
        recordError(ex, HttpStatus.BAD_REQUEST)
                .kv("unknownProperty", ex.getPropertyName())
                .kv("entityType", ex.getType().getType().getSimpleName());
        return error(HttpStatus.BAD_REQUEST, "Bad Request", "Unknown field '" + ex.getPropertyName() + "' in sort");
    }

    @ExceptionHandler(InvalidDataAccessApiUsageException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidDataAccess(InvalidDataAccessApiUsageException ex) {
        Throwable rootCause = rootCause(ex);
        recordError(ex, HttpStatus.BAD_REQUEST)
                .kv("rootCauseType", rootCause.getClass().getName())
                .kv("rootCauseThrownAt", thrownAt(rootCause));
        return error(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid query: check search fields and values");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        recordError(ex, HttpStatus.METHOD_NOT_ALLOWED)
                .kv("requestedMethod", ex.getMethod())
                .kv("supportedMethods", ex.getSupportedMethods());
        return error(HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed", ex.getMessage());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        recordError(ex, HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .kv("contentType", ex.getContentType() != null ? ex.getContentType().toString() : null)
                .kv("supportedMediaTypes", ex.getSupportedMediaTypes().toString());
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported Media Type", ex.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        ExecutionFact error = recordError(ex, HttpStatus.CONFLICT)
                .kv("rootCauseType", ex.getMostSpecificCause().getClass().getName());
        if (ex.getCause() instanceof ConstraintViolationException constraintViolation) {
            error.kv("constraint", constraintIdentifier(constraintViolation.getConstraintName()));
        }
        if (ex.getMostSpecificCause() instanceof SQLException sqlException) {
            error.kv("sqlState", sqlException.getSQLState()).kv("sqlErrorCode", sqlException.getErrorCode());
        }
        return error(HttpStatus.CONFLICT, "Conflict",
                "The request conflicts with existing data (duplicate value or record still in use)");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        Throwable rootCause = rootCause(ex);
        recordError(ex, HttpStatus.INTERNAL_SERVER_ERROR)
                .kv("message", ex.getMessage())
                .kv("causeChain", causeChain(ex))
                .kv("rootCauseMessage", rootCause.getMessage())
                .kv("stackTrace", stackFrames(rootCause));
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred");
    }

    private static ExecutionFact recordError(Exception ex, HttpStatus status) {
        // Written to the evidence root: the parents opened by the failed step are already closed
        return s().root().f("error")
                .kv("exceptionType", ex.getClass().getName())
                .kv("thrownAt", thrownAt(ex))
                .kv("httpStatus", status.value())
                .kv("severity", status.is5xxServerError() ? "ERROR" : "WARN");
    }

    /**
     * Some drivers (e.g. H2) report the whole violation text as constraint name; keep only the leading identifier.
     */
    private static String constraintIdentifier(String constraintName) {
        if (constraintName == null) {
            return null;
        }
        String identifier = constraintName.strip();
        if (identifier.startsWith("\"")) {
            identifier = identifier.substring(1);
        }
        int end = 0;
        while (end < identifier.length() && (Character.isLetterOrDigit(identifier.charAt(end))
                || identifier.charAt(end) == '_' || identifier.charAt(end) == '.')) {
            end++;
        }
        return identifier.substring(0, end);
    }

    private static String thrownAt(Throwable throwable) {
        StackTraceElement[] stackTrace = throwable.getStackTrace();
        return stackTrace.length == 0 ? null : frame(stackTrace[0]);
    }

    private static String frame(StackTraceElement element) {
        return element.getClassName() + "." + element.getMethodName() + ":" + element.getLineNumber();
    }

    private static List<String> stackFrames(Throwable throwable) {
        StackTraceElement[] stackTrace = throwable.getStackTrace();
        int frameCount = Math.min(stackTrace.length, MAX_STACK_FRAMES);
        List<String> frames = new ArrayList<>(frameCount);
        for (int i = 0; i < frameCount; i++) {
            frames.add(frame(stackTrace[i]));
        }
        return frames;
    }

    private static List<String> causeChain(Throwable throwable) {
        List<String> chain = new ArrayList<>();
        Throwable current = throwable;
        while (current != null && chain.size() < MAX_CAUSE_DEPTH) {
            chain.add(current.getClass().getName());
            current = current.getCause();
        }
        return chain;
    }

    private static Throwable rootCause(Throwable throwable) {
        Throwable current = throwable;
        int depth = 0;
        while (current.getCause() != null && current.getCause() != current && depth < MAX_CAUSE_DEPTH) {
            current = current.getCause();
            depth++;
        }
        return current;
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
