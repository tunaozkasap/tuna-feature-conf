package com.tuna.feature.conf.service.util;

import com.tuna.feature.conf.model.vo.*;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public final class JpaQueryHelper {

    private JpaQueryHelper() {}

    public static Pageable toPageable(PageVo pageVo, List<SortVo> sortVos) {
        int pageNumber = (pageVo != null && pageVo.getPageNumber() >= 0) ? pageVo.getPageNumber() : 0;
        int pageSize = (pageVo != null && pageVo.getPageSize() > 0) ? pageVo.getPageSize() : 20;

        Sort sort = toSort(sortVos);
        return PageRequest.of(pageNumber, pageSize, sort);
    }

    public static Sort toSort(List<SortVo> sortVos) {
        if (sortVos == null || sortVos.isEmpty()) {
            return Sort.unsorted();
        }

        List<Sort.Order> orders = sortVos.stream()
                .filter(s -> s.getField() != null && !s.getField().isBlank())
                .map(s -> {
                    Sort.Direction dir = (s.getDirection() == SortDirection.DESC)
                            ? Sort.Direction.DESC
                            : Sort.Direction.ASC;
                    return new Sort.Order(dir, s.getField());
                })
                .toList();

        return orders.isEmpty() ? Sort.unsorted() : Sort.by(orders);
    }

    public static PageResponseVo toPageResponseVo(Page<?> page) {
        if (page == null) {
            return PageResponseVo.builder().build();
        }
        return PageResponseVo.builder()
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }

    public static <T> Specification<T> toSpecification(List<FilterVo> filters) {
        if (filters == null || filters.isEmpty()) {
            return null;
        }

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            for (FilterVo filter : filters) {
                if (filter == null || filter.getField() == null || filter.getField().isBlank()) {
                    continue;
                }

                String[] fieldParts = filter.getField().split("\\.");
                Path<?> path = root;
                for (String part : fieldParts) {
                    path = path.get(part);
                }

                FilterOperator operator = (filter.getOperator() != null)
                        ? filter.getOperator()
                        : FilterOperator.EQUALS;

                Object val = filter.getValue();

                switch (operator) {
                    case EQUALS -> {
                        if (val != null) {
                            predicates.add(cb.equal(path, val));
                        }
                    }
                    case NOT_EQUALS -> {
                        if (val != null) {
                            predicates.add(cb.notEqual(path, val));
                        }
                    }
                    case CONTAINS -> {
                        if (val != null) {
                            predicates.add(cb.like(cb.lower(path.as(String.class)), "%" + val.toString().toLowerCase() + "%"));
                        }
                    }
                    case STARTS_WITH -> {
                        if (val != null) {
                            predicates.add(cb.like(cb.lower(path.as(String.class)), val.toString().toLowerCase() + "%"));
                        }
                    }
                    case ENDS_WITH -> {
                        if (val != null) {
                            predicates.add(cb.like(cb.lower(path.as(String.class)), "%" + val.toString().toLowerCase()));
                        }
                    }
                    case GREATER_THAN -> {
                        if (val instanceof Comparable) {
                            predicates.add(cb.greaterThan(path.as(Comparable.class), (Comparable) val));
                        }
                    }
                    case LESS_THAN -> {
                        if (val instanceof Comparable) {
                            predicates.add(cb.lessThan(path.as(Comparable.class), (Comparable) val));
                        }
                    }
                    case GREATER_THAN_OR_EQUAL -> {
                        if (val instanceof Comparable) {
                            predicates.add(cb.greaterThanOrEqualTo(path.as(Comparable.class), (Comparable) val));
                        }
                    }
                    case LESS_THAN_OR_EQUAL -> {
                        if (val instanceof Comparable) {
                            predicates.add(cb.lessThanOrEqualTo(path.as(Comparable.class), (Comparable) val));
                        }
                    }
                    case IN -> {
                        if (val instanceof Collection<?> coll && !coll.isEmpty()) {
                            predicates.add(path.in(coll));
                        }
                    }
                    case IS_NULL -> predicates.add(cb.isNull(path));
                    case IS_NOT_NULL -> predicates.add(cb.isNotNull(path));
                }
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
