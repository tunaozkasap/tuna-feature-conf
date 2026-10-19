package com.tuna.feature.conf.service.evidence;

import com.tuna.feature.conf.service.util.EvidenceMasking;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.LinkedHashMap;
import java.util.Map;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Records which endpoint handles the request and its path variables, so controllers stay free of logging code.
 * Request bodies are recorded by the services, which mask sensitive fields.
 */
@Component
public class HandlerEvidenceInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            s().kv("handler", handler.getClass().getSimpleName());
            return true;
        }
        s().kv("handler", handlerMethod.getBeanType().getSimpleName() + "." + handlerMethod.getMethod().getName());
        Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (route != null) {
            s().kv("route", route);
        }
        recordPathVariables(request);
        return true;
    }

    private static void recordPathVariables(HttpServletRequest request) {
        if (!(request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE) instanceof Map<?, ?> variables)
                || variables.isEmpty()) {
            return;
        }
        Map<String, Object> pathVariables = new LinkedHashMap<>();
        for (Map.Entry<?, ?> variable : variables.entrySet()) {
            String name = String.valueOf(variable.getKey());
            pathVariables.put(name, EvidenceMasking.maskValue(name, variable.getValue()));
        }
        s().kv("pathVariables", pathVariables);
    }
}
