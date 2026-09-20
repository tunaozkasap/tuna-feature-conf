package com.tuna.feature.conf.persistence.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldNameConstants;

/**
 * Represents a catalog product entity within the application domain.
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "products")
public class ProductEntity {

    /**
     * Unique identifier for the product.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Name of the product.
     */
    private String name;

    /**
     * Unit price of the product.
     */
    private Double price;
}
