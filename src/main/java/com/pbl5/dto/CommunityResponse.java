package com.pbl5.dto;

import java.time.LocalDateTime;

public class CommunityResponse {
    private Long id;
    private String name;
    private String description;
    private String avatarUrl;
    private String coverUrl;
    private Boolean isPrivate;
    private Boolean requireApproval;
    private Boolean requirePostApproval;
    private LocalDateTime createdAt;
    private Long creatorId;
    private String creatorName;
    private String membershipStatus;
    private String membershipRole;

    public CommunityResponse() {}

    public CommunityResponse(Long id, String name, String description, String avatarUrl, String coverUrl,
                             Boolean isPrivate, Boolean requireApproval, Boolean requirePostApproval, LocalDateTime createdAt,
                             Long creatorId, String creatorName) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.avatarUrl = avatarUrl;
        this.coverUrl = coverUrl;
        this.isPrivate = isPrivate;
        this.requireApproval = requireApproval;
        this.requirePostApproval = requirePostApproval;
        this.createdAt = createdAt;
        this.creatorId = creatorId;
        this.creatorName = creatorName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public Boolean getIsPrivate() {
        return isPrivate;
    }

    public void setIsPrivate(Boolean isPrivate) {
        this.isPrivate = isPrivate;
    }

    public Boolean getRequireApproval() {
        return requireApproval;
    }

    public void setRequireApproval(Boolean requireApproval) {
        this.requireApproval = requireApproval;
    }

    public Boolean getRequirePostApproval() {
        return requirePostApproval;
    }

    public void setRequirePostApproval(Boolean requirePostApproval) {
        this.requirePostApproval = requirePostApproval;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public String getCreatorName() {
        return creatorName;
    }

    public void setCreatorName(String creatorName) {
        this.creatorName = creatorName;
    }

    public String getMembershipStatus() {
        return membershipStatus;
    }

    public void setMembershipStatus(String membershipStatus) {
        this.membershipStatus = membershipStatus;
    }

    public String getMembershipRole() {
        return membershipRole;
    }

    public void setMembershipRole(String membershipRole) {
        this.membershipRole = membershipRole;
    }
}
