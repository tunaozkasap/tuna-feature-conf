package com.tuna.feature.conf.persistence.repository;

import com.tuna.feature.conf.persistence.entity.EnvironmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnvironmentRepository extends JpaRepository<EnvironmentEntity, Long>, JpaSpecificationExecutor<EnvironmentEntity> {
    List<EnvironmentEntity> findByProjectId(Long projectId);
    Optional<EnvironmentEntity> findByProjectIdAndCode(Long projectId, String code);
    boolean existsByProjectIdAndCode(Long projectId, String code);
}
