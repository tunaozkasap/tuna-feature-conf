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
 * Represents a user entity within the application domain.
 * <p>
 * Can serve as a system user or as a targeting subject for feature flag evaluations.
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "users")
public class UserEntity {

    /**
     * Unique identifier for the user.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique username or login identifier.
     */
    private String username;

    /**
     * Email address of the user.
     */
    private String email;
}
