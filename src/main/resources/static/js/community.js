document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const communityId = urlParams.get('id');
    
    if (!communityId) {
        window.location.href = '/html/communities.html';
        return;
    }
    
    window.currentCommunityId = communityId;
    window.fetchPosts = (token) => loadCommunityPosts(token, communityId);
    
    fetchUserProfile(token);
});

async function fetchUserProfile(token) {
    try {
        const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            window.currentUser = data;
            
            let avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=5e6ad2&color=fff`;
            document.querySelectorAll('#header-avatar, .avatar-large, .avatar-small, #modal-avatar, #create-post-avatar').forEach(img => {
                img.src = avatarUrl;
            });

            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = data.fullName || 'Người dùng';
            });

            loadCommunityDetails(token, window.currentCommunityId);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadCommunityDetails(token, id) {
    try {
        const detailRes = await fetch(`/api/communities/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });

        if (detailRes.ok) {
            const community = await detailRes.json();
            window.currentCommunity = community;

            const isMember = community.membershipStatus === 'ACTIVE';
            const isPending = community.membershipStatus === 'PENDING';
            const isCreator = community.creatorId === window.currentUser.id;

            renderCommunityHeader(community, isMember, isCreator, isPending);
            
            if (!community.isPrivate || isMember || isCreator || window.currentUser.role === 'ADMIN' || window.currentUser.role === 'MODERATOR') {
                document.getElementById('community-create-post-box').style.display = 'block';
                // Attach communityId to post creation logic
                window.postCommunityId = community.id;
                loadCommunityPosts(token, id);
            } else {
                document.getElementById('skeleton-posts').style.display = 'none';
                document.getElementById('private-community-warning').style.display = 'block';
            }

            fetchMemberCount(token, id);

            // Auto-open management section if tab=manage in URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('tab') === 'manage' && isCreator) {
                showManageSection();
            }
        } else {
            showToast("Lỗi khi tải thông tin cộng đồng", "error");
        }
    } catch(e) {
        console.error(e);
    }
}

async function fetchMemberCount(token, id) {
    try {
        const res = await fetch(`/api/communities/${id}/members?status=ACTIVE`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const members = await res.json();
            const countEl = document.getElementById('community-members-count');
            if (countEl) {
                countEl.textContent = `${members.length} thành viên`;
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCommunityHeader(community, isMember, isCreator, isPending) {
    document.getElementById('community-name').textContent = community.name;
    document.getElementById('community-description').textContent = community.description || 'Chưa có mô tả';
    
    if (community.coverUrl) {
        document.getElementById('community-cover').src = community.coverUrl;
    }
    
    const avatarEl = document.getElementById('community-avatar');
    const placeholder = document.getElementById('community-avatar-placeholder');
    if (community.avatarUrl) {
        avatarEl.src = community.avatarUrl;
        avatarEl.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        avatarEl.style.display = 'none';
        placeholder.style.display = 'block';
    }

    const privacyIcon = document.getElementById('community-privacy-icon');
    if (community.isPrivate || community.privacyStatus === 'PRIVATE') {
        privacyIcon.innerHTML = '<i class="fa-solid fa-lock"></i> Cộng đồng riêng tư';
    } else {
        privacyIcon.innerHTML = '<i class="fa-solid fa-globe"></i> Cộng đồng công khai';
    }

    const btn = document.getElementById('btn-community-action');
    btn.style.display = 'block';
    
    // Reset any styles
    btn.style.cursor = 'pointer';
    btn.style.background = '';
    btn.style.color = '';

    if (isCreator) {
        btn.innerHTML = '<i class="fa-solid fa-gear"></i> Quản lý';
        btn.className = 'btn btn-secondary';
        btn.onclick = () => showManageSection();
    } else if (isMember) {
        btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Rời nhóm';
        btn.className = 'btn btn-secondary';
        btn.onclick = () => leaveCommunity(community.id);
    } else if (isPending) {
        btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Hủy yêu cầu';
        btn.className = 'btn btn-secondary';
        btn.onclick = () => leaveCommunity(community.id, true);
    } else {
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Tham gia';
        btn.className = 'btn btn-primary';
        btn.onclick = () => joinCommunity(community.id);
    }

    const adminInfoEl = document.getElementById('community-admin-info');
    if (adminInfoEl) {
        const creatorAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(community.creatorName)}&background=5e6ad2&color=fff`;
        adminInfoEl.innerHTML = `
            <a href="/html/profile.html?userId=${community.creatorId}" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit;">
                <img src="${creatorAvatar}" alt="Admin Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <span style="font-weight: 600;">${community.creatorName}</span>
            </a>
        `;
    }
}

window.showManageSection = function() {
    const section = document.getElementById('community-manage-section');
    const postsContainer = document.getElementById('posts-container');
    const createPostBox = document.getElementById('community-create-post-box');
    if (section) {
        section.style.display = 'block';
        if (postsContainer) postsContainer.style.display = 'none';
        if (createPostBox) createPostBox.style.display = 'none';
        switchManageTab('pending');
        // Smooth scroll to section
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.hideManageSection = function() {
    const section = document.getElementById('community-manage-section');
    const postsContainer = document.getElementById('posts-container');
    const createPostBox = document.getElementById('community-create-post-box');
    if (section) {
        section.style.display = 'none';
        if (postsContainer) postsContainer.style.display = 'block';
        if (createPostBox) createPostBox.style.display = 'block';
    }
    // Remove tab param from URL
    const url = new URL(window.location);
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', url);
};

window.switchManageTab = function(tab) {
    const tabs = ['pending', 'active', 'reports'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`manage-tab-${t}`);
        const section = document.getElementById(`manage-list-${t}`);
        if (tabBtn && section) {
            if (t === tab) {
                tabBtn.classList.add('active');
                tabBtn.style.borderBottomColor = 'var(--primary-color)';
                tabBtn.style.color = 'var(--primary-color)';
                section.style.display = 'block';
            } else {
                tabBtn.classList.remove('active');
                tabBtn.style.borderBottomColor = 'transparent';
                tabBtn.style.color = 'var(--text-muted)';
                section.style.display = 'none';
            }
        }
    });

    if (tab === 'pending' || tab === 'active') {
        fetchManageMembers(tab);
    } else if (tab === 'reports') {
        fetchCommunityReports();
    }
};

async function fetchCommunityReports() {
    const container = document.getElementById('manage-list-reports');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const reports = await res.json();
            const countEl = document.getElementById('count-reports');
            if (countEl) countEl.textContent = reports.length;
            
            if (reports.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
                    Chưa có báo cáo nào trong cộng đồng này.
                </div>`;
                return;
            }
            
            container.innerHTML = reports.map(r => {
                const avatar = r.reporterAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.reporterName || 'User')}&background=5e6ad2&color=fff`;
                const statusColor = r.status === 'PENDING' ? '#faad14' : (r.status === 'RESOLVED' ? '#10b981' : '#ff4d4f');
                const statusText = r.status === 'PENDING' ? 'Đang chờ' : (r.status === 'RESOLVED' ? 'Đã xử lý' : r.status);
                return `
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1;">
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${r.reporterName || 'Người dùng'}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
                                    <i class="fa-solid fa-flag" style="color: #ff4d4f; margin-right: 4px;"></i>
                                    ${escapeHtml(r.reason || 'Không có lý do')}
                                </div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${r.postContent ? '<i class="fa-regular fa-file-lines" style="margin-right: 4px;"></i> Bài viết: "' + escapeHtml(r.postContent.substring(0, 80)) + (r.postContent.length > 80 ? '...' : '') + '"' : ''}
                                </div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                                    ${r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : ''}
                                </div>
                            </div>
                        </div>
                        <span style="font-size: 12px; padding: 3px 10px; border-radius: 12px; font-weight: 600; background: ${statusColor}22; color: ${statusColor};">${statusText}</span>
                    </div>
                `;
            }).join('');
        } else if (res.status === 404) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
                Chưa có báo cáo nào trong cộng đồng này.
            </div>`;
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải báo cáo.</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
            Chưa có báo cáo nào trong cộng đồng này.
        </div>`;
    }
}

async function fetchManageMembers(status) {
    const token = localStorage.getItem('token');
    const container = document.getElementById(`manage-list-${status}`);
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';

    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/members?status=${status}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            
            // Update counts
            const countEl = document.getElementById(`count-${status}`);
            if (countEl) countEl.textContent = list.length;

            if (list.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Không có ${status === 'pending' ? 'yêu cầu nào' : 'thành viên nào'}.</div>`;
                return;
            }

            container.innerHTML = list.map(m => {
                const avatar = m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=5e6ad2&color=fff`;
                let actionBtn = '';
                if (status === 'pending') {
                    actionBtn = `
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="doApproveMember(${m.userId})">Phê duyệt</button>
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="doKickMember(${m.userId}, 'từ chối')">Từ chối</button>
                    `;
                } else {
                    if (m.role !== 'OWNER' && window.currentUser.id !== m.userId) {
                        actionBtn = `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; background: var(--red-icon); color: white; border: none; cursor: pointer;" onclick="doKickMember(${m.userId})">Trục xuất</button>`;
                    } else if (m.role === 'OWNER') {
                        actionBtn = `<span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Chủ sở hữu</span>`;
                    }
                }

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-main);">${m.fullName}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">Tham gia ${new Date(m.joinedAt).toLocaleDateString('vi-VN')}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải danh sách.</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi kết nối.</div>';
    }
}

window.doApproveMember = async function(userId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/approve/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã phê duyệt thành viên", "success");
            fetchManageMembers('pending');
            // update header count
            fetchMemberCount(token, window.currentCommunityId);
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.doKickMember = function(userId, actionName = 'trục xuất') {
    showConfirmModal(
        actionName === 'từ chối' ? 'Từ chối yêu cầu' : 'Trục xuất thành viên',
        `Bạn có chắc chắn muốn ${actionName} người dùng này?`,
        async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/communities/${window.currentCommunityId}/kick/${userId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showToast(actionName === 'từ chối' ? "Đã từ chối yêu cầu" : "Đã trục xuất thành viên", "success");
                    fetchManageMembers(actionName === 'từ chối' ? 'pending' : 'active');
                    fetchMemberCount(token, window.currentCommunityId);
                } else {
                    showToast(await res.text(), "error");
                }
            } catch (e) {
                showToast("Lỗi kết nối", "error");
            }
        }
    );
};

async function joinCommunity(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${id}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast(await res.text(), "success");
            location.reload();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
}

function leaveCommunity(id, isPending = false) {
    const title = isPending ? 'Hủy yêu cầu tham gia' : 'Rời cộng đồng';
    const message = isPending ? 'Bạn có chắc chắn muốn hủy yêu cầu tham gia cộng đồng này?' : 'Bạn có chắc chắn muốn rời khỏi cộng đồng này?';

    showConfirmModal(title, message, async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/communities/${id}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast(await res.text(), "success");
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showToast(await res.text(), "error");
            }
        } catch (e) {
            showToast("Lỗi kết nối", "error");
        }
    });
}

async function loadCommunityPosts(token, id) {
    try {
        const res = await fetch(`/api/communities/${id}/posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const posts = await res.json();
            renderPosts(posts, token);
        } else {
            document.getElementById('posts-container').innerHTML = '<div style="text-align: center; color: #65676B; padding: 20px;">Lỗi tải bài viết.</div>';
        }
    } catch(e) {
        console.error(e);
    }
}

function timeSince(dateString) {
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

function escapeHtml(unsafe) {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

function renderPosts(posts, token) {
    const container = document.getElementById('posts-container');
    if (posts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #65676B; padding: 30px; background: var(--card-bg); border-radius: 8px;">Cộng đồng này chưa có bài viết nào.</div>';
        return;
    }
    
    let allPostsHtml = '';
    posts.forEach(post => {
        const isMine = post.mine ?? post.isMine ?? false;
        
        let postHtml = `
        <article class="card post" id="post-${post.id}">
            <div class="post-header">
                <a href="/html/profile.html?userId=${post.authorId}">
                    <img src="${post.authorAvatar || '/uploads/default-avatar.png'}" alt="Avatar" class="avatar-medium">
                </a>
                <div class="post-meta">
                    <h4 class="post-author"><a href="/html/profile.html?userId=${post.authorId}" style="text-decoration:none; color:inherit;">${post.authorName}</a></h4>
                    <span class="post-time">${timeSince(post.createdAt)}</span>
                </div>
            </div>
            
            <div class="post-content">
                <p>${escapeHtml(post.content || '')}</p>
            </div>
        `;

        if (post.imageUrl) {
            postHtml += `<div class="post-image-placeholder text-center"><img src="${post.imageUrl}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;"></div>`;
        }
        if (post.videoUrl) {
            postHtml += `<div class="post-video-placeholder text-center"><video src="${post.videoUrl}" controls style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; max-height: 400px; background: #000;"></video></div>`;
        }

        const likeIcon = post.likedByCurrentUser ? 'fa-solid text-red' : 'fa-regular';
        const likeStyle = post.likedByCurrentUser ? 'color: var(--red-icon);' : '';

        postHtml += `
            <div class="post-actions-bar">
                <button id="like-btn-${post.id}" class="interaction-btn" onclick="toggleLike(${post.id})" style="${likeStyle}">
                    <i id="like-icon-${post.id}" class="${likeIcon} fa-heart"></i> Mọi người (${post.likeCount})
                </button>
                <button class="interaction-btn" onclick="location.href='/html/post.html?id=${post.id}'">
                    <i class="fa-regular fa-comment"></i> Bình luận (${post.commentCount})
                </button>
                <button class="interaction-btn" onclick="location.href='/html/post.html?id=${post.id}'">
                    <i class="fa-regular fa-share-from-square"></i> Chia sẻ
                </button>
                <button id="bookmark-btn-${post.id}" class="interaction-btn" onclick="toggleBookmark(${post.id})" style="margin-left: auto; ${post.bookmarkedByCurrentUser ? 'color: var(--primary-color);' : ''}">
                    <i class="${post.bookmarkedByCurrentUser ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
                </button>
            </div>
        </article>
        `;
        allPostsHtml += postHtml;
    });
    container.innerHTML = allPostsHtml;
}

async function toggleLike(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadCommunityPosts(token, window.currentCommunityId);
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleBookmark(postId) {
    const token = localStorage.getItem('token');
    const btn = document.getElementById(`bookmark-btn-${postId}`);
    if (!btn) return;

    const icon = btn.querySelector('i');
    const isBookmarked = icon.classList.contains('fa-solid');

    // Optimistic UI
    if (isBookmarked) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
        btn.style.color = '';
    } else {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        btn.style.color = 'var(--primary-color)';
    }

    try {
        const res = await fetch(`/api/posts/${postId}/bookmark`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            showToast(data.message, 'success');
        }
    } catch (err) {
        console.error('Bookmark error:', err);
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Unified Confirmation Modal for Logout
function showUnifiedLogoutConfirm(title, message, onConfirm) {
    const oldPopup = document.getElementById('unified-confirm-popup');
    if (oldPopup) oldPopup.remove();

    const popupHtml = `
        <div id="unified-confirm-popup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 999999;">
            <div style="background: var(--card-bg, var(--surface-bg, #ffffff)); border-radius: 8px; padding: 25px; min-width: 350px; max-width: 450px; text-align: center; box-shadow: var(--card-shadow, 0 10px 25px rgba(0,0,0,0.15)); color: var(--text-color, var(--text-primary, #212121)); border: 1px solid var(--border-color, #dbdbdb); border-top: 4px solid #10b981;">
                <i class="fa-solid fa-circle-question" style="font-size: 45px; color: #10b981; margin-bottom: 20px;"></i>
                <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">${title}</h3>
                <p style="margin: 0 0 25px 0; font-size: 15px; color: var(--text-muted, var(--text-secondary, #666)); line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="unified-confirm-no" style="background: var(--bg-color, var(--bg-main, #f5f5f5)); color: var(--text-color, var(--text-primary, #212121)); border: 1px solid var(--border-color, #dbdbdb); padding: 10px 25px; border-radius: 6px; font-weight: 600; cursor: pointer; flex: 1; transition: all 0.2s;">Hủy bỏ</button>
                    <button id="unified-confirm-yes" style="background: #10b981; color: #fff; border: none; padding: 10px 25px; border-radius: 6px; font-weight: 600; cursor: pointer; flex: 1; transition: all 0.2s;">Xác nhận</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    const yesBtn = document.getElementById('unified-confirm-yes');
    const noBtn = document.getElementById('unified-confirm-no');
    
    yesBtn.onmouseover = () => { yesBtn.style.opacity = '0.9'; };
    yesBtn.onmouseout = () => { yesBtn.style.opacity = '1'; };
    
    noBtn.onmouseover = () => { noBtn.style.background = '#e8e8e8'; };
    noBtn.onmouseout = () => { noBtn.style.background = 'var(--bg-color, var(--bg-main, #f5f5f5))'; };

    document.getElementById('unified-confirm-yes').onclick = () => {
        document.getElementById('unified-confirm-popup').remove();
        if (onConfirm) onConfirm();
    };
    document.getElementById('unified-confirm-no').onclick = () => {
        document.getElementById('unified-confirm-popup').remove();
    };
}

window.logout = function () {
    showUnifiedLogoutConfirm(
        'Xác nhận đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?',
        () => {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    );
};
