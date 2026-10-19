package com.tuna.feature.conf.service.evidence;

import com.tuna.feature.conf.service.util.EvidenceMasking;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Entry point of every HTTP request: gives it a request id (taken from {@value #REQUEST_ID_HEADER} when the caller
 * sends a safe one), records the request and the response, and logs the request's evidence exactly once.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestEvidenceFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    /** Request attribute holding the request id, for code that answers the request, such as error responses. */
    public static final String REQUEST_ID_ATTRIBUTE = RequestEvidenceFilter.class.getName() + ".requestId";

    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    private static final String[] RECORDED_HEADERS = {HttpHeaders.ACCEPT, HttpHeaders.USER_AGENT, HttpHeaders.ORIGIN,
            "X-Forwarded-For"};

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.currentTimeMillis();
        String requestId = resolveRequestId(request);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        request.setAttribute(REQUEST_ID_ATTRIBUTE, requestId);
        s().kv("requestId", requestId);
        recordRequest(request);

        String unhandledException = null;
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException ex) {
            // Recorded and rethrown: the container turns it into the response, the evidence must not claim success
            unhandledException = ex.getClass().getName();
            throw ex;
        } finally {
            recordResponse(response, start, unhandledException);
            s().logNow();
        }
    }

    private static String resolveRequestId(HttpServletRequest request) {
        String incoming = request.getHeader(REQUEST_ID_HEADER);
        if (incoming != null && SAFE_REQUEST_ID.matcher(incoming).matches()) {
            return incoming;
        }
        return UUID.randomUUID().toString();
    }

    private static void recordRequest(HttpServletRequest request) {
        s().kv("method", request.getMethod())
           .kv("path", request.getRequestURI())
           .kv("remoteAddr", request.getRemoteAddr());
        Map<String, Object> query = queryParameters(request);
        if (!query.isEmpty()) {
            s().kv("query", query);
        }
        s().kv("headers", recordedHeaders(request));
        s().f("body")
           .kv("contentType", request.getContentType())
           .kv("contentLength", request.getContentLengthLong());
    }

    private static Map<String, Object> queryParameters(HttpServletRequest request) {
        Map<String, Object> query = new LinkedHashMap<>();
        for (Map.Entry<String, String[]> parameter : request.getParameterMap().entrySet()) {
            String[] values = parameter.getValue();
            Object value = values.length == 1 ? values[0] : values;
            query.put(parameter.getKey(), EvidenceMasking.maskValue(parameter.getKey(), value));
        }
        return query;
    }

    private static Map<String, Object> recordedHeaders(HttpServletRequest request) {
        Map<String, Object> headers = new LinkedHashMap<>();
        for (String name : RECORDED_HEADERS) {
            String value = request.getHeader(name);
            if (value != null) {
                headers.put(name, value);
            }
        }
        // Credentials are never written, only whether they were sent
        headers.put("authorizationPresent", request.getHeader(HttpHeaders.AUTHORIZATION) != null);
        headers.put("cookiePresent", request.getHeader(HttpHeaders.COOKIE) != null);
        return headers;
    }

    private static void recordResponse(HttpServletResponse response, long start, String unhandledException) {
        int status = unhandledException != null ? HttpServletResponse.SC_INTERNAL_SERVER_ERROR : response.getStatus();
        if (unhandledException != null) {
            s().root().kv("unhandledException", unhandledException);
        }
        s().root().kv("status", status)
           .kv("severity", severity(status))
           .kv("responseContentType", response.getContentType())
           .kv("durationMs", System.currentTimeMillis() - start);
    }

    /**
     * The level this request would have been logged at: INFO for success, WARN for client errors, ERROR for server
     * errors. The evidence logger writes one line per request, so the level is a queryable fact.
     */
    private static String severity(int status) {
        if (status >= 500) {
            return "ERROR";
        }
        return status >= 400 ? "WARN" : "INFO";
    }
}
