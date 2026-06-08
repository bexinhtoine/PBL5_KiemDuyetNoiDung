document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    fetchUserProfile(token);
    loadCommunityData();
    fetchSidebarSuggestions(token);
});

async function fetchUserProfile(token) {
    try {
        const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            window.currentUser = data;
            
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = data.fullName || 'Người dùng';
            });
            
            let avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=5e6ad2&color=fff`;

            document.querySelectorAll('#header-avatar, .avatar-large, .avatar-small, #modal-avatar').forEach(img => {
                img.src = avatarUrl;
            });

            if (data.role === 'ADMIN' || data.role === 'MODERATOR') {
                const adminContainer = document.getElementById('admin-menu-container');
                if (adminContainer) {
                    adminContainer.innerHTML = `
                        <a href="/html/admin.html" id="admin-menu-item" class="menu-item admin-menu-item">
                            <i class="fa-solid ${data.role === 'ADMIN' ? 'fa-shield-halved' : 'fa-user-shield'}"></i>
                            <span>${data.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Kiểm duyệt'}</span>
                        </a>
                    `;
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function switchCommunityTab(tab) {
    document.querySelectorAll('.nav-links-friends div').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');

    document.querySelectorAll('.friend-section').forEach(el => el.style.display = 'none');
    document.getElementById('section-' + tab).style.display = 'block';
}

async function loadCommunityData() {
    const token = localStorage.getItem('token');
    if (!window.currentUser) {
        // Đợi user profile load xong
        setTimeout(loadCommunityData, 100);
        return;
    }

    try {
        const [discoverRes, myRes] = await Promise.all([
            fetch('/api/communities/search?q=', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/communities/my', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (discoverRes.ok && myRes.ok) {
            const allCommunities = await discoverRes.json();
            const myCommunities = await myRes.json();

            // My communities = communities in myRes where creatorId != myUserId
            const joinedList = myCommunities.filter(c => c.creatorId !== window.currentUser.id);
            // Managed communities = communities in myRes where creatorId == myUserId
            const managedList = myCommunities.filter(c => c.creatorId === window.currentUser.id);

            // Discover list = allCommunities except the ones user has already joined/created
            const discoverList = allCommunities.filter(c => !myCommunities.some(my => my.id === c.id));

            window.cachedDiscover = discoverList;
            window.cachedMy = myCommunities;

            renderCommunitiesList('discover-list', discoverList, 'discover');
            renderCommunitiesList('my-list', joinedList, 'my');
            renderCommunitiesList('managed-list', managedList, 'managed');
        }
    } catch(e) {
        console.error("Lỗi tải cộng đồng", e);
    }
}

function renderCommunitiesList(containerId, list, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #65676B; font-size: 16px;">Không tìm thấy cộng đồng nào.</div>';
        return;
    }

    container.innerHTML = list.map(c => {
        const isPrivate = c.isPrivate || c.privacyStatus === 'PRIVATE';
        const privacyIcon = isPrivate ? '<i class="fa-solid fa-lock" style="color: #ffba08;"></i>' : '<i class="fa-solid fa-globe" style="color: #00d1b2;"></i>';
        
        let avatarHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 20px;"><i class="fa-solid fa-users"></i></div>`;
        if (c.avatarUrl) {
            avatarHtml = `<img src="${c.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
        }

        let coverStyle = c.coverUrl ? `background-image: url('${c.coverUrl}'); background-size: cover; background-position: center;` : 'background: var(--bg-main);';

        let buttonHtml = '';
        if (window.currentUser && c.creatorId === window.currentUser.id) {
            buttonHtml = `<button class="friend-btn btn-secondary" style="margin-top: auto; border-radius: 8px;" onclick="location.href='/html/community.html?id=${c.id}'"><i class="fa-solid fa-gear" style="margin-right: 5px;"></i> Quản lý</button>`;
        } else if (c.membershipStatus === 'ACTIVE') {
            buttonHtml = `<button class="friend-btn btn-secondary" style="margin-top: auto; border-radius: 8px;" onclick="location.href='/html/community.html?id=${c.id}'"><i class="fa-solid fa-right-to-bracket" style="margin-right: 5px;"></i> Truy cập</button>`;
        } else if (c.membershipStatus === 'PENDING') {
            buttonHtml = `<button class="friend-btn btn-secondary" style="margin-top: auto; border-radius: 8px; color: var(--red-icon); border-color: rgba(228, 30, 30, 0.2);" onclick="cancelJoinRequest(${c.id}, event)"><i class="fa-solid fa-xmark" style="margin-right: 5px;"></i> Hủy yêu cầu</button>`;
        } else {
            buttonHtml = `<button class="friend-btn btn-add" style="margin-top: auto; border-radius: 8px;" onclick="joinCommunity(${c.id}, event)"><i class="fa-solid fa-right-to-bracket" style="margin-right: 5px;"></i> Tham gia</button>`;
        }

        return `
            <div class="friend-card" style="align-items: flex-start; text-align: left; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;" onclick="location.href='/html/community.html?id=${c.id}'">
                <div style="width: 100%; height: 80px; ${coverStyle}"></div>
                <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; width: 100%; box-sizing: border-box; position: relative; margin-top: -30px;">
                    <div style="display: flex; gap: 12px; width: 100%; margin-bottom: 12px; align-items: flex-end;">
                        <div style="width: 60px; height: 60px; border-radius: 12px; background: var(--card-bg); border: 2px solid var(--card-bg); flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            ${avatarHtml}
                        </div>
                        <div style="overflow: hidden; padding-bottom: 5px;">
                            <div style="font-weight: 700; font-size: 16px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                                ${escapeHtml(c.name)} ${privacyIcon}
                            </div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                                ${c.memberCount || 0} thành viên
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(c.description || 'Chưa có mô tả')}
                    </div>
                    <div onclick="event.stopPropagation();">
                        ${buttonHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function searchDiscoverCommunities(keyword) {
    keyword = keyword.toLowerCase();
    const filtered = (window.cachedDiscover || []).filter(c => 
        (c.name && c.name.toLowerCase().includes(keyword)) || 
        (c.description && c.description.toLowerCase().includes(keyword))
    );
    renderCommunitiesList('discover-list', filtered, 'discover');
}

function searchMyCommunities(keyword) {
    keyword = keyword.toLowerCase();
    const joinedList = (window.cachedMy || []).filter(c => c.creatorId !== window.currentUser?.id);
    const filtered = joinedList.filter(c => 
        (c.name && c.name.toLowerCase().includes(keyword)) || 
        (c.description && c.description.toLowerCase().includes(keyword))
    );
    renderCommunitiesList('my-list', filtered, 'my');
}

function searchManagedCommunities(keyword) {
    keyword = keyword.toLowerCase();
    const managedList = (window.cachedMy || []).filter(c => c.creatorId === window.currentUser?.id);
    const filtered = managedList.filter(c => 
        (c.name && c.name.toLowerCase().includes(keyword)) || 
        (c.description && c.description.toLowerCase().includes(keyword))
    );
    renderCommunitiesList('managed-list', filtered, 'managed');
}

function openCreateCommunityModal() {
    document.getElementById('create-community-modal').style.display = 'flex';
}

function closeCreateCommunityModal() {
    document.getElementById('create-community-modal').style.display = 'none';
    document.getElementById('new-community-name').value = '';
    document.getElementById('new-community-desc').value = '';
    document.getElementById('new-community-privacy').value = 'PUBLIC';
    
    // Reset images
    document.getElementById('cover-preview-img').style.display = 'none';
    document.getElementById('cover-preview-img').src = '';
    document.getElementById('cover-placeholder').style.display = 'block';
    document.getElementById('uploaded-cover-url').value = '';
    document.getElementById('cover-upload-input').value = '';

    document.getElementById('avatar-preview-img').style.display = 'none';
    document.getElementById('avatar-preview-img').src = '';
    document.getElementById('avatar-placeholder').style.display = 'block';
    document.getElementById('uploaded-avatar-url').value = '';
    document.getElementById('avatar-upload-input').value = '';
}

async function uploadImageFetch(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (!res.ok) throw new Error("Upload failed");
    return await res.json();
}

async function previewCommunityCover(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const placeholder = document.getElementById('cover-placeholder');
    const img = document.getElementById('cover-preview-img');
    
    placeholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><div style="font-size: 13px; margin-top: 5px;">Đang tải...</div>';
    
    try {
        const data = await uploadImageFetch(file);
        document.getElementById('uploaded-cover-url').value = data.url;
        img.src = data.url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } catch (e) {
        showToast("Lỗi tải ảnh lên", "error");
        placeholder.innerHTML = '<i class="fa-solid fa-camera" style="font-size: 24px; margin-bottom: 5px;"></i><div style="font-size: 13px;">Tải ảnh bìa lên</div>';
    }
}

async function previewCommunityAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const placeholder = document.getElementById('avatar-placeholder');
    const img = document.getElementById('avatar-preview-img');
    
    placeholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i>';
    
    try {
        const data = await uploadImageFetch(file);
        document.getElementById('uploaded-avatar-url').value = data.url;
        img.src = data.url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } catch (e) {
        showToast("Lỗi tải ảnh lên", "error");
        placeholder.innerHTML = '<i class="fa-solid fa-users" style="font-size: 28px;"></i>';
    }
}

async function submitCreateCommunity() {
    const name = document.getElementById('new-community-name').value.trim();
    const desc = document.getElementById('new-community-desc').value.trim();
    const privacy = document.getElementById('new-community-privacy').value;
    const coverUrl = document.getElementById('uploaded-cover-url').value;
    const avatarUrl = document.getElementById('uploaded-avatar-url').value;

    if (!name) {
        showToast("Vui lòng nhập tên cộng đồng", "error");
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-community');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';

    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/communities/create', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: desc,
                isPrivate: privacy === 'PRIVATE',
                requireApproval: document.getElementById('new-community-member-approval').value === 'MANUAL',
                requirePostApproval: document.getElementById('new-community-post-approval').value === 'MANUAL',
                avatarUrl: avatarUrl,
                coverUrl: coverUrl
            })
        });

        if (res.ok) {
            showToast("Tạo cộng đồng thành công!", "success");
            closeCreateCommunityModal();
            loadCommunityData();
        } else {
            const err = await res.text();
            showToast(err || "Lỗi khi tạo cộng đồng", "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
        console.error(e);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Tạo cộng đồng';
    }
}

async function joinCommunity(id, event) {
    if (event) event.stopPropagation();
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${id}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const msg = await res.text();
            showToast(msg, "success");
            loadCommunityData();
        } else {
            const err = await res.text();
            showToast(err || "Không thể tham gia cộng đồng", "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
}
window.joinCommunity = joinCommunity;

async function cancelJoinRequest(id, event) {
    if (event) event.stopPropagation();
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${id}/leave`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const msg = await res.text();
            showToast(msg, "success");
            loadCommunityData();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
}
window.cancelJoinRequest = cancelJoinRequest;

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

// ======================= SIDEBAR SUGGESTIONS =======================
async function fetchSidebarSuggestions(token) {
    const container = document.getElementById('sidebar-suggestions');
    if (!container) return;
    try {
        const res = await fetch('/api/friends/suggestions', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const suggestions = await res.json();
            if (suggestions.length === 0) {
                container.innerHTML = '<div class="empty-state">Không có gợi ý mới</div>';
                return;
            }
            container.innerHTML = suggestions.slice(0, 5).map(user => {
                const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=5e6ad2&color=fff`;
                return `
                    <div class="suggestion-item">
                        <a href="/html/profile.html?userId=${user.id}"><img src="${avatarUrl}" alt="Avatar"></a>
                        <div class="suggestion-info">
                            <a href="/html/profile.html?userId=${user.id}" class="suggestion-name">${user.fullName}</a>
                            <span class="suggestion-mutual">Gợi ý cho bạn</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {}
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
