document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    fetchUserProfile(token);
    loadData();
    fetchSidebarSuggestions(token);
});

// Fetch User Profile and Populate Sidebar
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
            
            let avatarUrl = data.avatar;
            if (!avatarUrl && data.fullName) {
                avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=5e6ad2&color=fff`;
            }

            document.querySelectorAll('#header-avatar, .avatar-large, .avatar-small, #modal-avatar').forEach(img => {
                img.src = avatarUrl;
            });

            // Admin/Moderator Menu
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
        console.error("Error fetching profile", err);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.nav-links-friends div').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');

    document.querySelectorAll('.friend-section').forEach(el => el.style.display = 'none');
    document.getElementById('section-' + tab).style.display = 'block';
}

async function loadData() {
    if (!window.currentUser) {
        setTimeout(loadData, 100);
        return;
    }
    const token = localStorage.getItem('token');
    
    // 1. Suggestions
    try {
        const res = await fetch('/api/friends/suggestions', { headers: { 'Authorization': `Bearer ${token}` } });
        const suggestions = await res.json();
        renderList('suggestions-list', suggestions, 'suggestions');
    } catch(e) {}

    // 2. Requests
    try {
        const res = await fetch('/api/friends/requests', { headers: { 'Authorization': `Bearer ${token}` } });
        const requests = await res.json();
        renderList('requests-list', requests, 'requests');
    } catch(e) {}

    // 3. Friends
    try {
        const res = await fetch('/api/friends', { headers: { 'Authorization': `Bearer ${token}` } });
        const friends = await res.json();
        renderList('my-friends-list', friends, 'friends');
    } catch(e) {}

    // 4. Communities
    try {
        const [discoverRes, myRes] = await Promise.all([
            fetch('/api/communities/search?q=', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/communities/my', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (discoverRes.ok && myRes.ok) {
            const communities = await discoverRes.json();
            const myCommunities = await myRes.json();
            window.cachedCommunities = communities;
            window.cachedMyCommunities = myCommunities;
            renderCommunitiesList(communities);
        }
    } catch(e) {}
}

function renderList(elementId, list, type) {
    const el = document.getElementById(elementId);
    if (!list || list.length === 0) {
        let msg = "Không có người dùng hợp lệ.";
        if (type === 'suggestions') msg = "Bạn đã kết bạn với tất cả mọi người trên mạng lưới này!";
        else if (type === 'requests') msg = "Bạn Không có lời mời kết bạn nào đang chờ.";
        else if (type === 'friends') msg = "Danh sách bạn bè của bạn đang trống.";
        
        el.innerHTML = `<div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #65676B; font-size: 16px;">${msg}</div>`;
        return;
    }

    el.innerHTML = '';
    list.forEach(u => {
        let buttons = '';
        
        let avatarUrl = u.avatar;
        if (!avatarUrl || avatarUrl.trim() === '') {
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=5e6ad2&color=fff`;
        }

        if (type === 'suggestions') {
            buttons = `
                <button id="friend-btn-${u.id}" class="friend-btn btn-add" style="margin-bottom: 5px;" onclick="actionFriend(${u.id}, 'request')"><i class="fa-solid fa-user-plus" style="margin-right: 5px;"></i> Thêm bạn bè</button>
                <button class="friend-btn btn-secondary" onclick="openChatBox(${u.id}, '${u.fullName}', '${avatarUrl}')"><i class="fa-regular fa-comment-dots" style="margin-right: 5px;"></i> Nhắn tin</button>
            `;
        } else if(type === 'requests') {
            buttons = `
                <button class="friend-btn btn-confirm" style="margin-bottom: 5px;" onclick="actionFriend(${u.id}, 'accept')"><i class="fa-solid fa-user-check" style="margin-right: 5px;"></i> Chấp nhận</button>
                <button class="friend-btn btn-secondary" style="margin-bottom: 5px;" onclick="openChatBox(${u.id}, '${u.fullName}', '${avatarUrl}')"><i class="fa-regular fa-comment-dots" style="margin-right: 5px;"></i> Nhắn tin</button>
                <button class="friend-btn btn-delete" onclick="actionFriend(${u.id}, 'delete')"><i class="fa-solid fa-xmark" style="margin-right: 5px;"></i> Xóa</button>
            `;
        } else if(type === 'friends') {
            buttons = `
                <button class="friend-btn btn-secondary" style="margin-bottom: 5px;" onclick="openChatBox(${u.id}, '${u.fullName}', '${avatarUrl}')"><i class="fa-regular fa-comment-dots" style="margin-right: 5px;"></i> Nhắn tin</button>
                <button class="friend-btn btn-delete" onclick="actionFriend(${u.id}, 'delete')"><i class="fa-solid fa-user-xmark" style="margin-right: 5px;"></i> Hủy kết bạn</button>
            `;
        }

        el.innerHTML += `
            <div class="friend-card">
                <a href="/html/profile.html?userId=${u.id}">
                    <img src="${avatarUrl}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=5e6ad2&color=fff'">
                </a>
                <div class="friend-card-content">
                    <div class="friend-card-name"><a href="/html/profile.html?userId=${u.id}" style="text-decoration:none; color:inherit;">${u.fullName}</a></div>
                    <div>${buttons}</div>
                </div>
            </div>
        `;
    });
}

window.actionFriend = async function(id, action) {
    const token = localStorage.getItem('token');
    
    const executeFetch = async (url, method) => {
        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const btn = document.getElementById(`friend-btn-${id}`);
                if (btn) {
                    if (action === 'request') {
                        btn.innerHTML = '<i class="fa-solid fa-user-minus" style="margin-right: 5px;"></i> Hủy lời mời';
                        btn.classList.remove('btn-add');
                        btn.classList.add('btn-delete');
                        btn.onclick = () => actionFriend(id, 'cancel');
                    } else if (action === 'cancel') {
                        btn.innerHTML = '<i class="fa-solid fa-user-plus" style="margin-right: 5px;"></i> Thêm bạn bè';
                        btn.classList.remove('btn-delete');
                        btn.classList.add('btn-add');
                        btn.onclick = () => actionFriend(id, 'request');
                    }
                } else {
                    loadData(); // Tự động reload lại bảng cho các tab khác
                }
                
                if (typeof loadChatSidebar === 'function') {
                    loadChatSidebar();
                }
            } else {
                const err = await res.text();
                showToast(err, 'error');
            }
        } catch(e) {
            console.error(e);
        }
    };

    let url = `/api/friends`;
    let method = 'POST';
    
    if (action === 'request') url += `/request/${id}`;
    else if (action === 'accept') url += `/accept/${id}`;
    else if (action === 'delete' || action === 'cancel') {
        url += `/${id}`;
        method = 'DELETE';
        if (action === 'delete') {
            showConfirmModal('Xác nhận hủy kết bạn', 'Bạn có chắc chắn muốn thực hiện thay đổi này?', () => {
                executeFetch(url, method);
            });
            return;
        }
    }
    executeFetch(url, method);
}

// ======================= SIDEBAR SUGGESTIONS =======================
async function fetchSidebarSuggestions(token) {
    const container = document.getElementById('sidebar-suggestions');
    if (!container) return;

    try {
        const res = await fetch('/api/friends/suggestions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const suggestions = await res.json();
            renderSidebarSuggestions(suggestions.slice(0, 5)); // Show top 5
        }
    } catch (err) {
        console.error("Lỗi lấy gợi ý sidebar:", err);
    }
}

function renderSidebarSuggestions(users) {
    const container = document.getElementById('sidebar-suggestions');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">Không có gợi ý mới</div>';
        return;
    }

    container.innerHTML = users.map(user => {
        const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=5e6ad2&color=fff`;
        return `
            <div class="suggestion-item" id="suggestion-item-sidebar-${user.id}">
                <a href="/html/profile.html?userId=${user.id}">
                    <img src="${avatarUrl}" alt="Avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=5e6ad2&color=fff'">
                </a>
                <div class="suggestion-info">
                    <a href="/html/profile.html?userId=${user.id}" class="suggestion-name">${user.fullName}</a>
                    <span class="suggestion-mutual">Gợi ý cho bạn</span>
                </div>
                <button class="add-friend-sidebar-btn" onclick="addFriendFromSidebar(${user.id})">Thêm</button>
            </div>
        `;
    }).join('');
}

window.addFriendFromSidebar = async function(userId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/friends/request/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const item = document.getElementById(`suggestion-item-sidebar-${userId}`);
            if (item) {
                const btn = item.querySelector('button');
                btn.innerText = 'Hủy';
                btn.classList.add('cancel-btn');
                btn.onclick = () => cancelRequestFromSidebar(userId);
            }
        }
    } catch (err) {
        console.error("Lỗi gửi lời mời kết bạn:", err);
    }
};

window.cancelRequestFromSidebar = async function(userId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/friends/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const item = document.getElementById(`suggestion-item-sidebar-${userId}`);
            if (item) {
                const btn = item.querySelector('button');
                btn.innerText = 'Thêm';
                btn.classList.remove('cancel-btn');
                btn.onclick = () => addFriendFromSidebar(userId);
            }
        }
    } catch (err) {
        console.error("Lỗi hủy lời mời:", err);
    }
};

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

// ======================= COMMUNITIES LOGIC =======================
function renderCommunitiesList(communities) {
    const listBody = document.getElementById('communities-list');
    if (!listBody) return;

    if (!communities || communities.length === 0) {
        listBody.innerHTML = '<div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #65676B; font-size: 16px;">Không tìm thấy cộng đồng nào.</div>';
        return;
    }

    listBody.innerHTML = communities.map(c => {
        const isPrivate = c.isPrivate || c.privacyStatus === 'PRIVATE';
        const privacyIcon = isPrivate ? '<i class="fa-solid fa-lock" style="color: #ffba08;"></i>' : '<i class="fa-solid fa-globe" style="color: #00d1b2;"></i>';
        
        let buttonHtml = '';
        if (window.currentUser && c.creatorId === window.currentUser.id) {
            buttonHtml = `<button class="friend-btn btn-secondary" style="margin-top: auto; border-radius: 8px;" onclick="location.href='/html/community.html?id=${c.id}'"><i class="fa-solid fa-gear" style="margin-right: 5px;"></i> Quản lý</button>`;
        } else {
            const isJoined = window.cachedMyCommunities && window.cachedMyCommunities.find(my => my.id === c.id);
            if (isJoined) {
                buttonHtml = `<button class="friend-btn btn-secondary" style="margin-top: auto; border-radius: 8px;" onclick="location.href='/html/community.html?id=${c.id}'"><i class="fa-solid fa-right-to-bracket" style="margin-right: 5px;"></i> Truy cập</button>`;
            } else {
                buttonHtml = `<button class="friend-btn btn-add" style="margin-top: auto; border-radius: 8px;" onclick="joinCommunity(${c.id}, event)"><i class="fa-solid fa-right-to-bracket" style="margin-right: 5px;"></i> Tham gia</button>`;
            }
        }

        let avatarHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 20px;"><i class="fa-solid fa-users"></i></div>`;
        if (c.avatarUrl) {
            avatarHtml = `<img src="${c.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
        }

        let coverStyle = c.coverUrl ? `background-image: url('${c.coverUrl}'); background-size: cover; background-position: center;` : 'background: var(--bg-main);';

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

function searchCommunities(keyword) {
    keyword = keyword.toLowerCase();
    const filtered = (window.cachedCommunities || []).filter(c => 
        (c.name && c.name.toLowerCase().includes(keyword)) || 
        (c.description && c.description.toLowerCase().includes(keyword))
    );
    renderCommunitiesList(filtered);
}

function openCreateCommunityModal() {
    document.getElementById('create-community-modal').style.display = 'flex';
}

function closeCreateCommunityModal() {
    document.getElementById('create-community-modal').style.display = 'none';
    document.getElementById('new-community-name').value = '';
    document.getElementById('new-community-desc').value = '';
    document.getElementById('new-community-privacy').value = 'PUBLIC';
}

async function submitCreateCommunity() {
    const name = document.getElementById('new-community-name').value.trim();
    const desc = document.getElementById('new-community-desc').value.trim();
    const privacy = document.getElementById('new-community-privacy').value;

    if (!name) {
        showToast("Vui lòng nhập tên cộng đồng", "error");
        return;
    }

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
                requireApproval: privacy === 'PRIVATE'
            })
        });

        if (res.ok) {
            showToast("Tạo cộng đồng thành công!", "success");
            closeCreateCommunityModal();
            loadData(); // Tải lại danh sách
        } else {
            const err = await res.text();
            showToast(err || "Lỗi khi tạo cộng đồng", "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
        console.error(e);
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
            loadData();
        } else {
            const err = await res.text();
            showToast(err || "Không thể tham gia cộng đồng", "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
}

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
