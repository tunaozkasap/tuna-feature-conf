package com.tuna.feature.conf.model.crud;

import com.tuna.feature.conf.model.vo.FilterVo;
import com.tuna.feature.conf.model.vo.PageVo;
import com.tuna.feature.conf.model.vo.SortVo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrudRequest<T> {
    /**
     * Payload of the request. Validated (including its nested constraints) wherever
     * the controller parameter is annotated with {@code @Valid}.
     */
    @Valid
    @NotNull(message = "Request data is required")
    private T data;
    @Builder.Default
    private PageVo page = new PageVo();
    @Builder.Default
    private List<SortVo> sorts = new ArrayList<>();
    @Builder.Default
    private List<FilterVo> filters = new ArrayList<>();

    public static <T> CrudRequest<T> of(T data) {
        return CrudRequest.<T>builder()
                .data(data)
                .build();
    }
}
