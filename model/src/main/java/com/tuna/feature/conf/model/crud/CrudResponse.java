package com.tuna.feature.conf.model.crud;

import com.tuna.feature.conf.model.vo.PageResponseVo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrudResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private List<T> items;
    private PageResponseVo page;
    @Builder.Default
    private Instant timestamp = Instant.now();

    public static <T> CrudResponse<T> of(T data) {
        return CrudResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> CrudResponse<T> of(T data, String message) {
        return CrudResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .build();
    }

    public static <T> CrudResponse<T> of(List<T> items, PageResponseVo page) {
        return CrudResponse.<T>builder()
                .success(true)
                .items(items)
                .page(page)
                .build();
    }

    public static <T> CrudResponse<T> of(List<T> items) {
        return CrudResponse.<T>builder()
                .success(true)
                .items(items)
                .build();
    }

    public static <T> CrudResponse<T> error(String message) {
        return CrudResponse.<T>builder()
                .success(false)
                .message(message)
                .build();
    }
}
