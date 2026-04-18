package com.retail.ordering.service;

import com.retail.ordering.dto.request.ProductRequestDto;
import com.retail.ordering.dto.response.CategoryResponseDto;
import com.retail.ordering.dto.response.ProductResponseDto;
import com.retail.ordering.entity.Category;
import com.retail.ordering.entity.Inventory;
import com.retail.ordering.entity.Product;
import com.retail.ordering.exception.ResourceNotFoundException;
import com.retail.ordering.repository.InventoryRepository;
import com.retail.ordering.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final CategoryService categoryService;

    public List<ProductResponseDto> getAllProducts() {
        return productRepository.findByActiveTrue()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<ProductResponseDto> getProductsByCategory(Long categoryId) {
        Category category = categoryService.getCategoryEntityById(categoryId);
        return productRepository.findByCategoryAndActiveTrue(category)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ProductResponseDto getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));
        return toDto(product);
    }

    @Transactional
    public ProductResponseDto createProduct(ProductRequestDto dto) {
        Category category = categoryService.getCategoryEntityById(dto.getCategoryId());

        Product product = Product.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .category(category)
                .imageUrl(dto.getImageUrl())
                .stockQuantity(dto.getStockQuantity())
                .active(true)
                .build();

        Product saved = productRepository.save(product);

        // auto create inventory record
        Inventory inventory = Inventory.builder()
                .product(saved)
                .availableStock(dto.getStockQuantity())
                .build();
        inventoryRepository.save(inventory);

        return toDto(saved);
    }

    @Transactional
    public ProductResponseDto updateProduct(Long id, ProductRequestDto dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));

        Category category = categoryService.getCategoryEntityById(dto.getCategoryId());

        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setPrice(dto.getPrice());
        product.setCategory(category);
        product.setImageUrl(dto.getImageUrl());
        product.setStockQuantity(dto.getStockQuantity());

        return toDto(productRepository.save(product));
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));
        product.setActive(false);
        productRepository.save(product);
    }

    // helper used by other services
    public Product getProductEntityById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));
    }

    private ProductResponseDto toDto(Product product) {
        CategoryResponseDto categoryDto = null;
        if (product.getCategory() != null) {
            categoryDto = CategoryResponseDto.builder()
                    .id(product.getCategory().getId())
                    .name(product.getCategory().getName())
                    .brand(product.getCategory().getBrand())
                    .packagingType(product.getCategory().getPackagingType())
                    .build();
        }
        return ProductResponseDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .stockQuantity(product.getStockQuantity())
                .active(product.getActive())
                .category(categoryDto)
                .build();
    }
}