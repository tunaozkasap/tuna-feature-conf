package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.ProductDto.CreateRequest;
import com.tuna.feature.conf.model.dto.ProductDto.Response;
import com.tuna.feature.conf.model.dto.ProductDto.UpdateRequest;
import com.tuna.feature.conf.service.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Product Management", description = "Endpoints for searching, creating, updating, and deleting products")
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @Operation(summary = "Search products", description = "Searches products with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved product search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchProducts(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(productService.search(req));
    }

    @Operation(summary = "Get all products", description = "Retrieves a paginated list of all products")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of products")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllProducts() {
        return ResponseEntity.ok(productService.search(new CrudRequest<>()));
    }

    @Operation(summary = "Get product by ID", description = "Retrieves product details by its unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Product found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getProductById(
            @Parameter(description = "ID of the product to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @Operation(summary = "Create product", description = "Creates a new product record")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Product created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createProduct(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request));
    }

    @Operation(summary = "Update product", description = "Updates an existing product by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Product updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateProduct(
            @Parameter(description = "ID of the product to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @Operation(summary = "Delete product", description = "Deletes a product by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Product deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteProduct(
            @Parameter(description = "ID of the product to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(productService.deleteProduct(id));
    }
}
