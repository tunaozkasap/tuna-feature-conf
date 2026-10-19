package com.tuna.feature.conf.service.exception;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.github.tunaozkasap.execlog.ScopedEvidence.ExecutionFact;
import com.tuna.feature.conf.service.config.ErrorResponseProperties;
import com.tuna.feature.conf.service.evidence.RequestEvidenceFilter;
import com.tuna.feature.conf.service.util.EvidenceMasking;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Turns every exception into an {@link ApiErrorResponse}: a {@link ServiceException} as it is, any other exception
 * through an equivalent {@link ServiceException} built here. Each handled exception is recorded in the request's
 * evidence under {@code error}: its type, where it was thrown, the mapped status, the resolved module and technical
 * message, the (masked) context and, for server errors, the stack trace. The evidence always holds the technical
 * message and context, whatever {@code app.errors.include-technical-message} says.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private static final int MAX_STACK_FRAMES = 25;
    private static final int MAX_CAUSE_DEPTH = 10;
    private static final String REQUEST_MODULE = "request";

    private final ErrorMessageResolver messageResolver;
    private final ErrorResponseProperties properties;

    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ApiErrorResponse> handleServiceException(ServiceException ex) {
        return respond(ex, ex);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "noEndpoint")
                .status(HttpStatus.NOT_FOUND)
                .with("requestedMethod", ex.getHttpMethod().name())
                .with("resourcePath", "/" + ex.getResourcePath()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        List<String> invalidFields = new ArrayList<>();
        Map<String, Map<String, String>> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            Map<String, String> details = new LinkedHashMap<>();
            details.put("constraint", error.getCode());
            details.put("message", error.getDefaultMessage());
            fieldErrors.put(error.getField(), details);
            invalidFields.add(error.getField());
        }
        return respond(ex, ServiceException.of(REQUEST_MODULE, "validationFailed")
                .status(HttpStatus.BAD_REQUEST)
                .with("violationCount", fieldErrors.size())
                .with("invalidFields", invalidFields)
                .with("fieldErrors", fieldErrors));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "invalidArgument")
                .status(HttpStatus.BAD_REQUEST)
                .with("reason", ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "unreadableBody")
                .status(HttpStatus.BAD_REQUEST)
                .with("rootCauseType", rootCause(ex).getClass().getName()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "missingParameter")
                .status(HttpStatus.BAD_REQUEST)
                .with("parameter", ex.getParameterName())
                .with("parameterType", ex.getParameterType()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "typeMismatch")
                .status(HttpStatus.BAD_REQUEST)
                .with("parameter", ex.getName())
                .with("requiredType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : null)
                .with("value", String.valueOf(ex.getValue())));
    }

    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<ApiErrorResponse> handleUnknownProperty(PropertyReferenceException ex) {
        return respond(ex, ServiceException.of("search", "unknownProperty")
                .status(HttpStatus.BAD_REQUEST)
                .with("property", ex.getPropertyName())
                .with("entityType", ex.getType().getType().getSimpleName()));
    }

    @ExceptionHandler(InvalidDataAccessApiUsageException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidDataAccess(InvalidDataAccessApiUsageException ex) {
        Throwable rootCause = rootCause(ex);
        if (rootCause instanceof ServiceException serviceException) {
            return respond(ex, serviceException);
        }
        return respond(ex, ServiceException.of("search", "invalidQuery")
                .status(HttpStatus.BAD_REQUEST)
                .with("rootCauseType", rootCause.getClass().getName())
                .with("rootCauseThrownAt", thrownAt(rootCause)));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "methodNotAllowed")
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .with("requestedMethod", ex.getMethod())
                .with("supportedMethods", ex.getSupportedMethods() != null
                        ? Arrays.asList(ex.getSupportedMethods()) : null));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        return respond(ex, ServiceException.of(REQUEST_MODULE, "unsupportedMediaType")
                .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .with("contentType", ex.getContentType() != null ? ex.getContentType().toString() : null)
                .with("supportedMediaTypes", ex.getSupportedMediaTypes().toString()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        ServiceException error = ServiceException.of("data", "integrityViolation")
                .status(HttpStatus.CONFLICT)
                .with("rootCauseType", ex.getMostSpecificCause().getClass().getName());
        if (ex.getCause() instanceof ConstraintViolationException constraintViolation) {
            error.with("constraint", constraintIdentifier(constraintViolation.getConstraintName()));
        }
        if (ex.getMostSpecificCause() instanceof SQLException sqlException) {
            error.with("sqlState", sqlException.getSQLState()).with("sqlErrorCode", sqlException.getErrorCode());
        }
        return respond(ex, error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex) {
        Throwable rootCause = rootCause(ex);
        ResponseEntity<ApiErrorResponse> response = respond(ex, ServiceException.of("service", "unexpected")
                .with("exceptionType", ex.getClass().getName())
                .with("thrownAt", thrownAt(ex)));
        // Exception messages may carry SQL or data: evidence only, never the response
        s().root().f("error")
           .kv("message", ex.getMessage())
           .kv("causeChain", causeChain(ex))
           .kv("rootCauseMessage", rootCause.getMessage())
           .kv("stackTrace", stackFrames(rootCause));
        return response;
    }

    /**
     * Records the error and answers with its JSON. {@code ex} is the exception that was thrown, {@code error} the
     * {@link ServiceException} describing it (the same instance when a {@link ServiceException} was thrown).
     */
    private ResponseEntity<ApiErrorResponse> respond(Exception ex, ServiceException error) {
        HttpStatus status = error.getStatus();
        ObjectNode context = error.getContext();
        String module = messageResolver.resolve(error.getModuleNameBundleKey(), context);
        String technicalMessage = messageResolver.resolve(error.getTechnicalMessageBundleKey(), context);
        String customerMessage = messageResolver.resolve(error.getCustomerMessageBundleKey(), context);

        recordError(ex, status)
                .kv("module", module)
                .kv("technicalMessageKey", error.getTechnicalMessageBundleKey())
                .kv("technicalMessage", technicalMessage)
                .kv("context", EvidenceMasking.maskJson(context));

        boolean includeTechnical = properties.includeTechnicalMessage();
        ApiErrorResponse body = new ApiErrorResponse(status.value(), module, customerMessage,
                includeTechnical ? technicalMessage : null,
                includeTechnical ? context : null,
                requestId(),
                Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }

    private static ExecutionFact recordError(Exception ex, HttpStatus status) {
        // Written to the evidence root: the parents opened by the failed step are already closed
        return s().root().f("error")
                .kv("exceptionType", ex.getClass().getName())
                .kv("thrownAt", thrownAt(ex))
                .kv("httpStatus", status.value())
                .kv("severity", status.is5xxServerError() ? "ERROR" : "WARN");
    }

    private static String requestId() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }
        Object requestId = attributes.getAttribute(RequestEvidenceFilter.REQUEST_ID_ATTRIBUTE,
                RequestAttributes.SCOPE_REQUEST);
        return requestId != null ? requestId.toString() : null;
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
}
