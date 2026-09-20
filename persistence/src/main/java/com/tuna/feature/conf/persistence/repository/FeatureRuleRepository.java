package com.tuna.feature.conf.persistence.repository;

import com.tuna.feature.conf.persistence.entity.FeatureRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeatureRuleRepository extends JpaRepository<FeatureRuleEntity, Long>, JpaSpecificationExecutor<FeatureRuleEntity> {
    List<FeatureRuleEntity> findByFeatureId(Long featureId);
    List<FeatureRuleEntity> findByFeatureProjectId(Long projectId);
    List<FeatureRuleEntity> findByFeatureIdAndEnabledTrue(Long featureId);
}
