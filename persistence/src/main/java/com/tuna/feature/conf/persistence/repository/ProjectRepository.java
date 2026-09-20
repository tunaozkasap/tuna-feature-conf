package com.tuna.feature.conf.persistence.repository;

import com.tuna.feature.conf.persistence.entity.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, Long>, JpaSpecificationExecutor<ProjectEntity> {
    Optional<ProjectEntity> findByName(String name);
}
