let modPostsCurrentPage = 0;
const MOD_POSTS_PAGE_SIZE = 10;
let modFilteredPosts = [];

function renderManagePostsFeed(posts) {
    const container = document.getElementById('manage-posts-feed');
    if (!container) return;

    // Search & Filter listeners
    const searchInput = document.getElementById('manage-search-input');
    const sourceFilter = document.getElementById('manage-source-filter');
    const typeFilter = document.getElementById('manage-type-filter');
    const visibilityFilter = document.getElementById('manage-visibility-filter');

    if (searchInput && !searchInput.dataset.listening) {
        searchInput.dataset.listening = "true";
        const update = () => {
            modPostsCurrentPage = 0;
            renderManagePostsFeed(window.cache.posts);
        };
        searchInput.addEventListener('input', update);
        if (sourceFilter) sourceFilter.addEventListener('change', update);
        if (typeFilter) typeFilter.addEventListener('change', update);
        if (visibilityFilter) visibilityFilter.addEventListener('change', update);
    }

    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const sourceVal = sourceFilter ? sourceFilter.value : 'ALL';
    const typeVal = typeFilter ? typeFilter.value : 'ALL';
    const visibilityVal = visibilityFilter ? visibilityFilter.value : 'ALL';

    modFilteredPosts = posts.filter(post => {
        // Search
        let searchMatch = true;
        if (searchVal) {
            const idMatch = String(post.id) == searchVal || `p-${post.id}` == searchVal || `#p-${post.id}` == searchVal;
            const authorIdMatch = String(post.authorId) === searchVal || `u-${post.authorId}` === searchVal;
            const authorNameMatch = (post.authorName || '').toLowerCase().includes(searchVal);
            searchMatch = idMatch || authorIdMatch || authorNameMatch;
        }

        // Source: personal vs group
        let sourceMatch = true;
        if (sourceVal === 'GROUP') {
            sourceMatch = !!(post.communityId || post.groupId || post.communityName);
        } else if (sourceVal === 'PERSONAL') {
            sourceMatch = !(post.communityId || post.groupId || post.communityName);
        }

        // Type
        let typeMatch = true;
        const postStatus = String(post.status || '').toUpperCase();
        if (typeVal === 'NORMAL') {
            typeMatch = postStatus === 'ACTIVE';
        } else if (typeVal === 'REVIEW') {
            typeMatch = postStatus !== 'ACTIVE';
        }

        // Visibility
        let visibilityMatch = true;
        if (visibilityVal !== 'ALL') visibilityMatch = post.visibility === visibilityVal;

        return searchMatch && sourceMatch && typeMatch && visibilityMatch;
    });

    const start = modPostsCurrentPage * MOD_POSTS_PAGE_SIZE;
    const end = start + MOD_POSTS_PAGE_SIZE;
    const pagePosts = modFilteredPosts.slice(start, end);
    const totalPages = Math.ceil(modFilteredPosts.length / MOD_POSTS_PAGE_SIZE);

    const cards = pagePosts.map(post => {
        const authorAvatar = post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'User')}&background=5e6ad2&color=fff`;
        const postTime = typeof timeSince === 'function' ? timeSince(post.createdAt) : 'Vừa xong';

        // Determine if post is from a group/community
        const isGroupPost = !!(post.communityId || post.groupId || post.communityName);
        const communityName = post.communityName || post.groupName || null;
        const communityId = post.communityId || post.groupId || null;

        let mediaHtml = '';
        if (post.imageUrl) mediaHtml += `<div class="post-media-container" style="margin-bottom: 12px; text-align: center; background: #000; border-radius: 8px; overflow: hidden;"><img src="${escapeHtml(post.imageUrl)}" style="max-height: 400px; width: 100%; object-fit: contain; display: block; margin: 0 auto;"></div>`;
        if (post.videoUrl) mediaHtml += `<div class="post-media-container" style="margin-bottom: 12px; text-align: center; background: #000; border-radius: 8px; overflow: hidden;"><video src="${escapeHtml(post.videoUrl)}" controls style="max-height: 400px; width: 100%; object-fit: contain; display: block; margin: 0 auto;"></video></div>`;

        const postStatus = String(post.status || '').toUpperCase();
        const isRejected = postStatus === 'REJECTED' || postStatus === 'AUTO_REJECTED';
        const isPending = postStatus === 'PENDING_REVIEW';

        let statusLabel = '';
        if (isRejected) statusLabel = `<span style="font-size: 11px; color: #ff4d4f; font-weight: 800; background: rgba(255, 77, 79, 0.1); padding: 2px 8px; border-radius: 4px; margin-left: 10px; border: 1px solid #ff4d4f;">ĐÃ GỠ</span>`;
        else if (!isPending) statusLabel = `<span style="font-size: 11px; color: #00d1b2; font-weight: 800; background: rgba(0, 209, 178, 0.1); padding: 2px 8px; border-radius: 4px; margin-left: 10px; border: 1px solid #00d1b2;">ĐÃ DUYỆT</span>`;

        let auditHtml = '';
        if (post.reviewerName) {
            auditHtml = `<div style="margin-bottom: 15px; font-size: 13px; color: #00d1b2; font-weight: 600; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-user-check"></i> Được duyệt bởi ${escapeHtml(post.reviewerName)}</div>`;
        }

        let actionButtons = '';
        if (isRejected) {
            actionButtons = `<button class="btn-action success" onclick="restorePost('${post.id}')" style="padding: 8px 16px; font-size: 14px; font-weight: 600;"><i class="fa-solid fa-rotate-left"></i> Khôi phục</button>`;
        } else {
            actionButtons = `
                ${isPending ? `<button class="btn-action success" onclick="approvePost('${post.id}')" style="padding: 8px 16px; font-size: 14px; font-weight: 600;">Duyệt</button>` : ''}
                <button class="btn-action danger" onclick="deletePost('${post.id}')" style="padding: 8px 16px; font-size: 14px; font-weight: 600;">Xóa bài</button>
            `;
        }

        // -------------------------------------------------------
        // Author header: "UserName → GroupName" for group posts
        // -------------------------------------------------------
        const authorLine = isGroupPost
            ? `<h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>${escapeHtml(post.authorName || 'Ẩn danh')}</span>
                <i class="fa-solid fa-arrow-right" style="font-size: 11px; color: #8b5cf6; opacity: 0.8;"></i>
                <span style="color: #8b5cf6;">${escapeHtml(communityName || 'Nhóm')}</span>
                <span style="font-weight: 400; color: var(--text-secondary); font-size: 12px;">(ID: ${post.authorId || '?'})</span>
                ${statusLabel}
               </h4>`
            : `<h4 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>${escapeHtml(post.authorName || 'Ẩn danh')}</span>
                <span style="font-weight: 400; color: var(--text-secondary); font-size: 12px;">(ID: ${post.authorId || '?'})</span>
                ${statusLabel}
               </h4>`;

        // Source badge (compact, inline below author name)
        const sourceBadge = isGroupPost
            ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #8b5cf6; background: rgba(139,92,246,0.1); padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.25);">
                <i class="fa-solid fa-users" style="font-size: 10px;"></i> Group
               </span>`
            : `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #0284c7; background: rgba(2,132,199,0.1); padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(2,132,199,0.2);">
                <i class="fa-solid fa-user" style="font-size: 10px;"></i> Cá nhân
               </span>`;

        // Border color per source
        const cardBorderLeft = isGroupPost ? '4px solid #8b5cf6' : '4px solid #0284c7';

        return `
            <article class="card post" style="margin-bottom: 30px; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: ${cardBorderLeft};">
                <div class="post-header" style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 18px;">
                    <img src="${authorAvatar}" alt="Avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ${isGroupPost ? '#8b5cf6' : '#0284c7'}; flex-shrink: 0;">
                    <div style="flex: 1; min-width: 0;">
                        ${authorLine}
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            ${sourceBadge}
                            <span><i class="fa-solid fa-hashtag"></i> P-${post.id}</span>
                            <span>•</span>
                            <span><i class="fa-solid fa-clock"></i> ${postTime}</span>
                            <span>•</span>
                            <span>${post.visibility === 'PUBLIC' ? '<i class="fa-solid fa-earth-americas"></i> Công khai' : (post.visibility === 'FRIENDS' ? '<i class="fa-solid fa-user-group"></i> Bạn bè' : '<i class="fa-solid fa-lock"></i> Riêng tư')}</span>
                        </div>
                    </div>
                    <div class="post-actions" style="display: flex; gap: 8px; flex-shrink: 0;">
                        ${actionButtons}
                    </div>
                </div>

                <div class="post-content" style="margin-bottom: 15px; font-size: 15px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;">${escapeHtml(post.content || '(Nội dung trống)')}</div>
                
                ${mediaHtml}
                
                ${auditHtml}

                <div class="post-footer" style="padding-top: 15px; border-top: 1px solid var(--border-color); display: flex; gap: 25px; color: var(--text-secondary); font-size: 14px; align-items: center;">
                    <span title="Lượt thả tim"><i class="fa-solid fa-heart" style="color: #e74c3c;"></i> <strong>${post.likeCount || 0}</strong></span>
                    <span title="Bình luận"><i class="fa-solid fa-comment" style="color: #00d1b2;"></i> <strong>${post.commentCount || 0}</strong></span>
                    <button class="btn-action primary" style="margin-left: auto;" onclick="viewPostDetail('${post.id}')">
                        <i class="fa-solid fa-circle-info"></i> Xem chi tiết
                    </button>
                </div>
            </article>
        `;
    }).join('');

    container.innerHTML = cards || '<div class="review-empty">Không tìm thấy bài viết nào phù hợp với bộ lọc hiện tại.</div>';
    renderModPostsPagination(totalPages);
}

function renderModPostsPagination(totalPages) {
    let pagEl = document.getElementById('mod-posts-pagination');
    if (!pagEl) {
        pagEl = document.createElement('div');
        pagEl.id = 'mod-posts-pagination';
        pagEl.className = 'pagination-bar';
        const section = document.getElementById('manage-posts-feed').parentNode;
        section.appendChild(pagEl);
    }
    if (totalPages <= 1) { pagEl.innerHTML = ''; return; }
    let html = '';
    html += `<button class="page-btn" ${modPostsCurrentPage === 0 ? 'disabled' : ''} onclick="changeModPostsPage(${modPostsCurrentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    const maxBtns = 5;
    let start = Math.max(0, modPostsCurrentPage - Math.floor(maxBtns / 2));
    let end = Math.min(totalPages, start + maxBtns);
    if (end - start < maxBtns) start = Math.max(0, end - maxBtns);
    for (let i = start; i < end; i++) {
        html += `<button class="page-btn${i === modPostsCurrentPage ? ' active' : ''}" onclick="changeModPostsPage(${i})">${i + 1}</button>`;
    }
    html += `<button class="page-btn" ${modPostsCurrentPage >= totalPages - 1 ? 'disabled' : ''} onclick="changeModPostsPage(${modPostsCurrentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    pagEl.innerHTML = html;
}

window.changeModPostsPage = function (page) {
    modPostsCurrentPage = page;
    renderManagePostsFeed(window.cache.posts);
    document.getElementById('manage-posts-feed')?.scrollIntoView({ behavior: 'smooth' });
};

window.hidePostAdmin = async function (id) {
    showCustomConfirm('Ẩn bài viết', 'Bạn có chắc chắn muốn ẨN bài viết này? Bài viết sẽ không hiển thị trên bảng tin công cộng nhưng không tính điểm vi phạm cho người dùng.', async () => {
        try {
            const res = await fetch(`/api/moderator/posts/${id}/hide`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${window.token || localStorage.getItem('token')}` }
            });
            if (res.ok) {
                showCustomAlert('Thành công', 'Đã ẩn bài viết thành công.', 'success');
                if (typeof loadDashboardData === 'function') loadDashboardData();
            } else {
                const msg = await res.text();
                showCustomAlert('Lỗi', msg || 'Lỗi khi ẩn bài viết.', 'error');
            }
        } catch (e) {
            console.error(e);
            showCustomAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.', 'error');
        }
    });
};

window.restorePost = async function (id) {
    showCustomConfirm('Khôi phục bài viết', 'Bạn có chắc chắn muốn KHÔI PHỤC bài viết này? Người dùng sẽ được TRỪ 1 điểm vi phạm vì bài viết đã được xác định là hợp lệ.', async () => {
        try {
            const res = await fetch(`/api/moderator/posts/${id}/restore`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${window.token || localStorage.getItem('token')}` }
            });
            if (res.ok) {
                showCustomAlert('Thành công', 'Đã khôi phục bài viết và trừ điểm vi phạm thành công.', 'success');
                if (typeof loadDashboardData === 'function') loadDashboardData();
            } else {
                const msg = await res.text();
                showCustomAlert('Lỗi', msg || 'Lỗi khi khôi phục bài viết.', 'error');
            }
        } catch (e) {
            console.error(e);
            showCustomAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.', 'error');
        }
    });
};
