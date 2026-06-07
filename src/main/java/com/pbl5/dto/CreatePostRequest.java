package com.pbl5.dto;

public class CreatePostRequest {
    private String content;
    private String imageUrl;
    private String videoUrl;
    private String visibility;
    private Long communityId;

    public CreatePostRequest() {
    }

    public CreatePostRequest(String content, String imageUrl, String videoUrl, String visibility) {
        this.content = content;
        this.imageUrl = imageUrl;
        this.videoUrl = videoUrl;
        this.visibility = visibility;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public Long getCommunityId() {
        return communityId;
    }

    public void setCommunityId(Long communityId) {
        this.communityId = communityId;
    }
}
