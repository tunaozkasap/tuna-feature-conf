package com.tuna.feature.conf.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SortVo {
    private String field;
    @Builder.Default
    private SortDirection direction = SortDirection.ASC;
}
