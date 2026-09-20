package com.tuna.feature.conf.persistence.repository;

import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeatureQualifierRepository extends JpaRepository<FeatureQualifierEntity, Long>, JpaSpecificationExecutor<FeatureQualifierEntity> {
    List<FeatureQualifierEntity> findByProjectId(Long projectId);
    List<FeatureQualifierEntity> findByProjectIdOrderByPriorityDesc(Long projectId);
    Optional<FeatureQualifierEntity> findByProjectIdAndCode(Long projectId, String code);
}
