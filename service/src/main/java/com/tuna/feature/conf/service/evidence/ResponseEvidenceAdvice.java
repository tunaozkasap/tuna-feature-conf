package com.tuna.feature.conf.service.evidence;

import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.vo.PageResponseVo;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Records the outcome of every endpoint that answers with a {@link CrudResponse}: success flag, whether a single
 * item was returned, and the size of a returned list.
 */
@RestControllerAdvice
public class ResponseEvidenceAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType, ServerHttpRequest request,
            ServerHttpResponse response) {
        if (body instanceof CrudResponse<?> crudResponse) {
            recordCrudResponse(crudResponse);
        }
        return body;
    }

    private static void recordCrudResponse(CrudResponse<?> crudResponse) {
        var responseFact = s().root().f("response")
                .kv("success", crudResponse.isSuccess())
                .kv("hasData", crudResponse.getData() != null);
        if (crudResponse.getItems() != null) {
            responseFact.kv("itemCount", crudResponse.getItems().size());
        }
        PageResponseVo page = crudResponse.getPage();
        if (page != null) {
            responseFact.kv("pageNumber", page.getPageNumber()).kv("totalElements", page.getTotalElements());
        }
    }
}
