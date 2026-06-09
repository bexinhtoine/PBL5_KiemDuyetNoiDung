/* post-detail-modal.js */

async function showPostDetailModal(postId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create modal element if it doesn't exist
    let overlay = document.querySelector('.post-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'post-modal-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) closePostDetailModal();
        };
        document.body.appendChild(overlay);
    }

    // Loading State html — Skeleton Effect
    overlay.innerHTML = `
        <div class="post-modal-card">
            <div class="modal-header">
                <h3><i class="fa-solid fa-newspaper" style="color:var(--accent-blue, #5e6ad2);margin-right:8px;"></i>Chi tiết bài viết <span style="color:var(--text-muted);font-weight:400;">#${postId}</span></h3>
                <button class="modal-close-btn" onclick="closePostDetailModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body post-modal-skeleton">
                <!-- Author bar skeleton -->
                <div class="skel-author-bar">
                    <div class="skel-circle" style="width:40px;height:40px;"></div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                        <div class="skel-block" style="width:35%;height:12px;"></div>
                        <div class="skel-block" style="width:20%;height:9px;"></div>
                    </div>
                </div>
                <!-- Content skeleton -->
                <div class="skel-content">
                    <div class="skel-block" style="width:95%;height:13px;"></div>
                    <div class="skel-block" style="width:80%;height:13px;"></div>
                    <div class="skel-block" style="width:60%;height:13px;"></div>
                </div>
                <!-- Media placeholder -->
                <div class="skel-media"></div>
                <!-- Stats bar skeleton -->
                <div class="skel-stats">
                    <div class="skel-block" style="width:80px;height:14px;"></div>
                    <div class="skel-block" style="width:100px;height:14px;"></div>
                </div>
                <!-- Comments skeleton -->
                <div class="skel-comments-area">
                    <div class="skel-comment">
                        <div class="skel-circle" style="width:32px;height:32px;"></div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
                            <div class="skel-block" style="width:25%;height:10px;"></div>
                            <div class="skel-block" style="width:70%;height:9px;"></div>
                        </div>
                    </div>
                    <div class="skel-comment">
                        <div class="skel-circle" style="width:32px;height:32px;"></div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
                            <div class="skel-block" style="width:30%;height:10px;"></div>
                            <div class="skel-block" style="width:55%;height:9px;"></div>
                        </div>
                    </div>
                    <div class="skel-comment">
                        <div class="skel-circle" style="width:32px;height:32px;"></div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
                            <div class="skel-block" style="width:20%;height:10px;"></div>
                            <div class="skel-block" style="width:85%;height:9px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.classList.add('show');

    try {
        const res = await fetch(`/api/posts/${postId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            overlay.querySelector('.modal-body').innerHTML = `
                <div style="color: var(--text-muted); text-align: center; padding: 40px; width: 100%;">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 48px; color: #d93d59; margin-bottom: 15px;"></i>
                    <h4 style="color: var(--text-main); font-size: 16px; margin-bottom: 8px;">Bài viết không khả dụng</h4>
                    <p style="font-size: 13px; max-width: 300px; margin: 0 auto;">Bài viết này đã bị gỡ quá thời hạn kháng nghị hoặc không tồn tại.</p>
                </div>
            `;
            return;
        }

        const post = await res.json();
        renderPostDetailInModal(post, overlay);
    } catch (err) {
        console.error("Error loading post modal details:", err);
        overlay.querySelector('.modal-body').innerHTML = `<div style="color:var(--text-muted); text-align:center; padding: 20px; width: 100%;">Không thể tải bài viết. Vui lòng thử lại sau.</div>`;
    }
}

function closePostDetailModal() {
    const overlay = document.querySelector('.post-modal-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
    // Remove postId query parameter from URL
    const url = new URL(window.location.href);
    if (url.searchParams.has('postId')) {
        url.searchParams.delete('postId');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }
}

function renderPostDetailInModal(post, overlay) {
    const isMine = post.mine || post.isMine;
    const status = String(post.status || '').toUpperCase();
    const isRejected = status === 'REJECTED' || status === 'AUTO_REJECTED' || status === 'REJECTED_BY_AI';

    // AI Scores parse logic
    let contentHateScore = post.hateSpeechContentScore || 0;
    let videoHateScore = post.hateSpeechVideoScore || 0;
    let contentHateLabelVal = 0;
    let videoHateLabelVal = 0;

    if (post.speechLabels) {
        try {
            if (post.speechLabels.includes(';')) {
                const parts = post.speechLabels.split(';');
                const cPart = parts[0].split(':');
                const vPart = parts[1].split(':');
                contentHateLabelVal = parseInt(cPart[0]) || 0;
                contentHateScore = parseFloat(cPart[1]) || contentHateScore;
                videoHateLabelVal = parseInt(vPart[0]) || 0;
                videoHateScore = parseFloat(vPart[1]) || videoHateScore;
            } else if (post.speechLabels.includes(':')) {
                const part = post.speechLabels.split(':');
                contentHateLabelVal = parseInt(part[0]) || 0;
                contentHateScore = parseFloat(part[1]) || contentHateScore;
            }
        } catch (err) {
            console.error("Lỗi parse speechLabels:", err);
        }
    }

    if (contentHateLabelVal === 0 && contentHateScore > 0) {
        if (contentHateScore > 0.8) contentHateLabelVal = 2;
        else if (contentHateScore > 0.4) contentHateLabelVal = 1;
    }
    if (videoHateLabelVal === 0 && videoHateScore > 0) {
        if (videoHateScore > 0.8) videoHateLabelVal = 2;
        else if (videoHateScore > 0.4) videoHateLabelVal = 1;
    }

    const labelNames = { 0: "CLEAN", 1: "OFFENSIVE", 2: "HATE" };
    const labelColors = { 0: "#10b981", 1: "#f59e0b", 2: "#ef4444" };

    const contentHateLabelText = labelNames[contentHateLabelVal] || "CLEAN";
    const contentLabelBg = labelColors[contentHateLabelVal] || "#10b981";

    const videoHateLabelText = labelNames[videoHateLabelVal] || "CLEAN";
    const videoLabelBg = labelColors[videoHateLabelVal] || "#10b981";

    const nsfwVal = post.nsfwScore || 0;
    let nsfwLabel = "CLEAN";
    let nsfwBg = "#10b981";
    if (nsfwVal > 0.8) { nsfwLabel = "HATE"; nsfwBg = "#ef4444"; }
    else if (nsfwVal > 0.4) { nsfwLabel = "OFFENSIVE"; nsfwBg = "#f59e0b"; }

    const violenceVal = post.violenceScore || 0;
    let violenceLabel = "CLEAN";
    let violenceBg = "#10b981";
    if (violenceVal > 0.8) { violenceLabel = "HATE"; violenceBg = "#ef4444"; }
    else if (violenceVal > 0.4) { violenceLabel = "OFFENSIVE"; violenceBg = "#f59e0b"; }

    // Warning banner and AI scores box
    let warningBannerHtml = '';
    let aiScoresHtml = '';
    if (isRejected) {
        warningBannerHtml = `
            <div class="warning-banner" style="background: rgba(217, 61, 89, 0.15); color: #ff6b8b; padding: 12px 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid rgba(217, 61, 89, 0.3); display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 16px; flex-shrink: 0;"></i>
                <span style="flex:1;">Bài viết này đã bị gỡ do vi phạm tiêu chuẩn cộng đồng. Chỉ bạn mới có thể xem và bài viết sẽ bị xóa vĩnh viễn sau 3 ngày kể từ ngày gỡ.</span>
            </div>
        `;

        aiScoresHtml = `
            <div id="post-detail-ai-scores" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color-solid, #23252a); background: var(--comment-bg, #0f1011);">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted, #d0d6e0); letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-robot" style="color: var(--accent-blue, #5e6ad2);"></i> Kết quả phân tích AI
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div style="background: var(--card-bg-solid, #141516); padding: 8px 10px; border: 1px solid var(--border-color-solid, #23252a); border-radius: 8px; display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 9px; font-weight: 600; color: var(--text-muted, #d0d6e0); text-transform: uppercase;">NSFW</span>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 13px; font-weight: 700; color: var(--text-main, #f7f8f8);">${(nsfwVal * 100).toFixed(1)}%</span>
                            <span style="font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 4px; background: ${nsfwBg}; color: #fff; line-height: 1.2;">${nsfwLabel}</span>
                        </div>
                    </div>
                    <div style="background: var(--card-bg-solid, #141516); padding: 8px 10px; border: 1px solid var(--border-color-solid, #23252a); border-radius: 8px; display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 9px; font-weight: 600; color: var(--text-muted, #d0d6e0); text-transform: uppercase;">Bạo lực</span>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 13px; font-weight: 700; color: var(--text-main, #f7f8f8);">${(violenceVal * 100).toFixed(1)}%</span>
                            <span style="font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 4px; background: ${violenceBg}; color: #fff; line-height: 1.2;">${violenceLabel}</span>
                        </div>
                    </div>
                    <div style="background: var(--card-bg-solid, #141516); padding: 8px 10px; border: 1px solid var(--border-color-solid, #23252a); border-radius: 8px; display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 9px; font-weight: 600; color: var(--text-muted, #d0d6e0); text-transform: uppercase; white-space: nowrap;">Hate Speech (Chữ)</span>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 13px; font-weight: 700; color: var(--text-main, #f7f8f8);">${(contentHateScore * 100).toFixed(1)}%</span>
                            <span style="font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 4px; background: ${contentLabelBg}; color: #fff; line-height: 1.2;">${contentHateLabelText}</span>
                        </div>
                    </div>
                    <div style="background: var(--card-bg-solid, #141516); padding: 8px 10px; border: 1px solid var(--border-color-solid, #23252a); border-radius: 8px; display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 9px; font-weight: 600; color: var(--text-muted, #d0d6e0); text-transform: uppercase; white-space: nowrap;">Hate Speech (Media)</span>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <span style="font-size: 13px; font-weight: 700; color: var(--text-main, #f7f8f8);">${(videoHateScore * 100).toFixed(1)}%</span>
                            <span style="font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 4px; background: ${videoLabelBg}; color: #fff; line-height: 1.2;">${videoHateLabelText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Media HTML
    let mediaHtml = '';
    if (post.videoUrl) {
        mediaHtml = `<video src="${post.videoUrl}" controls class="post-detail-img"></video>`;
    } else if (post.imageUrl) {
        mediaHtml = `<img src="${post.imageUrl}" class="post-detail-img" alt="Post media">`;
    }

    const authorAvatar = post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=5e6ad2&color=fff`;

    // Map visibility
    const visibilityMap = {
        PUBLIC: 'Công khai',
        FRIENDS: 'Bạn bè',
        PRIVATE: 'Riêng tư'
    };
    const visibilityLabel = visibilityMap[post.visibility] || post.visibility;

    // Appeal button if mine
    let appealBtnHtml = '';
    if (isMine && isRejected) {
        appealBtnHtml = `
            <button id="appeal-post-btn" onclick="openAppealModal(${post.id})" class="btn-appeal" style="background: #ef4444; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor: pointer; transition: all 0.2s; outline: none; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-circle-exclamation"></i> Kháng nghị
            </button>
        `;
    }

    // Like buttons state
    const likeIcon = post.likedByCurrentUser ? 'fa-solid text-red' : 'fa-regular';
    const likeStyle = post.likedByCurrentUser ? 'color: var(--red-icon, #ef4444);' : '';

    let likeBtnHtml = '';
    if (!isRejected) {
        likeBtnHtml = `
            <button id="modal-like-btn" onclick="toggleLikeInModal(${post.id})" style="background:transparent; border:none; cursor:pointer; font-weight: 600; font-size:13.5px; display:flex; align-items:center; gap:6px; color:var(--text-muted, #d0d6e0); ${likeStyle}">
                <i class="${likeIcon} fa-heart"></i> <span id="modal-likes-count">${post.likeCount || 0}</span>
            </button>
        `;
    } else {
        likeBtnHtml = `
            <span style="font-size:13px; color:var(--text-muted, #d0d6e0); display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-heart" style="color:var(--text-muted, #d0d6e0);"></i> <span>${post.likeCount || 0}</span>
            </span>
        `;
    }

    // Comment input block
    let commentInputHtml = '';
    if (!isRejected) {
        const myAvatar = document.getElementById('header-avatar') ? document.getElementById('header-avatar').src : `https://ui-avatars.com/api/?name=User&background=5e6ad2&color=fff`;
        commentInputHtml = `
            <div class="comment-input-area">
                <img src="${myAvatar}" alt="Avatar">
                <div class="comment-input-wrapper">
                    <input type="text" id="modal-comment-field" placeholder="Viết bình luận..." onkeypress="handleModalCommentKeyPress(event, ${post.id})">
                    <i class="fa-solid fa-paper-plane send-icon" onclick="submitCommentInModal(${post.id})"></i>
                </div>
            </div>
        `;
    }

    // Render full card structure
    overlay.innerHTML = `
        <div class="post-modal-card">
            <div class="modal-header">
                <h3><i class="fa-solid fa-newspaper" style="color:var(--accent-blue, #5e6ad2);margin-right:8px;"></i>Chi tiết bài viết <span style="color:var(--text-muted, #d0d6e0);font-weight:400;">#${post.id}</span></h3>
                <button class="modal-close-btn" onclick="closePostDetailModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <!-- Tác giả -->
                <div class="post-author-bar">
                    <div class="user-avatar-sm" style="flex-shrink:0;">
                        <img src="${authorAvatar}" alt="Avatar">
                    </div>
                    <div>
                        <div class="user-fullname">${post.authorName}</div>
                        <div style="font-size:12px;color:var(--text-muted, #d0d6e0);">@tác_giả • ${timeSinceInModal(post.createdAt)}</div>
                    </div>
                    <div style="margin-left:auto;">
                        <span class="badge" style="background: var(--comment-bg); color: var(--text-muted); padding: 4px 8px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border-color-solid);">${visibilityLabel}</span>
                    </div>
                </div>

                <!-- Warning Banner -->
                ${warningBannerHtml}

                <!-- AI Scores -->
                ${aiScoresHtml}

                <!-- Nội dung -->
                <div class="post-content-box">${post.content || '(Không có nội dung)'}</div>

                <!-- Media -->
                ${mediaHtml}

                <!-- Thống kê / Like -->
                <div class="post-stats-bar" style="justify-content: space-between; align-items:center;">
                    ${likeBtnHtml}
                    <span style="font-size:13px; color:var(--text-muted, #d0d6e0); display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-comment" style="color:var(--accent-blue, #5e6ad2);"></i> <span id="modal-comments-count-badge">${post.commentCount || 0}</span> bình luận
                    </span>
                </div>

                <!-- Bình luận list -->
                <div class="post-comments-box" id="modal-comments-list">
                    <div class="skel-comments-area" style="padding:8px 0 0;">
                        <div style="display:flex;gap:10px;padding:10px 0;"><div class="skel-circle" style="width:32px;height:32px;background:var(--skeleton-bg, rgba(255,255,255,0.05));animation:modal-skeleton-pulse 1.5s infinite ease-in-out;"></div><div style="flex:1;display:flex;flex-direction:column;gap:5px;"><div style="width:25%;height:10px;background:var(--skeleton-bg, rgba(255,255,255,0.05));animation:modal-skeleton-pulse 1.5s infinite ease-in-out;border-radius:4px;"></div><div style="width:65%;height:9px;background:var(--skeleton-bg, rgba(255,255,255,0.05));animation:modal-skeleton-pulse 1.5s infinite ease-in-out;border-radius:4px;"></div></div></div>
                        <div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--border-color-solid, #23252a);"><div class="skel-circle" style="width:32px;height:32px;background:var(--skeleton-bg, rgba(255,255,255,0.05));animation:modal-skeleton-pulse 1.5s infinite ease-in-out;"></div><div style="flex:1;display:flex;flex-direction:column;gap:5px;"><div style="width:30%;height:10px;background:var(--skeleton-bg, rgba(255,255,255,0.05));animation:modal-skeleton-pulse 1.5s infinite ease-in-out;border-radius:4px;"></div><div style="width:50%;height:9px;background:var(--skeleton-bg, rgba(255,255,255,0.05));animation:modal-skeleton-pulse 1.5s infinite ease-in-out;border-radius:4px;"></div></div></div>
                    </div>
                </div>
            </div>

            <!-- Comment Input for Active Posts -->
            ${commentInputHtml}

            <!-- Footer Appeal / Close -->
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closePostDetailModal()" style="background: var(--comment-bg); color: var(--text-main); border: 1px solid var(--border-color-solid); padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.2s;">Đóng</button>
                ${appealBtnHtml}
            </div>
        </div>
    `;

    fetchCommentsForModal(post.id);
}

async function fetchCommentsForModal(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const comments = await res.json();
        renderCommentsForModal(comments);
    } catch (err) {
        console.error("Lỗi lấy bình luận trong modal:", err);
        const list = document.getElementById('modal-comments-list');
        if (list) list.innerHTML = '<div class="no-comments">Không thể tải bình luận.</div>';
    }
}

function renderCommentsForModal(comments) {
    const list = document.getElementById('modal-comments-list');
    if (!list) return;

    if (comments.length === 0) {
        list.innerHTML = '<div class="no-comments">Chưa có bình luận nào.</div>';
        return;
    }

    list.innerHTML = `<div class="comments-title"><i class="fa-solid fa-comment"></i> Bình luận (${comments.length})</div>` +
        comments.map(c => {
            const avatar = c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=5e6ad2&color=fff`;
            return `
                <div class="comment-item">
                    <div class="comment-avatar">
                        <img src="${avatar}" alt="">
                    </div>
                    <div class="comment-body">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span class="comment-author">${c.authorName}</span>
                                <span class="comment-time">${timeSinceInModal(c.createdAt)}</span>
                            </div>
                        </div>
                        <div class="comment-text">${c.content || ''}</div>
                    </div>
                </div>
            `;
        }).join('');
}

async function toggleLikeInModal(postId) {
    const token = localStorage.getItem('token');
    const likeBtn = document.getElementById('modal-like-btn');
    const countSpan = document.getElementById('modal-likes-count');
    if (!likeBtn || !countSpan) return;

    const isLiked = likeBtn.querySelector('i').classList.contains('fa-solid');
    let currentCount = parseInt(countSpan.innerText) || 0;

    // Optimistic UI updates
    if (isLiked) {
        likeBtn.querySelector('i').className = 'fa-regular fa-heart';
        likeBtn.style.color = '';
        countSpan.innerText = Math.max(0, currentCount - 1);
    } else {
        likeBtn.querySelector('i').className = 'fa-solid fa-heart';
        likeBtn.style.color = 'var(--red-icon, #ef4444)';
        countSpan.innerText = currentCount + 1;
        
        // Burst heart effects
        if (window.animateHeartBurst) {
            window.animateHeartBurst(likeBtn.querySelector('i'));
        }
    }

    try {
        await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Sync feed post item like count if it exists on home feed
        const feedLikeCount = document.getElementById(`like-count-${postId}`);
        if (feedLikeCount) {
            const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
            feedLikeCount.innerText = `Mọi người (${newCount})`;
            const feedLikeIcon = document.getElementById(`like-icon-${postId}`);
            const feedLikeBtn = document.getElementById(`like-btn-${postId}`);
            if (feedLikeIcon && feedLikeBtn) {
                if (isLiked) {
                    feedLikeIcon.className = 'fa-regular fa-heart';
                    feedLikeBtn.style.color = '';
                } else {
                    feedLikeIcon.className = 'fa-solid fa-heart text-red';
                    feedLikeBtn.style.color = 'var(--red-icon)';
                }
            }
        }
    } catch (err) {
        console.error("Lỗi khi like từ modal:", err);
    }
}

function handleModalCommentKeyPress(event, postId) {
    if (event.key === 'Enter') {
        submitCommentInModal(postId);
    }
}

async function submitCommentInModal(postId) {
    const token = localStorage.getItem('token');
    const inputField = document.getElementById('modal-comment-field');
    if (!inputField) return;

    const content = inputField.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: content })
        });

        if (res.ok) {
            inputField.value = '';
            // Refresh comments inside modal
            fetchCommentsForModal(postId);
            
            // Sync comment count in modal badge
            const countBadge = document.getElementById('modal-comments-count-badge');
            if (countBadge) {
                let currentCount = parseInt(countBadge.innerText) || 0;
                countBadge.innerText = currentCount + 1;
            }

            // Sync comment count on home feed post item
            const feedCommentCount = document.getElementById(`comment-count-${postId}`);
            if (feedCommentCount) {
                let currentCount = parseInt(feedCommentCount.innerText.match(/\d+/)[0]) || 0;
                feedCommentCount.innerText = `Bình luận (${currentCount + 1})`;
            }
        } else {
            const msg = await res.text();
            alert(msg || 'Lỗi khi gửi bình luận.');
        }
    } catch (err) {
        console.error(err);
    }
}

function timeSinceInModal(dateString) {
    const postDate = new Date(dateString);
    if (Number.isNaN(postDate.getTime())) return 'Vừa xong';
    const seconds = Math.floor((new Date() - postDate) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return Math.floor(seconds) + " giây trước";
}

// Auto open modal if query param is set on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    if (postId) {
        // Wait a small delay to let other parts of feed initialize
        setTimeout(() => {
            showPostDetailModal(postId);
        }, 300);
    }
});
