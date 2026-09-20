package com.tuna.feature.conf.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageVo {
    @Builder.Default
    private int pageNumber = 0;
    @Builder.Default
    private int pageSize = 20;
}
