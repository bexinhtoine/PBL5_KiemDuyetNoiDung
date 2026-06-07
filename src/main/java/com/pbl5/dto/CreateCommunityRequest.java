package com.pbl5.dto;

public class CreateCommunityRequest {
    private String name;
    private String description;
    private String avatarUrl;
    private String coverUrl;
    private Boolean isPrivate;
    private Boolean requireApproval;
    private Boolean requirePostApproval;

    public CreateCommunityRequest() {}

    public CreateCommunityRequest(String name, String description, String avatarUrl, String coverUrl, Boolean isPrivate, Boolean requireApproval, Boolean requirePostApproval) {
        this.name = name;
        this.description = description;
        this.avatarUrl = avatarUrl;
        this.coverUrl = coverUrl;
        this.isPrivate = isPrivate;
        this.requireApproval = requireApproval;
        this.requirePostApproval = requirePostApproval;
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
}
