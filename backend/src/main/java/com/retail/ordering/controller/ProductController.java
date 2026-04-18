package com.retail.ordering.controller;

import com.retail.ordering.dto.request.ProductRequestDto;
import com.retail.ordering.dto.response.ApiResponseDto;
import com.retail.ordering.dto.response.ProductResponseDto;
import com.retail.ordering.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<ProductResponseDto>>> getAll() {
        return ResponseEntity.ok(
                ApiResponseDto.success("Products fetched", productService.getAllProducts()));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponseDto<List<ProductResponseDto>>> getByCategory(
            @PathVariable Long categoryId) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Products fetched",
                        productService.getProductsByCategory(categoryId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<ProductResponseDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Product fetched", productService.getProductById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<ProductResponseDto>> create(
            @Valid @RequestBody ProductRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDto.success("Product created", productService.createProduct(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<ProductResponseDto>> update(
            @PathVariable Long id, @Valid @RequestBody ProductRequestDto dto) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Product updated", productService.updateProduct(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponseDto<Void>> delete(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponseDto.success("Product deactivated", null));
    }
}