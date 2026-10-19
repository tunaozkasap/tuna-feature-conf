package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.ProductDto;
import com.tuna.feature.conf.model.dto.ProductDto.CreateRequest;
import com.tuna.feature.conf.model.dto.ProductDto.Response;
import com.tuna.feature.conf.model.dto.ProductDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.ProductEntity;
import com.tuna.feature.conf.persistence.repository.ProductRepository;
import com.tuna.feature.conf.service.exception.InvalidRequestException;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchProducts")) {
            Specification<ProductEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<ProductEntity> page = (spec != null)
                    ? productRepository.findAll(spec, pageable)
                    : productRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (ProductEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getProductById(Long id) {
        try (var get = s().parent("getProduct")) {
            s().kv("productId", id);
            ProductEntity product = productRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("product", "id", id));
            s().kv("found", true);
            return CrudResponse.of(toResponse(product));
        }
    }

    public CrudResponse<Response> createProduct(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createProduct")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("product", "missingData");
            }
            s().f("input").kv("name", data.getName()).kv("price", data.getPrice());

            ProductEntity product = new ProductEntity();
            product.setName(data.getName());
            product.setPrice(data.getPrice());

            ProductEntity saved = productRepository.save(product);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "Product created successfully");
        }
    }

    public CrudResponse<Response> updateProduct(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateProduct")) {
            s().kv("productId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("product", "missingData");
            }
            s().f("input").kv("name", data.getName()).kv("price", data.getPrice());

            ProductEntity product = productRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("product", "id", id));
            s().kv("found", true);

            List<String> changedFields = new ArrayList<>();
            if (data.getName() != null && !data.getName().isBlank()) {
                product.setName(data.getName());
                changedFields.add("name");
            }
            if (data.getPrice() != null) {
                product.setPrice(data.getPrice());
                changedFields.add("price");
            }
            s().kv("changedFields", changedFields);

            ProductEntity saved = productRepository.save(product);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "Product updated successfully");
        }
    }

    public CrudResponse<Void> deleteProduct(Long id) {
        try (var delete = s().parent("deleteProduct")) {
            s().kv("productId", id);
            if (!productRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("product", "id", id);
            }
            s().kv("found", true);
            productRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("Product deleted successfully")
                    .build();
        }
    }

    private Response toResponse(ProductEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .name(entity.getName())
                .price(entity.getPrice())
                .build();
    }
}
