package com.tuna.feature.conf.service.util;

import com.tuna.feature.conf.model.vo.*;
import com.tuna.feature.conf.service.exception.InvalidRequestException;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
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

    /**
     * Builds a JPA specification that ANDs all given filters together.
     *
     * @throws InvalidRequestException if a filter has no field, refers to an unknown field,
     *                                 or has a value that does not fit its operator
     */
    public static <T> Specification<T> toSpecification(List<FilterVo> filters) {
        if (filters == null || filters.isEmpty()) {
            return null;
        }

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            for (FilterVo filter : filters) {
                if (filter == null) {
                    continue;
                }
                if (filter.getField() == null || filter.getField().isBlank()) {
                    throw new InvalidRequestException("Every filter needs a field");
                }

                Path<?> path = resolvePath(root, filter.getField());

                FilterOperator operator = (filter.getOperator() != null)
                        ? filter.getOperator()
                        : FilterOperator.EQUALS;

                Object val = filter.getValue();
                if (val == null && operator != FilterOperator.IS_NULL && operator != FilterOperator.IS_NOT_NULL) {
                    throw new InvalidRequestException(
                            "Filter on '" + filter.getField() + "' with operator " + operator + " needs a value");
                }

                switch (operator) {
                    case EQUALS -> predicates.add(cb.equal(path, val));
                    case NOT_EQUALS -> predicates.add(cb.notEqual(path, val));
                    case CONTAINS -> predicates.add(cb.like(cb.lower(path.as(String.class)), "%" + val.toString().toLowerCase() + "%"));
                    case STARTS_WITH -> predicates.add(cb.like(cb.lower(path.as(String.class)), val.toString().toLowerCase() + "%"));
                    case ENDS_WITH -> predicates.add(cb.like(cb.lower(path.as(String.class)), "%" + val.toString().toLowerCase()));
                    case GREATER_THAN -> predicates.add(cb.greaterThan(path.as(Comparable.class), comparable(filter)));
                    case LESS_THAN -> predicates.add(cb.lessThan(path.as(Comparable.class), comparable(filter)));
                    case GREATER_THAN_OR_EQUAL -> predicates.add(cb.greaterThanOrEqualTo(path.as(Comparable.class), comparable(filter)));
                    case LESS_THAN_OR_EQUAL -> predicates.add(cb.lessThanOrEqualTo(path.as(Comparable.class), comparable(filter)));
                    case IN -> {
                        Collection<?> values = (val instanceof Collection<?> coll) ? coll : List.of(val);
                        // An empty IN list matches nothing rather than everything
                        predicates.add(values.isEmpty() ? cb.disjunction() : path.in(values));
                    }
                    case IS_NULL -> predicates.add(cb.isNull(path));
                    case IS_NOT_NULL -> predicates.add(cb.isNotNull(path));
                }
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Path<?> resolvePath(Root<?> root, String field) {
        Path<?> path = root;
        try {
            for (String part : field.split("\\.")) {
                path = path.get(part);
            }
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new InvalidRequestException("Unknown filter field '" + field + "'");
        }
        return path;
    }

    @SuppressWarnings("rawtypes")
    private static Comparable comparable(FilterVo filter) {
        if (filter.getValue() instanceof Comparable<?> c) {
            return (Comparable) c;
        }
        throw new InvalidRequestException(
                "Filter on '" + filter.getField() + "' with operator " + filter.getOperator() + " needs a single comparable value");
    }
}
