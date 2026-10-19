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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

public final class JpaQueryHelper {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private JpaQueryHelper() {}

    public static Pageable toPageable(PageVo pageVo, List<SortVo> sortVos) {
        boolean validNumber = pageVo != null && pageVo.getPageNumber() >= 0;
        boolean validSize = pageVo != null && pageVo.getPageSize() > 0;
        int pageNumber = validNumber ? pageVo.getPageNumber() : 0;
        int pageSize = validSize ? pageVo.getPageSize() : DEFAULT_PAGE_SIZE;
        s().f("pageRequest")
           .kv("number", pageNumber)
           .kv("size", pageSize)
           .kv("numberDefaulted", !validNumber)
           .kv("sizeDefaulted", !validSize);

        Sort sort = toSort(sortVos);
        return PageRequest.of(pageNumber, pageSize, sort);
    }

    public static Sort toSort(List<SortVo> sortVos) {
        if (sortVos == null || sortVos.isEmpty()) {
            s().kv("sorts", List.of());
            return Sort.unsorted();
        }

        List<Sort.Order> orders = new ArrayList<>(sortVos.size());
        List<String> recordedSorts = new ArrayList<>(sortVos.size());
        int skipped = 0;
        for (SortVo sortVo : sortVos) {
            if (sortVo == null || sortVo.getField() == null || sortVo.getField().isBlank()) {
                skipped++;
                continue;
            }
            Sort.Direction dir = (sortVo.getDirection() == SortDirection.DESC)
                    ? Sort.Direction.DESC
                    : Sort.Direction.ASC;
            orders.add(new Sort.Order(dir, sortVo.getField()));
            recordedSorts.add(sortVo.getField() + " " + dir);
        }
        s().kv("sorts", recordedSorts);
        if (skipped > 0) {
            s().kv("sortsSkippedWithoutField", skipped);
        }

        return orders.isEmpty() ? Sort.unsorted() : Sort.by(orders);
    }

    public static PageResponseVo toPageResponseVo(Page<?> page) {
        if (page == null) {
            s().f("pageResult").kv("pagePresent", false);
            return PageResponseVo.builder().build();
        }
        s().f("pageResult")
           .kv("number", page.getNumber())
           .kv("size", page.getSize())
           .kv("returned", page.getNumberOfElements())
           .kv("totalElements", page.getTotalElements())
           .kv("totalPages", page.getTotalPages());
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
            s().kv("filters", List.of());
            return null;
        }
        s().kv("filters", describeFilters(filters));

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            for (FilterVo filter : filters) {
                if (filter == null) {
                    continue;
                }
                if (filter.getField() == null || filter.getField().isBlank()) {
                    rejectFilter(filter, "missingField");
                    throw new InvalidRequestException("Every filter needs a field");
                }

                Path<?> path = resolvePath(root, filter);

                FilterOperator operator = (filter.getOperator() != null)
                        ? filter.getOperator()
                        : FilterOperator.EQUALS;

                Object val = filter.getValue();
                if (val == null && operator != FilterOperator.IS_NULL && operator != FilterOperator.IS_NOT_NULL) {
                    rejectFilter(filter, "missingValue");
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
                        if (values.isEmpty()) {
                            s().kv("emptyInFilter", filter.getField());
                        }
                        predicates.add(values.isEmpty() ? cb.disjunction() : path.in(values));
                    }
                    case IS_NULL -> predicates.add(cb.isNull(path));
                    case IS_NOT_NULL -> predicates.add(cb.isNotNull(path));
                }
            }

            s().kv("predicateCount", predicates.size());
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static List<Map<String, Object>> describeFilters(List<FilterVo> filters) {
        List<Map<String, Object>> described = new ArrayList<>(filters.size());
        for (FilterVo filter : filters) {
            if (filter != null) {
                described.add(describeFilter(filter));
            }
        }
        return described;
    }

    private static Map<String, Object> describeFilter(FilterVo filter) {
        Map<String, Object> described = new LinkedHashMap<>();
        described.put("field", filter.getField());
        described.put("operator", filter.getOperator());
        described.put("value", EvidenceMasking.maskValue(filter.getField(), filter.getValue()));
        described.put("valueType", filter.getValue() != null ? filter.getValue().getClass().getSimpleName() : null);
        return described;
    }

    private static void rejectFilter(FilterVo filter, String reason) {
        s().f("rejectedFilter")
           .kv("field", filter.getField())
           .kv("operator", filter.getOperator())
           .kv("reason", reason);
    }

    private static Path<?> resolvePath(Root<?> root, FilterVo filter) {
        Path<?> path = root;
        try {
            for (String part : filter.getField().split("\\.")) {
                path = path.get(part);
            }
        } catch (IllegalArgumentException | IllegalStateException ex) {
            rejectFilter(filter, "unknownField");
            throw new InvalidRequestException("Unknown filter field '" + filter.getField() + "'");
        }
        return path;
    }

    @SuppressWarnings("rawtypes")
    private static Comparable comparable(FilterVo filter) {
        if (filter.getValue() instanceof Comparable<?> c) {
            return (Comparable) c;
        }
        rejectFilter(filter, "valueNotComparable");
        throw new InvalidRequestException(
                "Filter on '" + filter.getField() + "' with operator " + filter.getOperator() + " needs a single comparable value");
    }
}
