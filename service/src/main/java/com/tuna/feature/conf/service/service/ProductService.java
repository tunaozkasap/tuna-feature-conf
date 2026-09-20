package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.ProductDto;
import com.tuna.feature.conf.model.dto.ProductDto.CreateRequest;
import com.tuna.feature.conf.model.dto.ProductDto.Response;
import com.tuna.feature.conf.model.dto.ProductDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.ProductEntity;
import com.tuna.feature.conf.persistence.repository.ProductRepository;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<ProductEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<ProductEntity> page = (spec != null)
                ? productRepository.findAll(spec, pageable)
                : productRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getProductById(Long id) {
        ProductEntity product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return CrudResponse.of(toResponse(product));
    }

    public CrudResponse<Response> createProduct(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Product payload data is required");
        }

        ProductEntity product = new ProductEntity();
        product.setName(data.getName());
        product.setPrice(data.getPrice());

        ProductEntity saved = productRepository.save(product);
        return CrudResponse.of(toResponse(saved), "Product created successfully");
    }

    public CrudResponse<Response> updateProduct(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Product payload data is required");
        }

        ProductEntity product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        if (data.getName() != null && !data.getName().isBlank()) {
            product.setName(data.getName());
        }
        if (data.getPrice() != null) {
            product.setPrice(data.getPrice());
        }

        ProductEntity saved = productRepository.save(product);
        return CrudResponse.of(toResponse(saved), "Product updated successfully");
    }

    public CrudResponse<Void> deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", "id", id);
        }
        productRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("Product deleted successfully")
                .build();
    }

    private Response toResponse(ProductEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .name(entity.getName())
                .price(entity.getPrice())
                .build();
    }
}
