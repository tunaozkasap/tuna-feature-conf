package com.tuna.feature.conf.persistence.repository;

import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeatureRepository extends JpaRepository<FeatureEntity, Long>, JpaSpecificationExecutor<FeatureEntity> {
    List<FeatureEntity> findByProjectId(Long projectId);
    Optional<FeatureEntity> findByProjectIdAndCode(Long projectId, String code);
    Optional<FeatureEntity> findByCode(String code);
}
