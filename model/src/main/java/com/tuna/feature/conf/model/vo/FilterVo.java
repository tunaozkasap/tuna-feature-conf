package com.tuna.feature.conf.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilterVo {
    private String field;
    @Builder.Default
    private FilterOperator operator = FilterOperator.EQUALS;
    private Object value;
}
