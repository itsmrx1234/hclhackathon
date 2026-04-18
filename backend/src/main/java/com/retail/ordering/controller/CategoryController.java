package com.retail.ordering.controller;

import com.retail.ordering.dto.request.CategoryRequestDto;
import com.retail.ordering.dto.response.ApiResponseDto;
import com.retail.ordering.dto.response.CategoryResponseDto;
import com.retail.ordering.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<CategoryResponseDto>>> getAll() {
        return ResponseEntity.ok(
                ApiResponseDto.success("Categories fetched", categoryService.getAllCategories()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<CategoryResponseDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Category fetched", categoryService.getCategoryById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<CategoryResponseDto>> create(
            @Valid @RequestBody CategoryRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDto.success("Category created", categoryService.createCategory(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<CategoryResponseDto>> update(
            @PathVariable Long id, @Valid @RequestBody CategoryRequestDto dto) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Category updated", categoryService.updateCategory(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponseDto<Void>> delete(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponseDto.success("Category deleted", null));
    }
}