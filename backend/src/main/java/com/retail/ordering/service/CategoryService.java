package com.retail.ordering.service;

import com.retail.ordering.dto.request.CategoryRequestDto;
import com.retail.ordering.dto.response.CategoryResponseDto;
import com.retail.ordering.entity.Category;
import com.retail.ordering.exception.ResourceNotFoundException;
import com.retail.ordering.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponseDto> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public CategoryResponseDto getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found with id: " + id));
        return toDto(category);
    }

    public CategoryResponseDto createCategory(CategoryRequestDto dto) {
        Category category = Category.builder()
                .name(dto.getName())
                .brand(dto.getBrand())
                .packagingType(dto.getPackagingType())
                .build();
        return toDto(categoryRepository.save(category));
    }

    public CategoryResponseDto updateCategory(Long id, CategoryRequestDto dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found with id: " + id));
        category.setName(dto.getName());
        category.setBrand(dto.getBrand());
        category.setPackagingType(dto.getPackagingType());
        return toDto(categoryRepository.save(category));
    }

    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found with id: " + id);
        }
        categoryRepository.deleteById(id);
    }

    // helper
    public Category getCategoryEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Category not found with id: " + id));
    }

    private CategoryResponseDto toDto(Category category) {
        return CategoryResponseDto.builder()
                .id(category.getId())
                .name(category.getName())
                .brand(category.getBrand())
                .packagingType(category.getPackagingType())
                .build();
    }
}