let targetUserId = null;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = "/";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('userId');
    if (id) targetUserId = parseInt(id);

    // 2. Fetch User Info
    fetchUserProfile();
    fetchSidebarSuggestions(token);
});

function fetchUserProfile() {
    const token = localStorage.getItem('token');

    fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Token hết hạn');
            return res.json();
        })
        .then(currentUser => {
            currentUserId = currentUser.id;

            // --- Populate Global Sidebars and Header ---
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = currentUser.fullName || 'Người dùng';
            });

            let avatarUrl = currentUser.avatar;
            if (!avatarUrl && currentUser.fullName) {
                avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=5e6ad2&color=fff`;
            }

            document.querySelectorAll('#header-avatar, .avatar-large, .avatar-small, #modal-avatar').forEach(img => {
                img.src = avatarUrl;
            });

            // Admin/Moderator Menu
            if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
                const adminContainer = document.getElementById('admin-menu-container');
                if (adminContainer) {
                    adminContainer.innerHTML = `
                    <a href="/html/admin.html" id="admin-menu-item" class="menu-item admin-menu-item">
                        <i class="fa-solid ${currentUser.role === 'ADMIN' ? 'fa-shield-halved' : 'fa-user-shield'}"></i>
                        <span>${currentUser.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Kiểm duyệt'}</span>
                    </a>
                `;
                }
            }
            // --- End Sidebar Population ---

            if (targetUserId && targetUserId !== currentUserId) {
                // Xem trang của người khác
                fetchTargetUser(targetUserId, token);
            } else {
                // Xem trang của mình
                fillProfileData(currentUser, true);
                fetchMyPosts('/api/posts/me');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            window.location.href = "/";
        });
}

function fetchTargetUser(id, token) {
    fetch(`/api/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Không lấy được user');
            return res.json();
        })
        .then(targetUser => {
            fillProfileData(targetUser, false);
            fetchMyPosts(`/api/posts/user/${targetUser.id}`);
        })
        .catch(err => console.error(err));
}

function fillProfileData(user, isCurrentUser) {
    // Cập nhật Trang cá nhân
    document.getElementById('profile-name').innerText = user.fullName || "Người dùng";
    document.getElementById('profile-bio').innerText = user.bio || "Chưa có tiểu sử.";

    if (user.avatar) {
        const pAvatar = document.getElementById('profile-avatar');
        if (pAvatar) pAvatar.src = user.avatar;
        const cpAvatar = document.getElementById('create-post-avatar');
        if (cpAvatar) cpAvatar.src = user.avatar;
        const modalAvatar = document.getElementById('modal-avatar');
        if (modalAvatar) modalAvatar.src = user.avatar;
    }

    if (user.cover) {
        const pCover = document.getElementById('profile-cover');
        if (pCover) pCover.src = user.cover;
    }

    const relEl = document.getElementById('profile-relationship');
    if (relEl) relEl.innerText = user.relationshipStatus || '---';
    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.innerText = user.email || '---';
    const phoneEl = document.getElementById('profile-phone');
    if (phoneEl) phoneEl.innerText = user.phoneNumber || '---';
    const dobEl = document.getElementById('profile-dob');
    if (dobEl) dobEl.innerText = user.dateOfBirth ? formatDate(user.dateOfBirth) : '---';
    const genderEl = document.getElementById('profile-gender');
    if (genderEl) genderEl.innerText = user.gender || '---';

    // Luôn hiển thị tên của CHÍNH MÌNH (currentUser) trong các modal tạo bài viết hoặc chỉnh sửa
    // Tuy nhiên, ở trang cá nhân người khác, user truyền vào fillProfileData là targetUser.
    // Chúng ta cần lấy fullName của currentUser đã lưu trước đó.
    const token = localStorage.getItem('token');
    fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(curr => {
            document.querySelectorAll('.modal-user-name').forEach(el => {
                el.textContent = curr.fullName || 'Người dùng';
            });
            const modalAvt = document.getElementById('modal-avatar');
            if (modalAvt) modalAvt.src = curr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(curr.fullName)}&background=5e6ad2&color=fff`;
        });

    if (isCurrentUser) {
        // Setup placeholders
    } else {
        // Ẩn các nút chỉnh sửa
        const btnEdit = document.getElementById('btn-edit-profile');
        if (btnEdit) btnEdit.style.display = 'none';

        const editAvt = document.querySelector('.edit-avatar-btn');
        if (editAvt) editAvt.style.display = 'none';
        const editCov = document.querySelector('.edit-cover-btn');
        if (editCov) editCov.style.display = 'none';

        // Xử lý hiển thị điểm chung khi xem trang người khác
        const mutualSec = document.getElementById('mutual-connections-section');
        const mutualList = document.getElementById('mutual-connections-list');
        if (mutualSec && mutualList) {
            mutualList.innerHTML = '';
            let hasCommon = false;

            if (user.mutualFriends && user.mutualFriends.length > 0) {
                hasCommon = true;
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.gap = '8px';
                
                const names = user.mutualFriends.slice(0, 3).map(f => `<a href="/html/profile.html?userId=${f.id}" style="color: var(--primary-color); font-weight: 550; text-decoration: none; hover: underline;">${f.fullName}</a>`).join(', ');
                const suffix = user.mutualFriends.length > 3 ? ` và ${user.mutualFriends.length - 3} người khác` : '';
                
                li.innerHTML = `<i class="fa-solid fa-user-group" style="color: var(--text-muted); font-size: 14px; width: 20px; text-align: center;"></i> <span>Bạn chung: ${names}${suffix}</span>`;
                mutualList.appendChild(li);
            }

            if (user.commonCommunities && user.commonCommunities.length > 0) {
                hasCommon = true;
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.gap = '8px';

                const comms = user.commonCommunities.slice(0, 3).map(c => `<a href="/html/community.html?id=${c.id}" style="color: var(--primary-color); font-weight: 550; text-decoration: none; hover: underline;">${c.name}</a>`).join(', ');
                const suffix = user.commonCommunities.length > 3 ? ` và ${user.commonCommunities.length - 3} nhóm khác` : '';

                li.innerHTML = `<i class="fa-solid fa-users" style="color: var(--text-muted); font-size: 14px; width: 20px; text-align: center;"></i> <span>Cùng tham gia: ${comms}${suffix}</span>`;
                mutualList.appendChild(li);
            }

            if (hasCommon) {
                mutualSec.style.display = 'block';
            } else {
                mutualSec.style.display = 'none';
            }
        }

        // Ẩn khung tạo bài viết
        const createPostBlock = document.querySelector('.create-post-box');
        if (createPostBlock) createPostBlock.style.display = 'none';

        // Hiện nút nhắn tin
        const btnMsg = document.getElementById('btn-message');
        if (btnMsg) {
            const fAction = document.getElementById('friendship-actions');
            if (fAction) {
                fAction.style.display = 'inline-block';
                const status = user.friendshipStatus;
                const targetId = user.id;
                if (!status || status === 'NONE') {
                    fAction.innerHTML = `<button class="btn btn-primary" onclick="sendFriendRequest(${targetId})"><i class="fa-solid fa-user-plus"></i> Thêm bạn bè</button>`;
                } else if (status === 'PENDING') {
                    if (targetId === user.receiverId) {
                        fAction.innerHTML = `<button class="btn btn-secondary" onclick="removeFriend(${targetId})"><i class="fa-solid fa-user-clock"></i> Đã gửi lời mời</button>`;
                    } else {
                        fAction.innerHTML = `
                        <button class="btn btn-primary" onclick="acceptFriendRequest(${targetId})"><i class="fa-solid fa-user-check"></i> Chấp nhận</button>
                        <button class="btn btn-secondary" onclick="removeFriend(${targetId})"><i class="fa-solid fa-user-xmark"></i> Xóa</button>
                    `;
                    }
                } else if (status === 'ACCEPTED') {
                    fAction.innerHTML = `<button class="btn btn-secondary" onclick="removeFriend(${targetId})"><i class="fa-solid fa-user-group"></i> Bạn bè</button>`;
                }
            }
            btnMsg.style.display = 'inline-block';
            let avt = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=5e6ad2&color=fff`;
            btnMsg.onclick = () => {
                if (typeof openChatBox === "function") {
                    openChatBox(user.id, user.fullName, avt);
                } else {
                    console.error("Chat functionality not loaded");
                }
            };
        }
    }

    // Fetch and display Photos and Friends
    fetchAndDisplayPhotos(user.id);
    fetchAndDisplayFriends(user.id);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Lấy danh sách ảnh từ bài viết của user
 */
async function fetchAndDisplayPhotos(userId) {
    const token = localStorage.getItem('token');
    const container = document.getElementById('profile-photos-grid');
    if (!container) return;

    try {
        const res = await fetch(`/api/posts/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const posts = await res.json();
            const photos = posts.filter(p => p.imageUrl).slice(0, 9);

            if (photos.length > 0) {
                container.innerHTML = photos.map(p => `
                    <div class="photo-item" onclick="showPostDetailModal(${p.id})">
                        <img src="${p.imageUrl}" alt="Post photo" onerror="this.parentElement.style.display='none'">
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #65676b; font-size: 13px;">Chưa có ảnh nào.</div>';
            }

            // Cập nhật số bài viết trong stats
            const statPosts = document.querySelector('.stat-item:nth-child(1) strong');
            if (statPosts) statPosts.innerText = posts.length;
        }
    } catch (err) {
        console.error("Lỗi lấy ảnh:", err);
    }
}

/**
 * Lấy danh sách bạn bè
 */
async function fetchAndDisplayFriends(userId) {
    const token = localStorage.getItem('token');
    const container = document.getElementById('profile-friends-grid');
    if (!container) return;

    try {
        const res = await fetch('/api/friends', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const friends = await res.json();
            const displayedFriends = friends.slice(0, 9);

            if (displayedFriends.length > 0) {
                container.innerHTML = displayedFriends.map(f => {
                    const avt = f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=5e6ad2&color=fff`;
                    return `
                        <a href="/html/profile.html?userId=${f.id}" class="friend-item">
                            <img src="${avt}" alt="${f.fullName}" class="friend-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=5e6ad2&color=fff'">
                            <span class="friend-name">${f.fullName}</span>
                        </a>
                    `;
                }).join('');
            } else {
                container.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #65676b; font-size: 13px;">Chưa có bạn bè.</div>';
            }

            // Cập nhật số lượng bạn bè
            const statFriends = document.querySelector('.stat-item:nth-child(2) strong');
            if (statFriends) statFriends.innerText = friends.length;
        }
    } catch (err) {
        console.error("Lỗi lấy bạn bè:", err);
    }
}

function fetchMyPosts(endpointUrl) {
    const token = localStorage.getItem('token');
    const url = endpointUrl || '/api/posts/me';
    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(posts => {
            renderProfilePosts(posts);
        })
        .catch(err => {
            document.getElementById('profile-posts-container').innerHTML = '<p style="text-align: center; color: red;">Lỗi tải bài viết.</p>';
        });
}

function timeSince(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
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

function renderProfilePosts(posts) {
    const container = document.getElementById('profile-posts-container');
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #65676B; padding: 20px;">Chưa có bài viết nào.</p>';
        return;
    }

    container.innerHTML = '';

    posts.forEach(post => {
        let visibilityIcon = '';
        if (post.visibility === 'PUBLIC') visibilityIcon = '<i class="fa-solid fa-earth-americas" style="margin-left: 5px; font-size: 11px;"></i>';
        else if (post.visibility === 'FRIENDS') visibilityIcon = '<i class="fa-solid fa-user-group" style="margin-left: 5px; font-size: 10px;"></i>';
        else visibilityIcon = '<i class="fa-solid fa-lock" style="margin-left: 5px; font-size: 11px;"></i>';
        const isMine = post.mine ?? post.isMine ?? false;

        const status = String(post.status || '').toUpperCase();
        const isRejected = status === 'REJECTED' || status === 'AUTO_REJECTED' || status === 'REJECTED_BY_AI';
        const isPending = false; // Render pending posts like normal active posts
        const isDeleted = status === 'DELETED';

        const rejectedHtml = isRejected ? `
            <div style="background-color: #ffebe9; border: 1px solid #ff8182; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; color: #d1293f; font-weight: 500; cursor: pointer;" onclick="showPostDetailModal(${post.id})">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 18px;"></i>
                <span>Bài viết này đã bị gỡ khỏi hệ thống do vi phạm tiêu chuẩn cộng đồng. Chỉ có bạn mới có thể nhìn thấy nội dung này (click để xem chi tiết và kháng nghị).</span>
            </div>
        ` : (isPending ? `
            <div style="background-color: #fff9db; border: 1px solid #fab005; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; color: #f08c00; font-weight: 500;">
                <i class="fa-solid fa-clock" style="font-size: 18px;"></i>
                <span>Bài viết đang chờ duyệt bởi đội ngũ quản trị. Chỉ có bạn mới có thể nhìn thấy nội dung này.</span>
            </div>
        ` : '');

        const deletedHtml = isDeleted ? `
            <div style="background-color: #f0f2f5; border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 10px; color: #65676B;">
                    <i class="fa-solid fa-trash-can" style="font-size: 18px;"></i>
                    <span>Bài viết đã được chuyển vào thùng rác (sẽ bị xóa vĩnh viễn sau 1 ngày).</span>
                </div>
                <button onclick="restorePost(${post.id})" style="background: var(--primary-color); color: #fff; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">Khôi phục</button>
            </div>
        ` : '';

        let authorHtml = `<a href="/html/profile.html?userId=${post.authorId}" style="text-decoration:none; color:inherit; font-weight:600;">${post.authorName}</a>`;
        
        const isCommunityPost = !!(post.communityName && post.communityId);
        
        if (!isCommunityPost) {
            if (post.friendshipStatus === 'NONE' && !isMine) {
                authorHtml += `
                    <button class="add-friend-btn" onclick="addFriendFromFeed(event, ${post.authorId}, this)" style="margin-left: 8px; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 12px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); cursor: pointer; transition: all 0.2s; outline: none; display: inline-flex; align-items: center; justify-content: center; height: 20px;">
                        <i class="fa-solid fa-user-plus" style="margin-right: 3px;"></i>Kết bạn
                    </button>
                `;
            }
        } else {
            authorHtml += `
                <i class="fa-solid fa-caret-right" style="margin: 0 6px; color: var(--text-muted); font-size: 13px;"></i>
                <a href="/html/community.html?id=${post.communityId}" style="text-decoration:none; color:var(--primary-color); font-weight: 600;">${post.communityName}</a>
            `;
            if (!post.joinedCommunity && !post.communityPrivate) {
                authorHtml += `
                    <button class="join-comm-btn" onclick="joinCommunityFromFeed(event, ${post.communityId}, this)" style="margin-left: 8px; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 12px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); cursor: pointer; transition: all 0.2s; outline: none; display: inline-flex; align-items: center; justify-content: center; height: 20px;">
                        <i class="fa-solid fa-plus" style="margin-right: 3px;"></i>Tham gia
                    </button>
                `;
            }
        }
        let dropdownHtml = '';
        if (isMine) {
            if (isRejected) {
                dropdownHtml = `
                    <a href="javascript:void(0)" onclick="openAppealModal(${post.id})"><i class="fa-solid fa-circle-exclamation"></i> Gửi kháng nghị</a>
                    <div style="height: 1px; background: #e4e6eb; margin: 4px 0;"></div>
                    <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon);"><i class="fa-regular fa-trash-can"></i> Xóa bài viết</a>
                `;
            } else if (isDeleted) {
                dropdownHtml = '';
            } else if (isCommunityPost) {
                dropdownHtml = `
                    <a href="javascript:void(0)" onclick="toggleBookmark(${post.id})"><i class="fa-regular fa-bookmark"></i> Lưu bài viết</a>
                    <a href="javascript:void(0)" onclick="hidePost(${post.id})"><i class="fa-solid fa-eye-slash"></i> Ẩn bài viết</a>
                    <div style="height: 1px; background: #e4e6eb; margin: 4px 0;"></div>
                    <a href="javascript:void(0)" onclick="startEditPost(${post.id})"><i class="fa-regular fa-pen-to-square"></i> Chỉnh sửa bài viết</a>
                    <div style="height: 1px; background: #e4e6eb; margin: 4px 0;"></div>
                    <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon);"><i class="fa-regular fa-trash-can"></i> Xóa bài viết</a>
                `;
            } else {
                dropdownHtml = `
                    <a href="javascript:void(0)" onclick="changeVisibility(${post.id}, 'PUBLIC')"><i class="fa-solid fa-earth-americas"></i> Công khai</a>
                    <a href="javascript:void(0)" onclick="changeVisibility(${post.id}, 'FRIENDS')"><i class="fa-solid fa-user-group"></i> Chỉ bạn bè</a>
                    <a href="javascript:void(0)" onclick="changeVisibility(${post.id}, 'PRIVATE')"><i class="fa-solid fa-lock"></i> Chỉ mình tôi</a>
                    <div style="height: 1px; background: #e4e6eb; margin: 4px 0;"></div>
                    <a href="javascript:void(0)" onclick="startEditPost(${post.id})"><i class="fa-regular fa-pen-to-square"></i> Chỉnh sửa bài viết</a>
                    <div style="height: 1px; background: #e4e6eb; margin: 4px 0;"></div>
                    <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon);"><i class="fa-regular fa-trash-can"></i> Xóa bài viết</a>
                `;
            }
        } else {
            if (isCommunityPost) {
                dropdownHtml = `
                    <a href="javascript:void(0)" onclick="toggleBookmark(${post.id})"><i class="fa-regular fa-bookmark"></i> Lưu bài viết</a>
                    <a href="javascript:void(0)" onclick="hidePost(${post.id})"><i class="fa-solid fa-eye-slash"></i> Ẩn bài viết này</a>
                    <a href="javascript:void(0)" onclick="reportPostToTarget(${post.id}, 'COMMUNITY')"><i class="fa-regular fa-flag"></i> Báo cáo với chủ nhóm</a>
                    <a href="javascript:void(0)" onclick="reportPostToTarget(${post.id}, 'SYSTEM')"><i class="fa-solid fa-shield-halved"></i> Báo cáo với quản trị riêng</a>
                `;
            } else {
                dropdownHtml = `
                    <a href="javascript:void(0)" onclick="hidePost(${post.id})"><i class="fa-solid fa-eye-slash"></i> Ẩn bài viết này</a>
                    <a href="javascript:void(0)" onclick="reportPost(${post.id})"><i class="fa-regular fa-flag"></i> Báo cáo bài viết</a>
                `;
            }
        }

        let postHtml = `
        <article class="card post" id="post-${post.id}" ${(isRejected || isPending || isDeleted) ? 'style="opacity: 0.8; border: 1px solid ' + (isRejected ? '#ff8182' : (isPending ? '#fab005' : '#ccc')) + ';"' : ''}>
            <div class="post-header">
                <a href="/html/profile.html?userId=${post.authorId}">
                    <img src="${post.authorAvatar || '/uploads/default-avatar.png'}" alt="Avatar" class="avatar-medium" onerror="this.src='/uploads/default-avatar.png'">
                </a>
                <div class="post-meta">
                    <h4 class="post-author">${authorHtml}</h4>
                    <span class="post-time"><a href="javascript:void(0)" onclick="showPostDetailModal(${post.id})" style="text-decoration:none; color:inherit;">${timeSince(post.createdAt)}</a> ${post.edited ? '<span style="font-size:11px;color:var(--text-muted);margin-left:5px;">(đã chỉnh sửa)</span>' : ''} <span id="visibility-icon-${post.id}">${visibilityIcon}</span></span>
                </div>
            </div>
            
            <div class="post-options">
                <button class="options-btn" onclick="toggleDropdown(${post.id})">
                    <i class="fa-solid fa-ellipsis"></i>
                </button>
                <div id="dropdown-${post.id}" class="dropdown-content">
                    ${dropdownHtml}
                </div>
            </div>

            <div class="post-content">
                ${rejectedHtml}
                ${deletedHtml}
                <p>${escapeHtml(post.content || '')}</p>
            </div>
        `;

        if (post.imageUrl) {
            postHtml += `
            <a href="javascript:void(0)" onclick="showPostDetailModal(${post.id})" class="post-image-link">
                <div class="post-image-placeholder text-center">
                    <img src="${post.imageUrl}" alt="Post image" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                </div>
            </a>
            `;
        }

        if (post.videoUrl) {
            postHtml += `
            <a href="javascript:void(0)" onclick="showPostDetailModal(${post.id})" class="post-video-link">
                <div class="post-video-placeholder text-center">
                    <video src="${post.videoUrl}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; background: #000; max-height: 400px;"></video>
                </div>
            </a>
            `;
        }

        const likeIcon = post.likedByCurrentUser ? 'fa-solid text-red' : 'fa-regular';
        const likeStyle = post.likedByCurrentUser ? 'color: var(--red-icon);' : '';

        if (!isRejected && !isDeleted) {
            postHtml += `
            <div class="post-actions-bar">
                <button id="like-btn-${post.id}" class="interaction-btn" onclick="toggleLike(${post.id})" style="${likeStyle}">
                    <i id="like-icon-${post.id}" class="${likeIcon} fa-heart"></i> <span id="like-count-${post.id}">Mọi người (${post.likeCount})</span>
                </button>
                <button class="interaction-btn" onclick="toggleComments(${post.id})">
                    <i class="fa-regular fa-comment"></i> <span id="comment-count-${post.id}">Bình luận (${post.commentCount})</span>
                </button>
            </div>

            <!-- COMMENT SECTION -->
            <div id="comments-${post.id}" class="comments-section" style="display: none; padding: 15px; border-top: 1px solid #ced0d4;">
                <div class="comment-input-wrapper" style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <img src="${document.getElementById('header-avatar') && document.getElementById('header-avatar').src ? document.getElementById('header-avatar').src : '/uploads/default-avatar.png'}" alt="Avatar" class="avatar-small" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.src='/uploads/default-avatar.png'">
                    <input type="text" id="comment-input-${post.id}" class="post-input" placeholder="Viết bình luận..." onkeypress="handleCommentKeyPress(event, ${post.id})">
                    <button class="btn btn-primary" onclick="submitComment(${post.id})"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
                <div id="comment-list-${post.id}" class="comment-list" style="display: flex; flex-direction: column; gap: 10px;">
                    <!-- Nơi bình luận hiển thị -->
                </div>
            </div>
            `;
        }

        postHtml += `
        </article>
        `;

        container.innerHTML += postHtml;
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

// ===== API GỌI XÓA VÀ CHỈNH SỬA POST (Đồng bộ với home.js) =====

async function toggleLike(postId) {
    const token = localStorage.getItem('token');

    // UI Cập nhật tức thì (Optimistic UI)
    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const likeIcon = document.getElementById(`like-icon-${postId}`);
    const likeCountSpan = document.getElementById(`like-count-${postId}`);

    if (likeBtn && likeIcon && likeCountSpan) {
        const isLiked = likeIcon.classList.contains('fa-solid');

        let currentCount = 0;
        const countMatch = likeCountSpan.innerText.match(/\d+/);
        if (countMatch) {
            currentCount = parseInt(countMatch[0], 10);
        }

        if (isLiked) {
            // Đổi thành chưa like
            likeIcon.classList.remove('fa-solid', 'text-red');
            likeIcon.classList.add('fa-regular');
            likeBtn.style.color = '';
            likeCountSpan.innerText = `Mọi người (${Math.max(0, currentCount - 1)})`;
        } else {
            // Đổi thành đã like
            likeIcon.classList.remove('fa-regular');
            likeIcon.classList.add('fa-solid', 'text-red');
            likeBtn.style.color = 'var(--red-icon)';
            likeCountSpan.innerText = `Mọi người (${currentCount + 1})`;
            
            // Hiệu ứng tim bay GSAP
            if (window.animateHeartBurst) {
                window.animateHeartBurst(likeIcon);
            }
        }
    }

    try {
        const res = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("Lỗi khi cập nhật like trên server");
        }
    } catch (err) {
        console.error(err);
    }
}

// Logic Xử lý Dropdown (menu 3 chấm)
function toggleDropdown(postId) {
    const dropdown = document.getElementById('dropdown-' + postId);
    dropdown.classList.toggle("show");
}

// Ẩn menu khi click ra ngoài
window.onclick = function (event) {
    if (!event.target.closest('.options-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function deletePost(postId) {
    showConfirmModal('Xóa bài viết', 'Bạn có chắc chắn muốn chuyển bài viết này vào thùng rác?', async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Tải lại để hiển thị trạng thái đã xóa
                if (typeof loadUserPosts === 'function') loadUserPosts();
                else window.location.reload();
            } else {
                const txt = await res.text();
                showToast("Lỗi: " + txt, "error");
            }
        } catch (err) {
            console.error(err);
        }
    });
}

function restorePost(postId) {
    showConfirmModal('Khôi phục bài viết', 'Bạn có chắc chắn muốn khôi phục bài viết này không?', async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/posts/${postId}/restore`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                if (typeof loadUserPosts === 'function') loadUserPosts();
                else window.location.reload();
            } else {
                const txt = await res.text();
                showToast("Lỗi: " + txt, "error");
            }
        } catch (err) {
            console.error(err);
        }
    });
}

async function changeVisibility(postId, level) {
    const token = localStorage.getItem('token');

    // Optimistic UI update: thay đổi icon hiển thị ngay lập tức
    const visibilityIconSpan = document.getElementById(`visibility-icon-${postId}`);
    if (visibilityIconSpan) {
        if (level === 'PUBLIC') visibilityIconSpan.innerHTML = '<i class="fa-solid fa-earth-americas" title="Công khai"></i>';
        else if (level === 'FRIENDS') visibilityIconSpan.innerHTML = '<i class="fa-solid fa-user-group" title="Bạn bè"></i>';
        else visibilityIconSpan.innerHTML = '<i class="fa-solid fa-lock" title="Chỉ mình tôi"></i>';
    }

    const dropdown = document.getElementById(`dropdown-${postId}`);
    if (dropdown) {
        dropdown.classList.remove('show');
    }

    try {
        // level: PUBLIC, FRIENDS, PRIVATE
        const res = await fetch(`/api/posts/${postId}/visibility?level=${level}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const txt = await res.text();
            alert("Lỗi: " + txt);
        }
    } catch (err) {
        console.error(err);
    }
}

async function hidePost(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            document.getElementById('post-' + postId).style.display = 'none';
            showToast('Đã ẩn bài viết vĩnh viễn.', 'info');
        }
    } catch (err) {
        console.error(err);
    }
}

let activeReportPostId = null;
let activeReportCommentId = null;

function reportPost(postId) {
    activeReportPostId = postId;
    activeReportCommentId = null;
    const titleEl = document.getElementById('report-modal-title');
    if (titleEl) titleEl.innerText = "Báo cáo bài viết";
    document.getElementById('report-modal').style.display = 'flex';
    document.getElementById('report-reason').value = '';

    // Bind confirm button
    const confirmBtn = document.getElementById('confirm-report-btn');
    confirmBtn.onclick = () => submitReport();
}

function reportComment(commentId) {
    activeReportCommentId = commentId;
    activeReportPostId = null;
    const titleEl = document.getElementById('report-modal-title');
    if (titleEl) titleEl.innerText = "Báo cáo bình luận";
    document.getElementById('report-modal').style.display = 'flex';
    document.getElementById('report-reason').value = '';

    // Bind confirm button
    const confirmBtn = document.getElementById('confirm-report-btn');
    confirmBtn.onclick = () => submitReport();
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
    activeReportPostId = null;
    activeReportCommentId = null;
}

async function submitReport() {
    const reason = document.getElementById('report-reason').value.trim();
    const categoryEl = document.getElementById('report-category');
    const category = categoryEl ? categoryEl.value : 'OTHER';
    if (!reason) {
        showToast('Vui lòng nhập lý do báo cáo.', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        let endpoint = '';
        if (activeReportPostId) {
            endpoint = `/api/posts/${activeReportPostId}/report`;
        } else if (activeReportCommentId) {
            endpoint = `/api/posts/comments/${activeReportCommentId}/report`;
        } else {
            return;
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason, category: category, reportTarget: typeof activeReportTarget !== 'undefined' ? activeReportTarget : 'SYSTEM' })
        });

        if (res.ok) {
            if (activeReportPostId) {
                const postEl = document.getElementById('post-' + activeReportPostId);
                if (postEl) postEl.style.display = 'none';
            } else if (activeReportCommentId) {
                const commentEl = document.getElementById('comment-' + activeReportCommentId);
                if (commentEl) commentEl.style.display = 'none';
            }
            closeReportModal();
            showToast('Cảm ơn bạn! Báo cáo đã được gửi.', 'success');
        } else {
            const txt = await res.text();
            showToast(txt, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi khi gửi báo cáo.', 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.innerText = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ======================= CHỨC NĂNG BÌNH LUẬN =======================

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        fetchComments(postId);
    } else {
        commentsSection.style.display = 'none';
    }
}

async function fetchComments(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const comments = await res.json();

        const listDiv = document.getElementById(`comment-list-${postId}`);
        listDiv.innerHTML = '';

        if (comments.length === 0) {
            listDiv.innerHTML = '<span style="color: #65676b; font-size: 13px;">Chưa có bình luận nào. Hãy là người đầu tiên!</span>';
            return;
        }

        listDiv.innerHTML = comments.map(c => renderProfileCommentItem(c, postId)).join('');
    } catch (err) {
        console.error("Lỗi lấy comment:", err);
    }
}

function renderProfileCommentItem(c, postId) {
    const timeStr = timeSince(c.createdAt);
    const isMine = c.isMine || c.mine || false;
    const createdAtDate = new Date(c.createdAt);
    const now = new Date();
    const diffMinutes = (now - createdAtDate) / (1000 * 60);

    let actionsHtml = `
        <div class="comment-actions" style="margin-left: 45px; font-size: 11px; display: flex; gap: 12px; margin-top: 2px; align-items: center;">
            <span style="color: #65676b;">${timeStr}${c.edited ? ' (đã chỉnh sửa)' : ''}</span>
            ${isMine && diffMinutes < 30 ? `<span onclick="startEditComment(${postId}, ${c.id}, '${c.content ? c.content.replace(/'/g, "\\'") : ''}')" style="color: #65676b; cursor: pointer; font-weight: 600;">Sửa</span>` : ''}
            ${isMine ? `<span onclick="deleteComment(${postId}, ${c.id})" style="color: #65676b; cursor: pointer; font-weight: 600;">Xóa</span>` : ''}
            ${!isMine ? `<span onclick="reportComment(${c.id})" style="color: #65676b; cursor: pointer; font-weight: 600;" title="Báo cáo bình luận"><i class="fa-regular fa-flag"></i></span>` : ''}
        </div>
    `;

    return `
        <div style="margin-bottom: 10px;" id="comment-container-${c.id}">
            <div class="comment" style="display: flex; gap: 8px;">
                <a href="/html/profile.html?userId=${c.authorId}">
                    <img src="${c.authorAvatar || '/uploads/default-avatar.png'}" class="avatar-small" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.src='/uploads/default-avatar.png'">
                </a>
                <div class="comment-bubble" style="background: var(--comment-bg); padding: 8px 12px; border-radius: 18px; max-width: 80%;">
                    <strong style="font-size: 13px;"><a href="/html/profile.html?userId=${c.authorId}" style="text-decoration:none; color:inherit;">${c.authorName}</a></strong>
                    <div id="comment-content-${c.id}" style="font-size: 14px; margin-top: 2px; white-space: pre-wrap;">${escapeHtml(c.content || '')}</div>
                </div>
            </div>
            ${actionsHtml}
        </div>
    `;
}

function handleCommentKeyPress(event, postId) {
    if (event.key === 'Enter') {
        submitComment(postId);
    }
}

async function submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    const token = localStorage.getItem('token');

    // Optimistic UI update: cộng số bình luận
    const commentCountSpan = document.getElementById(`comment-count-${postId}`);
    if (commentCountSpan) {
        const countMatch = commentCountSpan.innerText.match(/\d+/);
        let currentCount = countMatch ? parseInt(countMatch[0], 10) : 0;
        commentCountSpan.innerText = `Bình luận (${currentCount + 1})`;
    }

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
            const newComment = await res.json();
            input.value = '';

            const listDiv = document.getElementById(`comment-list-${postId}`);
            if (listDiv) {
                if (listDiv.querySelector('span')) {
                    listDiv.innerHTML = '';
                }

                const commentWrapper = document.createElement('div');
                commentWrapper.className = 'comment-item-fade-in';
                commentWrapper.innerHTML = renderProfileCommentItem(newComment, postId);
                listDiv.appendChild(commentWrapper);

                commentWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            const errorMsg = await res.text();
            alert(errorMsg || 'Lỗi gửi bình luận');
        }
    } catch (err) {
        console.error(err);
    }
}

window.startEditComment = function (postId, commentId, currentContent) {
    const contentDiv = document.getElementById(`comment-content-${commentId}`);
    const originalHtml = contentDiv.innerHTML;

    contentDiv.innerHTML = `
        <div style="margin-top: 5px;">
            <textarea id="edit-input-${commentId}" style="width: 100%; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main); border-radius: 8px; padding: 5px; outline: none; font-size: 14px; font-family: inherit;">${currentContent}</textarea>
            <div style="display: flex; gap: 5px; margin-top: 5px; justify-content: flex-end;">
                <button onclick="cancelEditComment(${commentId}, \`${originalHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" style="background: #e4e6eb; border: none; padding: 3px 8px; border-radius: 5px; font-size: 12px; cursor: pointer;">Hủy</button>
                <button onclick="saveEditComment(${postId}, ${commentId})" style="background: var(--primary-color); color: white; border: none; padding: 3px 8px; border-radius: 5px; font-size: 12px; cursor: pointer;">Lưu</button>
            </div>
        </div>
    `;
};

window.cancelEditComment = function (commentId, originalHtml) {
    const contentDiv = document.getElementById(`comment-content-${commentId}`);
    contentDiv.innerHTML = originalHtml;
};

window.saveEditComment = async function (postId, commentId) {
    const newContent = document.getElementById(`edit-input-${commentId}`).value.trim();
    if (!newContent) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: newContent })
        });
        if (res.ok) {
            fetchComments(postId);
        } else {
            const data = await res.json();
            alert(data.message || 'Lỗi khi cập nhật bình luận');
        }
    } catch (err) {
        console.error(err);
    }
};

window.deleteComment = async function (postId, commentId) {
    const confirmMessage = 'Bạn có chắc chắn muốn xóa bình luận này?';
    const action = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/posts/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Optimistic UI update: giảm số bình luận
                const commentCountSpan = document.getElementById(`comment-count-${postId}`);
                if (commentCountSpan) {
                    const countMatch = commentCountSpan.innerText.match(/\d+/);
                    let currentCount = countMatch ? parseInt(countMatch[0], 10) : 0;
                    if (currentCount > 0) {
                        commentCountSpan.innerText = `Bình luận (${currentCount - 1})`;
                    }
                }
                fetchComments(postId);
            } else {
                const data = await res.json();
                alert(data.message || 'Lỗi khi xóa bình luận');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (typeof showConfirmModal === 'function') {
        showConfirmModal('Xóa bình luận', confirmMessage, action);
    } else {
        if (confirm(confirmMessage)) {
            action();
        }
    }
};

// === FRIENDSHIP START ===
function sendFriendRequest(id) {
    const token = localStorage.getItem('token');
    const container = document.getElementById('friendship-actions');
    const btn = container ? container.querySelector('button') : null;
    if (btn) btn.classList.add('btn-loading');

    fetch(`/api/friends/request/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
        if (btn) btn.classList.remove('btn-loading');
        if (res.ok) {
            if (container) {
                container.innerHTML = `<button class="btn btn-secondary pop-active" onclick="removeFriend(${id})"><i class="fa-solid fa-user-clock"></i> Đã gửi lời mời</button>`;
                const newBtn = container.querySelector('button');
                newBtn.addEventListener('animationend', () => newBtn.classList.remove('pop-active'), { once: true });
            }
            showToast("Đã gửi lời mời kết bạn", "success");
        } else {
            const txt = await res.text();
            showToast(txt || "Lỗi gửi yêu cầu", "error");
        }
    })
    .catch(err => {
        if (btn) btn.classList.remove('btn-loading');
        console.error(err);
    });
}

function acceptFriendRequest(id) {
    const token = localStorage.getItem('token');
    const container = document.getElementById('friendship-actions');
    const btn = container ? container.querySelector('button') : null;
    if (btn) btn.classList.add('btn-loading');

    fetch(`/api/friends/accept/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
        if (btn) btn.classList.remove('btn-loading');
        if (res.ok) {
            if (container) {
                container.innerHTML = `<button class="btn btn-secondary pop-active" onclick="removeFriend(${id})"><i class="fa-solid fa-user-group"></i> Bạn bè</button>`;
                const newBtn = container.querySelector('button');
                newBtn.addEventListener('animationend', () => newBtn.classList.remove('pop-active'), { once: true });
            }
            showToast("Đã chấp nhận kết bạn", "success");
        } else {
            const txt = await res.text();
            showToast(txt || "Lỗi chấp nhận yêu cầu", "error");
        }
    })
    .catch(err => {
        if (btn) btn.classList.remove('btn-loading');
        console.error(err);
    });
}

function removeFriend(id) {
    showConfirmModal('Xác nhận thao tác', 'Bạn có chắc chắn muốn thực hiện thao tác này?', () => {
        const token = localStorage.getItem('token');
        const container = document.getElementById('friendship-actions');
        const btn = container ? container.querySelector('button') : null;
        if (btn) btn.classList.add('btn-loading');

        fetch(`/api/friends/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async res => {
            if (btn) btn.classList.remove('btn-loading');
            if (res.ok) {
                if (container) {
                    container.innerHTML = `<button class="btn btn-primary pop-active" onclick="sendFriendRequest(${id})"><i class="fa-solid fa-user-plus"></i> Thêm bạn bè</button>`;
                    const newBtn = container.querySelector('button');
                    newBtn.addEventListener('animationend', () => newBtn.classList.remove('pop-active'), { once: true });
                }
                showToast("Đã hủy kết bạn/yêu cầu", "info");
            } else {
                const txt = await res.text();
                showToast(txt || "Lỗi thao tác", "error");
            }
        })
        .catch(err => {
            if (btn) btn.classList.remove('btn-loading');
            console.error(err);
        });
    });
}
// === FRIENDSHIP END ===

// === CHỈNH SỬA TRANG CÁ NHÂN ===
let currentProfileData = null;

const originalFillProfileData = fillProfileData;
fillProfileData = function (user, isCurrentUser) {
    if (isCurrentUser) currentProfileData = user;

    if (user.cover) {
        document.getElementById('profile-cover').src = user.cover;
    }

    originalFillProfileData(user, isCurrentUser);
};

function openEditProfileModal() {
    if (!currentProfileData) return;
    document.getElementById('edit-fullname').value = currentProfileData.fullName || '';
    document.getElementById('edit-bio').value = currentProfileData.bio || '';
    document.getElementById('edit-relationship').value = currentProfileData.relationshipStatus || 'Độc thân';
    document.getElementById('edit-phone').value = currentProfileData.phoneNumber || '';

    if (currentProfileData.dateOfBirth) {
        let dob = new Date(currentProfileData.dateOfBirth);
        let yyyy = dob.getFullYear();
        let mm = String(dob.getMonth() + 1).padStart(2, '0');
        let dd = String(dob.getDate()).padStart(2, '0');
        document.getElementById('edit-dob').value = `${yyyy}-${mm}-${dd}`;
    }

    document.getElementById('edit-gender').value = currentProfileData.gender || 'Nam';

    document.getElementById('edit-profile-modal').style.display = 'flex';
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').style.display = 'none';
}

async function saveProfileChanges() {
    const token = localStorage.getItem('token');

    const req = {
        fullName: document.getElementById('edit-fullname').value.trim(),
        bio: document.getElementById('edit-bio').value.trim(),
        relationshipStatus: document.getElementById('edit-relationship').value,
        phoneNumber: document.getElementById('edit-phone').value.trim(),
        dateOfBirth: document.getElementById('edit-dob').value,
        gender: document.getElementById('edit-gender').value
    };

    try {
        const res = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req)
        });

        if (res.ok) {
            alert('Cập nhật thông tin thành công!');
            location.reload();
        } else {
            const err = await res.text();
            alert('Lỗi cập nhật: ' + err);
        }
    } catch (e) {
        console.error(e);
        alert('Đã xảy ra lỗi!');
    }
}

let cropper;
let currentCropType = null;
let currentCropFile = null;

function uploadImage(type, ev) {
    const file = ev.target.files[0];
    if (!file) return;

    currentCropType = type;
    currentCropFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('cropper-image').src = e.target.result;
        document.getElementById('cropper-modal').style.display = 'flex';
        document.getElementById('cropper-title').textContent = type === 'cover' ? "Căn chỉnh ảnh bìa" : "Căn chỉnh ảnh đại diện";

        if (cropper) {
            cropper.destroy();
        }

        const aspectRatio = type === 'cover' ? 1095 / 350 : 1;

        cropper = new Cropper(document.getElementById('cropper-image'), {
            aspectRatio: aspectRatio,
            viewMode: 1, // Restrict the crop box to not exceed the size of the canvas
            autoCropArea: 1,
            dragMode: 'move', // Allow moving the image itself
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: false, // For cover photo style, we move the image inside the box usually, but viewMode 1 handles it
            cropBoxResizable: false, // Fix the aspect ratio strictly
        });
    };
    reader.readAsDataURL(file);
    ev.target.value = ''; // Reset input to allow re-uploading the same file
}

function closeCropperModal() {
    document.getElementById('cropper-modal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    currentCropType = null;
    currentCropFile = null;
}

async function saveCroppedImage() {
    if (!cropper || !currentCropType) return;

    const btn = document.getElementById('cropper-btn-save');
    const originalText = btn.textContent;
    btn.textContent = "Đang xử lý...";
    btn.disabled = true;

    // Get the cropped image data
    cropper.getCroppedCanvas({
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    }).toBlob(async (blob) => {
        if (!blob) {
            alert('Có lỗi xảy ra khi cắt ảnh');
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        const formData = new FormData();
        // Give it the original file's name and append timestamp
        const ext = currentCropFile.name.split('.').pop();
        formData.append('file', blob, `cropped-${Date.now()}.${ext}`);

        try {
            const token = localStorage.getItem('token');
            const uploadRes = await fetch('/api/upload/image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!uploadRes.ok) {
                const text = await uploadRes.text(); alert('Lỗi khi tải ảnh lên: ' + text);
                return;
            }

            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.imageUrl;

            // Update user profile
            const updateRes = await fetch(`/api/users/profile/${currentCropType}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [currentCropType]: imageUrl })
            });

            if (updateRes.ok) {
                closeCropperModal();
                location.reload();
            } else {
                alert(`Lỗi cập nhật ${currentCropType}`);
            }
        } catch (e) {
            console.error(e);
            alert('Đã xảy ra lỗi tải ảnh.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

window.uploadImage = uploadImage;
window.closeCropperModal = closeCropperModal;
window.saveCroppedImage = saveCroppedImage;

// Alias cho post-creation.js
window.fetchPosts = function () {
    fetchMyPosts();
};

// Hàm thêm bài viết mới vào đầu feed (để post-creation.js gọi)
window.prependCreatedPostToFeed = function (post) {
    const container = document.getElementById('profile-posts-container');
    if (!container || !post) return false;

    // Chỉ hiển thị bài mới nếu đang ở trang cá nhân của CHÍNH MÌNH 
    // Hoặc nếu không có targetUserId (nghĩa là trang của mình)
    if (targetUserId && targetUserId !== currentUserId) {
        // Đang xem profile người khác, không nên tự chèn bài mình vừa đăng vào đây 
        // trừ khi logic app cho phép. Thông thường là không.
        return false;
    }

    // Nếu đang có thông báo "Đang tải" hoặc "Chưa có bài viết", xóa đi
    if (container.innerHTML.includes('Chưa có bài viết') || container.innerHTML.includes('Đang tải')) {
        container.innerHTML = '';
    }

    let visibilityIcon = '';
    if (post.visibility === 'PUBLIC') visibilityIcon = '<i class="fa-solid fa-earth-americas" style="margin-left: 5px; font-size: 11px;"></i>';
    else if (post.visibility === 'FRIENDS') visibilityIcon = '<i class="fa-solid fa-user-group" style="margin-left: 5px; font-size: 10px;"></i>';
    else visibilityIcon = '<i class="fa-solid fa-lock" style="margin-left: 5px; font-size: 11px;"></i>';

    const isMine = true; // Bài mới tạo chắc chắn là của mình

    let authorAvatar = post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=5e6ad2&color=fff`;
    let authorHtml = `<a href="/html/profile.html" style="text-decoration:none; color:inherit; font-weight:600;">${post.authorName}</a>`;
    if (post.communityName && post.communityId) {
        authorHtml += `
            <i class="fa-solid fa-caret-right" style="margin: 0 6px; color: var(--text-muted); font-size: 13px;"></i>
            <a href="/html/community.html?id=${post.communityId}" style="text-decoration:none; color:var(--primary-color); font-weight: 600;">${post.communityName}</a>
        `;
    }

    let postHtml = `
    <article class="card post" id="post-${post.id}">
        <div class="post-header">
            <a href="/html/profile.html">
                <img src="${authorAvatar}" alt="Avatar" class="avatar-medium" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=5e6ad2&color=fff'">
            </a>
            <div class="post-meta">
                <h4 class="post-author">${authorHtml}</h4>
                <span class="post-time">Vừa xong <span id="visibility-icon-${post.id}">${visibilityIcon}</span></span>
            </div>
        </div>
        
        <div class="post-options">
            <button class="options-btn" onclick="toggleDropdown(${post.id})">
                <i class="fa-solid fa-ellipsis"></i>
            </button>
            <div id="dropdown-${post.id}" class="dropdown-content">
                <a href="javascript:void(0)" onclick="changeVisibility(${post.id}, 'PUBLIC')"><i class="fa-solid fa-earth-americas"></i> Công khai</a>
                <a href="javascript:void(0)" onclick="changeVisibility(${post.id}, 'FRIENDS')"><i class="fa-solid fa-user-group"></i> Chỉ bạn bè</a>
                <a href="javascript:void(0)" onclick="changeVisibility(${post.id}, 'PRIVATE')"><i class="fa-solid fa-lock"></i> Chỉ mình tôi</a>
                <div style="height: 1px; background: #e4e6eb; margin: 4px 0;"></div>
                <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon);"><i class="fa-regular fa-trash-can"></i> Xóa bài viết</a>
            </div>
        </div>

        <div class="post-content">
            <p>${escapeHtml(post.content || '')}</p>
        </div>
    `;

    if (post.imageUrl) {
        postHtml += `
        <div class="post-image-placeholder text-center">
            <img src="${post.imageUrl}" alt="Post image" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
        </div>
        `;
    }

    if (post.videoUrl) {
        postHtml += `
        <div class="post-video-placeholder text-center">
            <video src="${post.videoUrl}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; background: #000; max-height: 400px;" controls></video>
        </div>
        `;
    }

    postHtml += `
        <div class="post-actions-bar">
            <button id="like-btn-${post.id}" class="interaction-btn" onclick="toggleLike(${post.id})">
                <i id="like-icon-${post.id}" class="fa-regular fa-heart"></i> <span id="like-count-${post.id}">Mọi người (0)</span>
            </button>
            <button class="interaction-btn" onclick="toggleComments(${post.id})">
                <i class="fa-regular fa-comment"></i> <span id="comment-count-${post.id}">Bình luận (0)</span>
            </button>
        </div>
        <div id="comments-${post.id}" class="comments-section" style="display: none; padding: 15px; border-top: 1px solid #ced0d4;">
            <div class="comment-input-wrapper" style="display: flex; gap: 10px; margin-bottom: 15px;">
                <img src="${document.getElementById('header-avatar') ? document.getElementById('header-avatar').src : 'https://ui-avatars.com/api/?name=User&background=5e6ad2&color=fff'}" alt="Avatar" class="avatar-small" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=User&background=5e6ad2&color=fff'">
                <input type="text" id="comment-input-${post.id}" class="post-input" placeholder="Viết bình luận..." onkeypress="handleCommentKeyPress(event, ${post.id})">
                <button class="btn btn-primary" onclick="submitComment(${post.id})"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
            <div id="comment-list-${post.id}" class="comment-list"></div>
        </div>
    </article>
    `;

    container.insertAdjacentHTML('afterbegin', postHtml);
    return true;
};

window.openAppealModal = function (postId) {
    const titleEl = document.getElementById('report-modal-title');
    if (titleEl) titleEl.innerText = "Kháng nghị gỡ bài viết";
    
    const categoryEl = document.getElementById('report-category');
    if (categoryEl) {
        let appealOpt = categoryEl.querySelector('option[value="APPEAL"]');
        if (!appealOpt) {
            appealOpt = document.createElement('option');
            appealOpt.value = 'APPEAL';
            appealOpt.innerText = 'Kháng nghị';
            categoryEl.appendChild(appealOpt);
        }
        categoryEl.value = 'APPEAL';
        categoryEl.style.display = 'none';
    }

    const descEl = document.querySelector('#report-modal .modal-body p');
    if (descEl) {
        descEl.innerText = "Tại sao bạn cho rằng bài viết của mình không vi phạm tiêu chuẩn cộng đồng?";
    }

    document.getElementById('report-modal').style.display = 'flex';
    document.getElementById('report-reason').value = '';
    document.getElementById('report-reason').placeholder = 'Nhập lý do kháng nghị chi tiết...';

    const confirmBtn = document.getElementById('confirm-report-btn');
    if (confirmBtn) {
        confirmBtn.innerText = "Gửi kháng nghị";
        confirmBtn.onclick = () => submitAppeal(postId);
    }
};

const originalCloseReportModal = window.closeReportModal;
window.closeReportModal = function () {
    if (typeof originalCloseReportModal === 'function') {
        originalCloseReportModal();
    } else {
        document.getElementById('report-modal').style.display = 'none';
    }
    
    const titleEl = document.getElementById('report-modal-title');
    if (titleEl) titleEl.innerText = "Báo cáo bài viết";
    const categoryEl = document.getElementById('report-category');
    if (categoryEl) {
        categoryEl.style.display = 'block';
        categoryEl.value = 'OTHER';
    }
    const descEl = document.querySelector('#report-modal .modal-body p');
    if (descEl) {
        descEl.innerText = "Tại sao bạn muốn báo cáo nội dung này?";
    }
    const confirmBtn = document.getElementById('confirm-report-btn');
    if (confirmBtn) {
        confirmBtn.innerText = "Gửi báo cáo";
    }
    const reasonEl = document.getElementById('report-reason');
    if (reasonEl) {
        reasonEl.placeholder = 'Nhập lý do chi tiết...';
    }
};

async function submitAppeal(postId) {
    const reason = document.getElementById('report-reason').value.trim();
    if (!reason) {
        showToast('Vui lòng nhập lý do kháng nghị.', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/appeal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason })
        });

        if (res.ok) {
            closeReportModal();
            showToast('Kháng nghị của bạn đã được gửi thành công.', 'success');
            // Update UI if we are in post.html detail view
            const appealBtn = document.getElementById('appeal-post-btn');
            if (appealBtn) {
                appealBtn.outerHTML = '<span style="color: #65676b; margin-left: 12px; font-weight: 600; font-size: 12px;">(Đã gửi kháng nghị)</span>';
            }
        } else {
            const txt = await res.text();
            showToast(txt, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi khi gửi kháng nghị.', 'error');
    }
}

let activeReportTarget = 'SYSTEM';

window.reportPostToTarget = function(postId, target) {
    activeReportPostId = postId;
    activeReportCommentId = null;
    activeReportTarget = target || 'SYSTEM';
    
    const titleEl = document.getElementById('report-modal-title');
    if (titleEl) {
        if (target === 'COMMUNITY') {
            titleEl.innerText = "Báo cáo với chủ nhóm";
        } else {
            titleEl.innerText = "Báo cáo với quản trị riêng";
        }
    }
    document.getElementById('report-modal').style.display = 'flex';
    document.getElementById('report-reason').value = '';

    // Bind confirm button
    const confirmBtn = document.getElementById('confirm-report-btn');
    if (confirmBtn) {
        confirmBtn.onclick = () => submitReport();
    }
};

window.joinCommunityFromFeed = async function(event, communityId, btn) {
    if (event) event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/communities/${communityId}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Tham gia cộng đồng thành công!', 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 3px;"></i>Đã tham gia';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
                btn.disabled = true;
                btn.onclick = null;
            }
        } else {
            const errText = await res.text();
            showToast(errText || 'Lỗi khi tham gia cộng đồng.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối mạng.', 'error');
    }
};

window.toggleBookmark = async function(postId) {
    const token = localStorage.getItem('token');
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
};

window.addFriendFromFeed = async function(event, userId, btn) {
    if (event) event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/friends/request/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Đã gửi lời mời kết bạn!', 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 3px;"></i>Đã gửi';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
                btn.disabled = true;
                btn.onclick = null;
            }
        } else {
            const errText = await res.text();
            showToast(errText || 'Lỗi khi gửi lời mời kết bạn.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối mạng.', 'error');
    }
};
